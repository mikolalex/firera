(function(){
    /* @todo: unbind previous bindings
     * var a = frp(function(){}, b, c);
     * @todo: fix pour() to .prototype - common arrays!
     * @todo: refactor for(var i = 0;i< this.changers.length;i++){ to for(var i = 0, changer;changer = this.changers[i];i++){
     * prohibit direct use of |html modifier! Use vars instead!
     */
    var $ = window['jQuery'] || window['$'] || false;

    var existy = function(a){
	return (a !== undefined) && (a !== null);
    }
    
    var drivers = {
	cell: {
	    
	},
	visibility: {
	    setter: function(val, $el){
		if(val){
		    $el.show();
		} else {
		    $el.hide();
		}
	    }
	},
	value: {
	    def: '',
	    selfRefresh: true,
	    setter: function(val, $el){
		switch($el.prop('type')){
		    case 'checkbox':
			$el.prop('checked', !!val);
		    break;
		    default:
			$el.val(val);
		    break;
		}
	    },
	    startObserving: function($el){
		var self = this;
		var type = $el.prop('type');
		//console.log('we bind to ' + selector);
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
	    startObserving: function($el){
		var self = this;
		$el.mouseenter(function(){
		    self.set(true);	
		}).mouseleave(function(){
		    self.set(false);
		})
	    }
	},
	selectedItem: {
	    def: false,
	    selfRefresh: true,
	    setter: function(val, list){
		var new_chosen = list.children("[data-value=" + val + "]");
		if(!new_chosen.length){
		    error("No list selection found: [data-value=" + val + "]");
		}
		list.children().removeClass('selected');
		new_chosen.addClass("selected");
	    },
	    startObserving: function($el){
		if(!$el.length){
		    error("No element found by selector ");
		}
		var self = this;
		var items = $el.children();
		items.each(function(){
		    if(!$(this).attr('data-value')){
			$(this).attr('data-value', $.trim($(this).html()))
		    }
		});
		items.click(function(){
		    items.removeClass('selected');
		    $(this).addClass('selected');
		    var val = $(this).attr('data-value');
		    self.set(val);
		})
	    }
	},
	html: {
	    setter: function(val, el){
		var el = $(selector, scope);
		if(!el.length){
		    error('Empty selector in html');
		    return;
		}
		if(el.html()){
		    //console.dir(self);
		}
		//console.log('we write html to', selector, el.length)
		el.html(val);
	    }
	},
	toggleClass: {
	    setter: function(val, $el, classname){
		if(val){
		    $el.addClass(classname);
		} else {
		    $el.removeClass(classname);
		}
	    }
	}
    }
    
    var error = function(){
	console.log.apply(console, ['ERROR!'].concat(Array.prototype.slice.call(arguments)));
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
    
    var obj_join = function(a, b, overwrite){
	    for(var i in a){
		    if(!b[i] || overwrite) b[i] = a[i];
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
    
    var Cell = function(selector, host){
	if(!host){
	    error('no host in cell ' + selector);
	}
	this.params = [];
	this.host = host;
	this.deps = [];
	this.inited = false;
	this.modifiers = [];
	this.selector = selector;
	this.observables = {};
	this.changers = [];
	this.observers = [];
	this.name = this.getName();
	if(selector.indexOf("|") !== -1){// HTML selector
	    // this is a dom selector
	    var parts = selector.split("|");
	    this.jquerySelector = parts[0];
	    if(parts[1].indexOf("(") !== -1){
		// there are some params
		var m = parts[1].match(/([a-z]*)\((.*)\)/i);
		this.params = m[2].split(",");
		parts[1] = m[1];
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
		    this.HTMLElement = false;// abort link to old element
		    drivers[this.type].startObserving.apply(this, [this.getElement()].concat(this.params));
		    if(this.driver && this.driver.setter && this.getScope()){
			this.driver.setter.apply(this.driver, [this.val, this.getElement()].concat(this.params));
		    }
		    return this;
		}
		this.getScope() && this.rebind('cell constructor');
	    } else {
		var self = this;
		this.rebind = function(source){
		    this.HTMLElement = false;// abort link to old element
		    if(self.driver.setter && self.getScope()){
			self.driver.setter.apply(self.driver, [self.val, self.getElement()].concat(this.params));
		    }
		}
	    }
	} else { // this is just custom abstract varname
	    this.type = 'cell';
	}
	this.driver = drivers[this.type];
    }
    
    Cell.prototype.getName = function(){
	return this.selector;
    }
    
    Cell.prototype.getElement = function(){
	    if(!this.HTMLElement){
		    var selector = this.getSelector();
		    if(selector === 'root' || selector === ''){
			    this.HTMLElement = this.getScope();
		    } else {
			    this.HTMLElement = $(this.getSelector(), this.getScope());
		    }
		   
	    }
	    return this.HTMLElement;
    }
    
    Cell.prototype.getScope = function(){
	return this.host.getScope();
    }
    
    Cell.prototype.getSelector = function(){
	return (this.jquerySelector === 'root' ? '' : this.jquerySelector);
    }
    
    Cell.prototype.remove = function(){
	  for(var i in this.deps){
		  this.deps[i].removeObserver(this);
	  }  
    }
    
    Cell.prototype.addObservable = function(cellname){
	this.observables[cellname] = 0;
    }
    
    Cell.prototype.invalidateObservers = function(name){
	if(this.getName() != name) this.observables[name]++;
	for(var i in this.observers){
	    this.observers[i].invalidateObservers(name);
	}
    }
    
    Cell.prototype.addObserver = function(cell){
	this.observers.push(cell);
    }
    
    Cell.prototype.removeObserver = function(cell){
	for(var i in this.observers){
	    if(this.observers[i] == cell){
		    delete this.observers[i];
	    }
	}
    }
    
    Cell.prototype.get = function(){
	    //console.log('we call get, got', this.val, 'in', this.getName());
	    //console.dir(this.host);
	return this.val;
    }
    
    Cell.prototype.getType = function(){
	return 'cell';
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
	//////////
	if(this.driver && this.driver.setter && this.getScope()){
	    this.driver.setter.apply(this.driver, [this.val, this.getElement()].concat(this.params));
	}
	//////////
	this.change(old_val, new_val);
	this.invalidateObservers(this.getName());
	this.updateObservers(this.getName());
	this.host.change();
	return this;
    }
    
    Cell.prototype.updateObservers = function(name){
	if(this.observers){
	    for(var i in this.observers){
		this.observers[i].compute(name);
	    }
	} 
    }
    
    Cell.prototype.just = function(val){
	this.val = val;// just a value
	return this;
    }
    
    Cell.prototype.isNot = function(cell){
	return this.is(function(flag){ return !flag;}, cell);
    }
    
    Cell.prototype.or = function(){
	return this;
    }
    
    Cell.prototype.orJust = function(){
	return this;
    }
    
    Cell.prototype.ifEqual = function(c1, c2){
	return this.is(function(a, b){ return a == b;}, c1, c2);
    }
    
    Cell.prototype.selectIf = function(c1, c2){
	return this.is(function(a, b){
	    if(b === '*') return true;
	    return a == b;
	}, c1, c2);
    }
    
    Cell.prototype.load = function(url){
	var self = this;
	$.get(url, function(data){
	    self.set(data);
	})
	this.set('');
	return this;
    }
    
    Cell.prototype.if = function(cond, then, otherwise){
	return this.is.call(this, function(flag){
	    return flag ? (existy(then)? then : true) : (existy(otherwise)? otherwise : false);
	}, cond);
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
    Cell.prototype.bindToDOM = function($el){
	this.DOMElement = $el;
	this.updateDOMElement();
	return this;
    }
    
    Cell.prototype.unbindToDOM = function(){
	this.DOMElement = false;
	return this;
    }
    
    Cell.prototype.updateDOMElement = function(){
	this.DOMElement.html(this.get());
    }
    
    Cell.prototype.template = function(){
	//console.log('args are', arguments);
	var vars = Array.prototype.slice.call(arguments);
	vars.unshift(function(){
	    var obj = {};
	    for(var i = 1;i<arguments.length;i++){
		obj[vars[i+1]] = arguments[i];
	    }
	    var html = make_template(obj, arguments[0]);
	    return html;
	});
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
	obj_join(this, arr);
	this.host.setVar(this.getName(), arr);
	if(!arr.setHost) console.log('ups', arr);
	arr.setHost(this.host);
	return this;	
    }
    
    Cell.prototype.counts = function(pred, arr){
	var listname = arr ? arr : pred;
	var func = arr ? pred : false;
	if(!this.host.getVar(listname)){
	    error('Wrong parameter provided(' + listname +') for counts()');
	}
	var list = this.host.getVar(listname);
	list.addObserver(this);
	func = get_map_func(func);
	this.compute = function(){
	    var old_val = this.val;
	    var new_val = list.count(func);
	    for(var i = 0; i< this.modifiers.length;i++){
		new_val = this.modifiers[i](new_val);
	    }
	    this.val = new_val;
	    
	    if(this.DOMElement){
		this.updateDOMElement();
	    }
	    if(this.getScope() && this.driver.setter){
		this.driver.setter(this.val, this.getElement());
	    }
	    this.change(old_val, this.val);
	    this.updateObservers(listname);
	    return this;
	}	
	return this.compute();
    }
    Cell.prototype.force = function(){
	this.compute();
    }
    
    Cell.prototype.compute = function(name){
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
	for(var i=0; i<this.args.length;i++){
	    args1.push(this.args[i].get());
	}
	var old_val = this.val;
	var new_val = this.formula.apply(this, args1);
	for(var i = 0; i< this.modifiers.length;i++){
	    new_val = this.modifiers[i](new_val);
	}
	this.val = new_val;
	if(this.DOMElement){
		this.updateDOMElement();
	}
	if(this.driver && this.driver.setter && this.getScope()){
	    this.driver.setter.apply(this.driver, [this.val, this.getElement()].concat(this.params));
	}
	this.change(old_val, this.val);
	this.updateObservers(name);
	return this;
    }
    
    Cell.prototype.depend = function(cells){
	var arr = (cells instanceof Array)?cells:[cells];
	for(var i=0;i<cells.length;i++){
		this.deps.push(cells[i]);
	    if(!(Object.keys(cells[i].observables).length)){
		this.addObservable(cells[i].getName());
	    } else {
		for(var x in cells[i].observables){
		    this.addObservable(x);
		}
	    }
	    cells[i].addObserver(this);
	}
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
		args[i] = this.host.create_cell_or_event(args[i]);
	    }
	}
	this.args = args;
	this.formula = formula;
	
	this.depend(this.args);
	    
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
    
    var gather_form_values = function(selector, scope, clear){
	var res = {};
	$(selector + " input", scope).each(function(){
	    var val = '';
	    switch($(this).attr('type')){
		case 'checkbox':
		    val = !!$(this).prop('checked');
		break;
		case 'submit':
		    return;
		break;
		case 'text': 
		    val = $(this).val();
		    if(clear){
			$(this).val('');
		    }
		break;
		case 'hidden': 
		    val = $(this).val();
		break;
	    }
	    res[$(this).attr('name')] = val;
	})
	return res;
    }
    
    var custom_event_drivers = {
	submit: function(selector, scope, callback){
	    var submitters = $(selector + " input[type=submit]", scope);
	    if(submitters.length < 1){		
		submitters = $(selector + " .firera-submitter");
	    }
	    if(submitters.length === 1){// ok, binding
		submitters.bind('click', function(){
		    var hash = gather_form_values(selector, scope, true);
		    callback(hash);
		});
	    } else {
		if(submitters.length > 1){
		    error('Multiple submitters found!');
		} else {
		    error('No submitters found! (' + selector + " input[type=submit]" + ")");
		}
	    }
	}
    }
    
    var Event = function(selector, host){
	this.host = host;
	this.selector = selector.split("|")[0];
	this.event = selector.split("|")[1];
	this.handlers = [];
	if(this.scope){
	    this.rebind('event constructor');
	}
    }
    
    Event.prototype.getSelector = function(){
	//console.log('host is', this.host);
	return (this.selector === 'root' ? '' : this.selector);
    }
    
    Event.prototype.getScope = function(){
	return this.host.getScope();
    }
    
    Event.prototype.rebind = function(){
	if(custom_event_drivers[this.event]){
	    custom_event_drivers[this.event](this.getSelector(), this.getScope(), this.process.bind(this));
	} else {
	    if($(this.getSelector(), this.getScope()).length === 0){
		error('Empty selector for binding: ' + this.getSelector());
	    }
	    $(this.getSelector(), this.getScope())
		    .bind(this.event, this.process.bind(this))
	}
	return this;
    }
    
    Event.prototype.process = function(initial_val){
	var val = initial_val || null;
	for(var i = 0;i<this.handlers.length;i++){
	    var sup = this.host.host || false;
	    val = this.handlers[i](this.host, this.host._index, sup, val);
	    if(val === false) {
		break;
	    }
	}
    }
    
    Event.prototype.getType = function(){
	return 'event';
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
    
    Event.prototype.then = function(func){
	this.handlers.push(func);		
	return this;
    }
    
    Event.prototype.pushTo = function(arr){
	this.handlers.push(function(self, _, _, val){
	    self(arr).push(val);
	});
	return this;
    }
    
    Event.prototype.filter = function(func){
	if(!(func instanceof Function)){
	    var field = func.replace("!", "");
	    if(func.indexOf("!") === 0){
		this.handlers.push(function(obj){
		    return obj(field).get() ? false : true;
		})
	    } else {
		this.handlers.push(function(obj){
		    return obj(field).get() ? true : false;
		})
	    }
	} else {
	    error(func + 'not implemented yet');
	}
    }
    
    var types = {
	cell: Cell,
	event: Event
    }
    
    var events = ['click', 'submit'];
    
    
    var get_cell_type = function(cellname){
	!cellname.indexOf && console.log('we are given', cellname);
	var type = (cellname.indexOf("|") === -1 || events.indexOf(cellname.split("|")[1]) === -1) ? 'cell' : 'event';
	return type;
    }
    
    var is_int = function(joe){
	return Number(joe) == joe;
    }
    
    var Firera = {
	hash: function(data, init_hash){
	    
	    var get_context = function(){};
	    
	    var self = function(selector){
		if(selector instanceof Function){
			console.log(selector);
			console.log('Why?!');
		}
		var pars = Array.prototype.slice.call(arguments, 1);
		if(selector instanceof Object && !(selector instanceof Function)){
			console.log('INIT!', selector);
		    return init_with_hash(selector);
		}
		return self.create_cell_or_event(selector, pars);
	    }
	    
	    self.create_cell_or_event = function(selector, params){
		if(self.getVar(selector)) return self.getVar(selector);
		var type = get_cell_type(selector);
		
		var new_cell = new types[type](selector, self, params);
		self.setVar(selector, new_cell);
		return new_cell;
	    }
	    
	    self.vars = [];
	    
	    self.getVar = function(name){
		return self.vars[name] ? self.vars[name] : false;
	    }
	    
	    self.setVar = function(name, val){
		self.vars[name] = val;
	    }
	    
	    self.getAllVars = function(){
		return self.vars;
	    }
	    
	    self.scope = false;
    
	    self.getScope = function(func){
		    return self.rootElement;
	    }
		
	    self.getType = function(){
		return 'hash';
	    }
	    
	    get_context = self.getScope.bind(self);

	    self.setScope = function(scope2){
		self.scope = scope2;
		return self;
	    }
	    //////////////////////////////////////////
	    var init_with_hash = function(selector){
		for(var i in selector){
		    var cell = self.create_cell_or_event(i);
		    var cell_type = cell.getType();
		    switch(cell_type){
			case 'cell':
				if(selector[i] instanceof Array){
				    if(selector[i][0] instanceof Function){
					cell['is'].apply(cell, selector[i]);
				    } else {
					cell[selector[i][0]].apply(cell, selector[i].slice(1));
				    }
				} else {
				    cell.just(selector[i]);
				}
			break;
			case 'event':
				if(selector[i] instanceof Function){
				    cell.then(selector[i]);
				} else {
				    if(selector[i] instanceof Array){
					if(!(selector[i][0] instanceof Array) && !(selector[i][0] instanceof Function)){
					    selector[i][0] = [selector[i][0]];
					}
					for(var j=0;j<selector[i].length;j++){
					    if(selector[i][j] instanceof Function){
						cell.then(selector[i][j]);
					    } else {
						if(selector[i][j] instanceof Array){
						    var func = selector[i][j][0];
						    cell[func].apply(cell, selector[i][j].slice(1));
						} else {
						    error('wrong parameter type for cell creation!');
						}
					    }
					}
				    }
				}
			break;
			case 'list':
				cell.update(selector[i]);
			break;
		    }
		}
		return true;
	    }
	    //////////////////////////////////////////
	    var init_with_data = function(hash){
		for(var i in hash){
			var cell = self.create_cell_or_event(i);
			if(hash[i] instanceof Array){
				for(var j in hash[i]){
					if(!(hash[i][j] instanceof Object)){
						hash[i][j] = {item: hash[i][j]};
					}
				}				
				var list = new window[lib_var_name].list(hash[i], {});
				list.setHost(self);
				cell.are(list);
			} else {
				if(hash[i] instanceof Object){
					// Ready Firera List object
				} else {
					cell.just(hash[i]);
				}
			}
		    
		}
		return true;
	    }
	    
	    self.update = function(hash){
		init_with_hash(hash);
		if(self.getScope()) this.rebind('update');
	    }
	    
	    //////////////////////////////////////////		

	    self.setHost = function(host){
		self.host = host;
	    }
	    
	    self.unbindToDOM = function(){
		var vars = self.getAllVars();
		for(var i in vars) {
			if(vars[i].unbindToDOM) vars[i].unbindToDOM();
		}
	    }
	    
	    self.applyTo = function(selector_or_element){
		if(selector_or_element instanceof Object){// HTMLElement
			this.rootElement = selector_or_element;
		} else {// rare case, only for root objects
			this.rootElement = $(selector_or_element);
		}
		self.unbindToDOM();
		var template = $.trim(self.getScope().html());
		if(!template){
			if(self.getVar('__template')){
				template = self('__template').get();
				self.getScope().html(template);
			}
			if(self.host && self.host && self.host.shared && self.host.shared.getVar('__template')){
				template = self.host.shared('__template').get();
				self.getScope().html(template);
			}
		}
		$("[data-fr]", self.getScope()).each(function(){
			var cell, field = $(this).attr('data-fr');
			if(cell = self.getVar(field)){
				cell.bindToDOM($(this), field);
			}
		})
		self.rebind('applyTo');
	    }
	    
	    self.rebind = function(source){
		var vars = self.getAllVars();
		for(var i in vars){
		    if(i == 'root|html') continue;
		    if(vars[i].applyTo){
			vars[i].applyTo();
		    } else {
			vars[i].rebind(source);
		    }
		}
	    }
	    
	    self.remove = function(){
		self.getScope().remove();
		for(var i in self.vars){
			// unbind each cell
			if(self.vars[i] instanceof Cell){
				self.vars[i].remove();
			}
		}
		return true;
	    }
	    
	    self.get = function(){
		return collect_values(self.getAllVars());
	    }
	    
	    pour(self, changeble);
	    
	    self.onChange(function(){
		if(this.host){
		    this.host.change();
		}
	    })
	    
	    if(data){
		init_with_data(data);
	    } 
	    
	    if(init_hash instanceof Object){
		    self.update(init_hash);
	    }
	    
	    self.getRoute = function(){
		    if(!self.host){
			    return 'root / ';
		    } else {
			    return self.host.getRoute() + self.getName() + ' / ';
		    }
	    }

	    return self;
	},
	list: function(config, data){
	    var self = new List(config, data);
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
    
    var List = function(data, init_hash){
	this.list = [];
	this.each_is_set = false;
	this.each_hash = {};
	this.shared_hash = {};
	this.map_funcs = [];
	this.reduce_funcs = [];
	this.count_funcs = [];
	this._counter = 0;
	this.rootElement = false;
	if(init_hash && init_hash.each){
		this.each_is_set = true;
		this.each_hash = init_hash.each;
	}
	if(init_hash && init_hash.shared){
		this.shared_hash = init_hash.shared;
	}
	for(var i = 0;i<data.length;i++){
	    var hash = new window[lib_var_name].hash(data[i], this.each_hash);
	    hash.setHost(this);
	    this.list[this._counter] = hash;
	    this.list[this._counter]._index = this._counter;
	    this.list[this._counter].getName = function(){ return this._index;};
	    this._counter++;
	}
	this.shared = new Firera.hash(this.shared_hash);
	this.shared.setHost(this);
	var self = this;
	this.onChange(function(){
	    self.updateObservers();
	})
    }
    
	List.prototype.getRoute = function(){
		if(!this.host){
			return 'root / ';
		} else {
			return this.host.getRoute() + this.getName() + ' / ';
		}
	}
	    
	List.prototype.update = function(init_hash){
		if(init_hash.each){
			this.each_is_set = true;
			this.each(init_hash.each)
			obj_join(init_hash.each, this.each_hash, true);
		}
		if(init_hash.shared){
			this.shared.update(init_hash.shared);
		}
	}
    
	List.prototype.setHost = function(host){
	    this.host = host;
	}
	
	List.prototype.getType = function(){
	    return 'list';
	}
    
    List.prototype.getScope = function(func){
	return this.rootElement;
    }
    
    List.prototype.push = function(obj){
	this.list[this._counter] = window[lib_var_name].hash(obj, false, this);
	this.list[this._counter]._index = this._counter;
	this.list[this._counter].setHost(this);
	if(this.each_is_set){
	    this.list[this._counter].update(this.each_hash);
	}
	this.rebind('push', this._counter);
	this._counter++;
	this.change();
    }
    
    List.prototype.map = function(func){
	
    }
    
    List.prototype.reduce = function(func){
	
    }
    
    List.prototype.remove = function(func){
	if(!func && func !== 0){
	    // Hm... remove all or nothing?
	    return;
	}
	if(is_int(func)){
	    this.list[func] && this.list[func].remove() && delete this.list[func];
	    this.change();
	    return;
	}
	var f = get_map_func(func);
	for(var i in this.list){
	    if(f.apply(this.list[i].get())){
		this.list[i].remove();
		delete this.list[i];
	    }
	}
	this.change();
    }
    
    List.prototype.count = function(func){
	if(!func) {
	    return Object.keys(this.list).length;
	}
	var total = 0;
	for(var i in this.list){
	    var obj = this.list[i].get();
	    if(!!func.apply(obj)) total++;
	}
	return total;
    }
    
    List.prototype.get = function(){
	var res = [];
	for(var i in this.list){
	    res.push(this.list[i].get());
	}
	return res;
    }
    	    
    List.prototype.filter = function(){
	
	return this;
    };
    	    
    List.prototype.each = function(hash){
	this.each_is_set = true;
	for(var i in hash){
	    this.each_hash[i] = hash[i];
	}
	for(var i in this.list){
	    this.list[i].update(hash);
	}
	return this;
    };
    
    List.prototype.show = function(cond, val){
	var args = Array.prototype.slice.call(arguments);
	if(cond instanceof Function){
	    args.shift('is');
	}
	this.each({
	    "root|visibility": args
	})
	return this;
    }
    
    List.prototype.bindToDOM = function(htmlelement){
	this.rootElement = htmlelement;
	return this;
    }
    
    List.prototype.unbindToDOM = function(){

    }

    List.prototype.applyTo = function(selector_or_element, start_index, end_index){
	if(selector_or_element){
	    if(selector_or_element instanceof Object){// HTMLElement
		    this.rootElement = selector_or_element;
	    } else {// rare case, only for root objects
		    this.rootElement = $(selector_or_element);
	    }   
	}
	// update template, if not provided previously
	var inline_template = $.trim(this.getScope().html());
	if(!this.shared.getVar('__template') && inline_template){
		this.shared('__template').just(inline_template);
		this.getScope().html('');
	}
	
	for(var i in this.list){
	    if((start_index && i < start_index) || (end_index && i > end_index)) continue;
	    var nested_scope = " > div[data-firera-num=" + i + "]";
	    var nested_element = $(nested_scope, this.getScope());
	    if(nested_element.length === 0){
		this.getScope().append('<div class="firera-item" data-firera-num="' + i + '"></div>');
		nested_element = $(nested_scope, this.getScope());
	    }
	    this.list[i].applyTo(nested_element);
	}
	return this;
    }
    
    List.prototype.rebind = function(msg, start_index, end_index){
	if(this.getScope()){
	    for(var i in this.list){
		if((start_index && i < start_index) || (end_index && i > end_index)) continue;
		var nested_scope = " > div[data-firera-num=" + i + "]";
		var nested_element = $(nested_scope, this.getScope());
		if(nested_element.length === 0){
		    this.getScope().append('<div class="firera-item" data-firera-num="' + i + '"></div>');
		}
		this.list[i].applyTo(nested_element);
	    }
	}
    }
    
    List.prototype.updateDOMElement = function(){
	// Do nothing!
    }
    
    pour(List.prototype, changeble);
	
    var lib_var_name = 'Firera';
    if(window[lib_var_name] !== undefined){
	throw new Exception('Cant assign Firera library, varname already taken: ' + lib_var_name);
    } else {
	window[lib_var_name] = Firera;
    }
})()
