(function(){
    /*
     * @todo: змінити синтаксис хтмл драйверів, передавати у них лише один селектор, і функції - сеттер і оновлювач)
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
		$(selector).html(val);
	    }
	}
    }
    
    var error = function(str){
	console.log("Firera error: " + str);
    }
    
    var Cell = function(selector, scope, vars, host){
	this.host = host;
	this.inited = false;
	this.modifiers = [];
	this.selector = selector;
	this.scope = scope;
	this.original = false;
	this.observables = {};
	this.vars = vars;
	this.observers = [];
	vars[selector] = this;
	if(selector.indexOf("|") !== -1){// HTML selector
	    // this is a dom selector
	    var parts = selector.split("|");
	    this.jquerySelector = parts[0];
	    this.scopedSelector = this.scope + " " + this.jquerySelector;
	    if(!$(parts[0], this.scope).length){
		error('Selected element "' + this.scopedSelector + '" not found');
	    }
	    if(!drivers[parts[1]]){
		error('Unknown driver: ' + parts[1]);
	    } else {
		this.type = parts[1];
	    }
	    if(drivers[this.type].selfRefresh){
		this.original = true;
		this.val = drivers[this.type].def;
		this.rebind = function(){
		    drivers[this.type].startObserving.call(this, this.scopedSelector);
		    //this.compute();
		    return this;
		}
		this.scope && this.rebind();
		
	    }
	} else { // this is just custom abstract varname
	    this.type = 'cell';
	}
	this.driver = drivers[this.type];
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
    
    Cell.prototype.onChange = function(prev_val, new_val){
	//console.log(this.getName() + ' changed from ' + prev_val + ' to ' + new_val + '!');
    }
    
    Cell.prototype.rebind = function(){
	/* empty for default cell, will be overwritten for self-refreshing cells */
    }
    
    Cell.prototype.addModifier = function(func){
	this.modifiers.push(func);
    }
    
    Cell.prototype.map = function(map){
	this.addModifier(function(val){
	    if(map[val] !== undefined) return map[val];
	    if(map['*'] !== undefined) return map['*'];
	    return undefined;
	})
    }
    
    Cell.prototype.set = function(val){
	var old_val = this.val;
	var new_val = val;
	for(var i = 0; i< this.modifiers.length;i++){
	    new_val = this.modifiers[i](new_val);
	}
	this.val = new_val;
	this.onChange(old_val, new_val);
	//this.driver.setter && this.driver.setter(val, this.scopedSelector);
	this.invalidateObservers(this.getName());
	this.updateObservers(this.getName());
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
	this.scopedSelector = this.scope + " " + this.jquerySelector;
	return this;
    }
    
    Cell.prototype.just = function(val){
	this.val = val;// just a value
	this.original = true;
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
	var vars = Array.prototype.slice.call(arguments, 0);
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
	List.call(this, arr, this.scope, this.host);
	for(var i in List.prototype){
	    this[i] = List.prototype[i];
	}
	return this;	
    }
        
    Cell.prototype.is = function(f){
	var formula = f;
	if(this.inited){
	    error('Cell already inited!'); 
	    return;
	} else {
	    this.inited = true;
	}
	
	if(formula instanceof Array){// creating new Firera hash
	    console.log('array is ', formula);
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
	    if(this.driver.setter){
		this.driver.setter(this.val, this.jquerySelector);
	    }
	    this.onChange(old_val, this.val);
	    this.updateObservers(name);
	    return this;
	}
	if(args.length) this.compute();
	return this;
    }
    
    
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
    
    var Firera = {
	hash: function(a, b){// a, b = hash, context | a(object) = hash | a(string) = context | 
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
	    //////////////////////////////////////////
	    var init_with_hash = function(selector){
		for(var i in selector){
		    var cell = vars[i] ? vars[i] : new Cell(i, scope, vars, self);
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

	    var self = function(selector){
		if(selector instanceof Object){
		    return init_with_hash(selector);
		}
		return vars[selector] || new Cell(selector, scope, vars, self);
	    }
	    self.applyTo = function(selector, template){
		if(template){
		    var names = collect_names(vars);
		    //console.log('names are', names);
		    names.unshift(template);
		    self(selector + "|html").template.apply(self(selector + "|html"), names);
		    self(selector + "|html").onChange = function(){
			    self.rebind();
		    };
		    //$(selector).append(make_template(values, template));
		}
		self.setScope(selector);
	    }
	    
	    self.rebind = function(){
		for(var i in vars){
		    vars[i].rebind();
		}
	    }

	    self.setScope = function(scope){
		for(var i in vars){
		    vars[i].setScope(scope).rebind();
		}
		return this;
	    }

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
	for(var i = 0;i<init_list.length;i++){
	    this.list.push(window[lib_var_name].hash(init_list[i], context));
	}
    };
    	    
    List.prototype.filter = function(){
	
	return this;
    };
    	    
    List.prototype.each = function(){
	return this;
    };
    	    
    List.prototype.setScope = function(scope){
	this.scope = scope;
	for(var i in this.list){
	    this.list[i].setScope(scope);
	}
	return this;
    }

    List.prototype.applyTo = function(selector, template){
	for(var i in this.list){
	    this.list[i].setScope(selector).rebind();
	}
	return this;
    }
    List.prototype.rebind = function(){
	for(var i in this.list){
	    this.list[i].rebind();
	}
    }

    List.prototype.renderTo = function(node, template){// actually, mixin
	this.setScope(node);
	var res = [];
	console.dir(this.list);
	for(var i = 0;i<this.list.length;i++){
	    res.push('<div class="firera-item"></div>');
	}
	$(node).html(res.join(""));
	for(i = 0;i<this.list.length;i++){
	    //console.log('list i ' + i + ' is', this.list[i]);
	    //console.log('host is ' + this.host);
	    this.list[i].applyTo(this.scope + " > div:nth-child(" + (i + 1) + ")", this.host(template));
	}
	console.dir(this.list);
	return this;
    }
	
    var lib_var_name = 'Firera';
    if(window[lib_var_name] !== undefined){
	throw new Exception('Cant assign Firera library, varname already taken: ' + lib_var_name);
    } else {
	window[lib_var_name] = Firera;
    }
})()
