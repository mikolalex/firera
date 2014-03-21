(function(){
    /* @todo: змінити синтаксис хтмл драйверів, передавати у них лише один селектор, і функції - сеттер і оновлювач)
     * @todo: unbind previous bindings
     * @todo: обгортка до хттп запитів як змінна. Можна зробити запит один раз, можна регулярно(інтервал).
     * можливо, замість frp("a").is(...) писати var a = frp(function(){}, b, c);
     * 
     */
    var $ = window['jQuery'] || window['$'] || false;
    var drivers = {
	cell: {
	    
	},
	visibility: {
	    setter: function(val, selector){
		if(val){
		    $(selector).show();
		} else {
		    $(selector).hide();
		}
	    }
	},
	value: {
	    def: '',
	    selfRefresh: true,
	    setter: function(val, selector){
		var $el = $(selector);
		switch($el.prop('type')){
		    case 'checkbox':
			$el.prop('checked', !!val);
		    break;
		    default:
			$el.val(val);
		    break;
		}
	    },
	    /*getter: function(selector){
		var $el = $(selector);
		switch($el.prop('type')){
		    case 'checkbox':
			return $el.prop('checked');
		    break;
		    default:
			return $el.val();
		    break;
		}
	    },*/
	    startObserving: function(selector){
		var self = this;
		var $el = $(selector);
		var type = $el.prop('type');
		$el.bind("keyup, change", function(){
		    switch(type){
			case 'checkbox':
			    self.set($(this).prop('checked'));
			break;
			default:
			    self.set($(this).val());
			break;
		    }
		})
	    }
	},
	mouseover: {
	    def: false,
	    selfRefresh: true,
	    /*getter: function(selector){
		return $(selector).is(":hover");
	    },*/
	    startObserving: function(selector){
		var self = this;
		$(selector).mouseenter(function(){
		    self.set(true);	
		}).mouseleave(function(){
		    self.set(false);
		})
	    }
	},
	selectedItem: {
	    def: false,
	    selfRefresh: true,
	    setter: function(val, selector){
		var list = $(selector);
		list.children().removeClass('selected');
		list.children("[data-value=" + val + "]").addClass("selected");
	    },
	    /*getter: function(selector){
		return $(selector + " > .selected").attr('data-value');
	    },*/
	    startObserving: function(selector){
		if(!$(selector).length){
		    error("No element found by selector " + selector);
		}
		var self = this;
		var items = $(selector).children();
		items.click(function(){
		    items.removeClass('selected');
		    $(this).addClass('selected');
		    var val = $(this).attr('data-value');
		    if(!val) val = $.trim($(this).html());
		    self.set(val);
		})
	    }
	},
	html: {
	    setter: function(val, selector){
		var el = $(selector);
		if(!el.length){
		    error('Empty selector: ' + selector);
		    return;
		}
		el.html(val);
	    }
	}
    }
    
    var error = function(str){
	console.log("Firera error: " + str);
    }
    
    var changeble = {
	__init: function(){
	    this.changers = [];
	},
	change: function(prev_val, new_val){
	    for(var i = 0;i< this.changers.length;i++){
		this.changers[i].call(this, prev_val, new_val);
	    }
	},
	onChange: function(func){
	    this.changers.push(func);
	}
    }
    
    var pour = function(obj, mixin){
	if(mixin.__init){
	    mixin.__init.call(obj);
	}
	for(var i in mixin){
	    if(i == '__init') continue;
	    if(obj[i]){
		error('conflict, property ' + i + ' already exists in mixin!');
	    }
	    if(mixin[i] instanceof Function){
		obj[i] = mixin[i];
	    }
	}
    }
    
    var get_map_func = function(func){
	var res;
	if(func && !(func instanceof Function)){// its object property , like "name" or "!completed"
	    if(func.indexOf("!") === 0){
		res = (function(field){
		    return function(){
			return !this[field];
		    }
		}(func.replace("!", "")))
	    } else {
		res = (function(field){
		    return function(){
			return !!this[field];
		    }
		}(func))
	    }
	} else {
	    res = func;
	}
	return res;
    }
    
    var Cell = function(selector, scope, vars, host){
	if(!host){
	    error('no host in cell ' + selector);
	}
	this.host = host;
	this.inited = false;
	this.modifiers = [];
	this.selector = selector;
	this.scope = scope;
	this.observables = {};
	this.vars = vars;
	this.changers = [];
	this.observers = [];
	vars[selector] = this;
	if(selector.indexOf("|") !== -1){// HTML selector
	    // this is a dom selector
	    var parts = selector.split("|");
	    this.jquerySelector = parts[0];
	    this.setScopedSelector(this.scope, this.jquerySelector);
	    //this.scopedSelector = this.scope + " " + this.jquerySelector;
	    if(this.scope && !$(this.scopedSelector).length){
		error('Selected element "' + this.scopedSelector + '" not found');
	    }
	    if(!drivers[parts[1]]){
		error('Unknown driver: ' + parts[1]);
	    } else {
		this.type = parts[1];
	    }
	    this.driver = drivers[this.type];
	    if(drivers[this.type].selfRefresh){
		this.val = drivers[this.type].def;
		this.rebind = function(){
		    drivers[this.type].startObserving.call(this, this.scopedSelector);
		    //this.compute();
		    return this;
		}
		this.scope && this.rebind();
	    } else {
		var self = this;
		this.rebind = function(){		    
		    if(self.driver.setter && self.scope){
			self.driver.setter(self.val, self.scopedSelector);
		    }
		}
	    }
	} else { // this is just custom abstract varname
	    this.type = 'cell';
	}
	this.driver = drivers[this.type];
    }
    
    Cell.prototype.setScopedSelector = function(a, b){
	if(b == 'root'){
	    this.scopedSelector = a;
	} else {
	    this.scopedSelector = a + " " + b;
	}
    }
    
    Cell.prototype.getName = function(){
	return this.selector;
    }
    
    Cell.prototype.addObservable = function(cellname){
	this.observables[cellname] = 0;
    }
    
    Cell.prototype.invalidateObservers = function(name){
	if(this.getName() != name) this.observables[name]++;
	for(var i=0; i<this.observers.length;i++){
	    this.observers[i].invalidateObservers(name);
	}
    }
    
    Cell.prototype.addObserver = function(cell){
	this.observers.push(cell);
    }
    
    Cell.prototype.get = function(){
	return this.val;
    }
    
    Cell.prototype.rebind = function(){
	/* empty for default cell, will be overwritten for self-refreshing cells */
    }
    
    Cell.prototype.then = function(func){
	this.modifiers.push(func);
    }
    
    Cell.prototype.map = function(map){
	this.then(function(val){
	    if(map[val] !== undefined) return map[val];
	    return val;
	})
    }
    
    Cell.prototype.set = function(val){
	var old_val = this.val;
	var new_val = val;
	for(var i = 0; i< this.modifiers.length;i++){
	    new_val = this.modifiers[i](new_val);
	}
	this.val = new_val;
	this.change(old_val, new_val);
	//this.driver.setter && this.driver.setter(val, this.scopedSelector);
	this.invalidateObservers(this.getName());
	this.updateObservers(this.getName());
	this.host.change();
	return this;
    }
    
    Cell.prototype.updateObservers = function(name){
	if(this.observers){
	    for(var i=0; i<this.observers.length;i++){
		this.observers[i].compute(name);
	    }
	} 
    }
    
    Cell.prototype.setScope = function(scope){
	this.scope = scope;
	this.setScopedSelector(this.scope, this.jquerySelector);
	return this;
    }
    
    Cell.prototype.just = function(val){
	this.val = val;// just a value
	return this;
    }
    
    Cell.prototype.isNot = function(cell){
	return this.is(function(flag){ return !flag;}, cell);
    }
    
    Cell.prototype.load = function(url){
	var self = this;
	$.get(url, function(data){
	    self.set(data);
	})
	this.set('');
	return this;
    }
    
    Cell.prototype.ifAll = function(){
	var args = Array.prototype.slice.call(arguments);
	args.unshift(function(){
	    var args = Array.prototype.slice.call(arguments);
	    var res = true;
	    for(var i = 0; i< args.length;i++){
		res = res && args[i];
	    }
	    return res;
	});
	return this.is.apply(this, args);
    }
    Cell.prototype.template = function(){
	//console.log('args are', arguments);
	var vars = Array.prototype.slice.call(arguments);
	vars.unshift(function(){
	    var obj = {};
	    for(var i = 1;i<arguments.length;i++){
		obj[vars[i+1]] = arguments[i];
	    }
	    //console.log('html is', 'obj is', obj, 'template is', arguments[0]);
	    var html = make_template(obj, arguments[0]);
	    return html;
	});
	//console.log('vars are', vars);
	return this.is.apply(this, vars);
    }
    Cell.prototype.ifAny = function(){
	var args = Array.prototype.slice.call(arguments);
	args.unshift(function(){
	    var args = Array.prototype.slice.call(arguments);
	    var res = false;
	    for(var i = 0; i< args.length;i++){
		res = res || args[i];
	    }
	    return res;
	});
	return this.is.apply(this, args);
    }
    
    Cell.prototype.are = function(arr){
	List.call(this, arr, this.scope, this.host, this.getName());
	for(var i in List.prototype){
	    this[i] = List.prototype[i];
	}
	return this;	
    }
    
    Cell.prototype.counts = function(pred, arr){
	var listname = arr ? arr : pred;
	var func = arr ? pred : false;
	if(!this.vars[listname]){
	    error('Wrong parameter provided(' + listname +') for counts()');
	}
	var list = this.vars[listname];
	list.addObserver(this);
	func = get_map_func(func);
	this.compute = function(){
	    var old_val = this.val;
	    var new_val = list.count(func);
	    for(var i = 0; i< this.modifiers.length;i++){
		new_val = this.modifiers[i](new_val);
	    }
	    this.val = new_val;
	    if(this.scope && this.driver.setter){
		this.driver.setter(this.val, this.scopedSelector);
	    }
	    this.change(old_val, this.val);
	    this.updateObservers(listname);
	    return this;
	}	
	return this.compute();
    }
        
    Cell.prototype.is = function(f){
	var formula = f;
	if(this.inited){
	    error('Cell already inited!'); console.dir(this);
	    return;
	} else {
	    this.inited = true;
	}
	
	if(formula instanceof Array){// creating new Firera hash
	    //console.log('array is ', formula);
	    this.self = Firera.list(formula, arguments[1]/* scope */);
	    return this;	    	    
	}
	if(formula instanceof Object && !(formula instanceof Function)){// creating new Firera hash
	    this.self = Firera.hash(formula, arguments[1]/* scope */);
	    return this;	
	}
	
	var args = Array.prototype.slice.call(arguments, 1);
	if(!args.length){// is just an another cell
	    args[0] = formula;
	    formula = function(val){ return val;};
	}	
	for(var i= 0;i<args.length;i++){
	    if(!(args[i] instanceof Cell)){
		if(this.vars[args[i]]){
		    args[i] = this.vars[args[i]];
		} else {
		    args[i] = new Cell(args[i], this.scope, this.vars, this);
		}
	    }

	    if(!(Object.keys(args[i].observables).length)){
		//console.log('we add observable ' + args[i].getName() +' for ' + this.getName());
		this.addObservable(args[i].getName());
	    } else {
		for(var x in args[i].observables){
		    //console.log('we add observable ' + args[i].observables[x] +' for ' + this.getName());
		    this.addObservable(x);
		}
	    }
	    args[i].addObserver(this);
	}
	this.formula = formula;
	this.compute = function(name){
	    if(name){
		if(!this.observables[name]){
		    error('observable not found: ' + name + ' in cell ' + this.getName());
		} else {
		    //console.log('observable FOUND: ' + name + ' in cell ' + this.getName() + ', value is ' + this.observables[name]);
		    this.observables[name]--;
		    if(this.observables[name] > 0) {
			//console.log('skipping computing for ' + this.getName());
			return;
		    } else {
			//console.log('now ' + name + " is 0 in " + this.getName() + ", so, computing!");
		    }
		}
	    }
	    var args1 = [];
	    for(var i=0; i<args.length;i++){
		args1.push(args[i].get());
	    }
	    var old_val = this.val;
	    var new_val = formula.apply(this, args1);
	    for(var i = 0; i< this.modifiers.length;i++){
		new_val = this.modifiers[i](new_val);
	    }
	    this.val = new_val;
	    if(this.driver && this.driver.setter && this.scope){
		this.driver.setter(this.val, this.scopedSelector);
	    }
	    this.change(old_val, this.val);
	    this.updateObservers(name);
	    return this;
	}
	if(args.length) this.compute();
	return this;
    }
    
    pour(Cell.prototype, changeble);
    
    var collect_values = function(obj){
	var res = {};
	for(var i in obj){
	    if(i.indexOf("|") != -1) continue;
	    res[i] = obj[i].get();
	}
	return res;
    }
    var collect_names = function(obj){
	var res = [];
	for(var i in obj){
	    if(i.indexOf("|") != -1) continue;
	    res.push(i);
	}
	return res;
    }
    
    var make_template = function(obj, templ){
	for(var i in obj){
	    templ = templ.replace("{" + i + "}", obj[i]);
	}
	return templ;
    }
    
    var Event = function(selector, scope, vars, host){
	vars[selector] = this;
	this.host = host;
	this.vars = vars;// not needed?..
	this.scope = scope;
	this.selector = selector.split("|")[0];
	this.scopedSelector = this.scope + " " + this.selector;
	this.event = selector.split("|")[1];
	this.handlers = [];
	if(this.scope){
	    this.rebind();
	}
    }
    
    Event.prototype.rebind = function(){
	var self = this;
	var val = null;
	$(this.scopedSelector).bind(this.event, function(){
	    for(var i = 0;i<self.handlers.length;i++){
		var sup = self.host.host || false;
		val = self.handlers[i](self.host, val, sup);
	    }
	})
	//console.log('we bind ' + this.event + ' to ' + this.scopedSelector);
	//console.dir(this);
	return this;
    }
    
    Event.prototype.setScope = function(scope){
	this.scope = scope;
	this.scopedSelector = this.scope + " " + this.selector;
	return this;
    }
    
    Event.prototype.removes = function(pred, list){
	var arr = list ? list : pred;
	var func = list ? pred : false;
	var mass = this.host(arr);
	this.handlers.push(function(){
	    mass.remove(func);
	})	
	return this;
    }
    
    Event.prototype.sets = function(cell, val){
	var cell2 = this.host(cell);
	this.handlers.push(function(){
	    cell2.set(val);
	})		
	return this;
    }
    
    var types = {
	cell: Cell,
	event: Event
    }
    
    var events = ['click'];
    
    var create_cell_or_event = function(selector, scope, vars, self){
	var type = (selector.indexOf("|") === -1 || events.indexOf(selector.split("|")[1]) === -1) ? 'cell' : 'event';
	return new types[type](selector, scope, vars, self);
    }
    
   
    
    var Firera = {
	hash: function(a, b, host){// a, b = hash, context | a(object) = hash | a(string) = context | 
	    var vars = [];
	    var init_hash, context;
	    if(!b){
		if(a instanceof Object) init_hash = a;
		else context = a;
	    } else {
		init_hash = a;
		context = b;
	    }
	    var scope = context || false;
	    
	    var self = function(selector){
		if(selector instanceof Object){
		    return init_with_hash(selector);
		}
		return vars[selector] || create_cell_or_event(selector, scope, vars, self);
	    }
	    //////////////////////////////////////////
	    var init_with_hash = function(selector){
		for(var i in selector){
		    var cell = vars[i] ? vars[i] : create_cell_or_event(i, scope, vars, self);
		    if(selector[i] instanceof Array){
			if(selector[i][0] instanceof Function){
			    cell['is'].apply(cell, selector[i]);
			} else {
			    cell[selector[i][0]].apply(cell, selector[i].slice(1));
			}
		    } else {
			cell.just(selector[i]);
		    }
		}
		return true;
	    }
	    //////////////////////////////////////////		
	    init_hash && init_with_hash(init_hash);

	    if(host){
		self.host = host;
	    }
	    self.applyTo = function(selector, template){
		self.setScope(selector);
		if(template){
		    if(vars["root|html"]){// already inited
			vars["root|html"].rebind();
		    } else {
			var names = collect_names(vars);
			//console.log('names are', names);
			names.unshift(template);
			self("root|html").template.apply(self("root|html"), names);
			self("root|html").onChange(function(){
				self.rebind();
			});
			//$(selector).append(make_template(values, template));
		    }
		}
	    }
	    
	    self.rebind = function(){
		for(var i in vars){
		    vars[i].rebind();
		}
	    }
	    
	    self.remove = function(){
		$(scope).remove();
	    }
	    
	    self.emit = function(){
		return collect_values(vars);
	    }

	    self.setScope = function(scope2){
		scope = scope2;
		for(var i in vars){
		    vars[i].setScope(scope2).rebind();
		}
		return this;
	    }
	    
	    pour(self, changeble);
	    
	    self.onChange(function(){
		if(this.host){
		    this.host.change();
		}
	    })

	    return self;
	},
	list: function(a, b){/* */

	    var init_list = [], context = false;
	    if(!b){
		if(a instanceof Array) init_list = a;
		else context = a;
	    } else {
		init_list = a;
		context = b;
	    }
	    var self = new List(init_list, context);
	    return self;
	},
	config: function(obj){
	    if(obj.dom_lib) $ = obj.dom_lib;
	    if(obj.custom_drivers && (obj.custom_drivers instanceof Object)){
		for(var i in obj.custom_drivers){
		    drivers[i] = obj.custom_drivers[i];
		}
	    }
	}
    }
    
    var List = function(init_list, context, host){
	this.host = host;
	this.list = [];
	this.map_funcs = [];
	this.reduce_funcs = [];
	this.count_funcs = [];
	this._counter = 0;
	for(var i = 0;i<init_list.length;i++){
	    var hash = window[lib_var_name].hash(init_list[i], false, this);
	    this.list[this._counter] = hash;
	    this._counter++;
	}
	var self = this;
	this.onChange(function(){
	    self.updateObservers();
	})

    };
    
    List.prototype.push = function(obj){
	this.list[this._counter] = window[lib_var_name].hash(obj, false, this);
	this._counter++;
	this.rebind();
	this.change();
    }
    
    List.prototype.map = function(func){
	
    }
    
    List.prototype.reduce = function(func){
	
    }
    
    List.prototype.remove = function(func){
	if(!func){
	    // Hm... remove all or nothing?
	    return;
	}
	var f = get_map_func(func);
	for(var i in this.list){
	    if(f.apply(this.list[i].emit())){
		this.list[i].remove();
		delete this.list[i];
	    }
	}
    }
    
    List.prototype.count = function(func){
	if(!func) return Object.keys(this.list).length;
	var total = 0;
	for(var i in this.list){
	    var obj = this.list[i].emit();
	    if(!!func.apply(obj)) total++;
	}
	return total;
    }
    
    List.prototype.get = function(type/* reduce, count or map */, index){
	return this[type + '_funcs'][index]('ololo');
    }
    	    
    List.prototype.filter = function(){
	
	return this;
    };
    	    
    List.prototype.each = function(){
	return this;
    };
    	    
    List.prototype.setScope = function(scope){
	this.scope = scope;
	return this;
    }

    List.prototype.applyTo = function(selector, template){
	for(var i in this.list){
	    this.list[i].setScope(selector).rebind();
	}
	return this;
    }
    List.prototype.rebind = function(){
	if(this.root_node && this.template){
	    var res = [];
	    for(var i in this.list){
		res.push('<div class="firera-item" data-firera-num="' + i + '"></div>');
	    }
	    $(this.root_node).html(res.join(""));
	    for(var i in this.list){
		var nested_scope = this.scope + " " + this.root_node + " > div[data-firera-num=" + i + "]";
		this.list[i].applyTo(nested_scope, this.host(this.template));
	    }
	}
    }

    List.prototype.renderTo = function(node, template){// actually, mixin
	this.root_node = node;
	this.template = template;
	return this;
    }
	
    var lib_var_name = 'Firera';
    if(window[lib_var_name] !== undefined){
	throw new Exception('Cant assign Firera library, varname already taken: ' + lib_var_name);
    } else {
	window[lib_var_name] = Firera;
    }
})()
