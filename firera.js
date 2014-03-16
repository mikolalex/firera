(function(){
    /*
     * @todo: змінити синтаксис хтмл драйверів, передавати у них лише один селектор, і функції - сеттер і оновлювач)
     * @todo: unbind previous bindings
     * 
     * 
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
	    getter: function(selector){
		var $el = $(selector);
		switch($el.prop('type')){
		    case 'checkbox':
			return $el.prop('checked');
		    break;
		    default:
			return $el.val();
		    break;
		}
	    },
	    startObserving: function(selector){
		var self = this;
		$(selector).bind("keyup, change", function(val){
		    self.val = val;		    
		    self.compute();
		})
	    }
	},
	mouseover: {
	    def: false,
	    selfRefresh: true,
	    getter: function(selector){
		return $(selector).is(":hover");
	    },
	    startObserving: function(selector){
		var self = this;
		$(selector).mouseenter(function(){
		    self.val = true;		    
		    self.compute();
		}).mouseleave(function(){
		    self.val = false;		    
		    self.compute();
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
	    getter: function(selector){
		return $(selector + " > .selected").attr('data-value');
	    },
	    startObserving: function(selector){
		if(!$(selector).length){
		    error("No element found by selector " + selector);
		}
		var self = this;
		var items = $(selector).children();
		items.click(function(){
		    items.removeClass('selected');
		    self.val = $(this).attr('data-value');
		    $(this).addClass('selected');
		    self.compute();
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
    
    var Cell = function(selector, scope, vars){
	this.selector = selector;
	this.scope = scope;
	this.vars = vars;
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
		this.val = drivers[this.type].def;
		this.compute = function(){
		    this.val = drivers[this.type].getter(this.scopedSelector);
		    this.updateObservers();
		    return this;
		}
		this.rebind = function(){
		    //console.log('now the scope is ' + this.scope+', rebinding');
		    drivers[this.type].startObserving.call(this, this.scopedSelector);
		    this.compute();
		    return this;
		}
		this.scope && this.rebind();
		
	    }
	} else { // this is just custom abstract varname
	    this.type = 'cell';
	}
	this.observers = [];
	this.driver = drivers[this.type];
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
    
    Cell.prototype.set = function(val){
	this.val = val;
	this.driver.setter && this.driver.setter(val, this.scopedSelector);
	this.updateObservers();
	return this;
    }
    
    Cell.prototype.updateObservers = function(){
	if(this.observers){
	    for(var i=0; i<this.observers.length;i++){
		this.observers[i].compute();
	    }
	} 
    }
    
    Cell.prototype.setScope = function(scope){
	this.scope = scope;
	this.scopedSelector = this.scope + " " + this.jquerySelector;
	return this;
    }
    
    Cell.prototype.as = function(cell){
	return this.is(function(flag){ return !!flag;}, cell);
    }
    Cell.prototype.notAs = function(cell){
	return this.is(function(flag){ return !flag;}, cell);
    }
    Cell.prototype.ifAll = function(){
	var args = Array.prototype.slice.call(arguments, 0);
	args.unshift(function(){
	    var args = Array.prototype.slice.call(arguments, 0);
	    var res = true;
	    for(var i = 0; i< args.length;i++){
		res = res && args[i];
	    }
	    return res;
	});
	return this.is.apply(this, args);
    }
    Cell.prototype.ifAny = function(){
	var args = Array.prototype.slice.call(arguments, 0);
	args.unshift(function(){
	    var args = Array.prototype.slice.call(arguments, 0);
	    var res = false;
	    for(var i = 0; i< args.length;i++){
		res = res || args[i];
	    }
	    return res;
	});
	return this.is.apply(this, args);
    }
    
    Cell.prototype.is = function(formula){
	var args = Array.prototype.slice.call(arguments, 1);
	if(args.length){
	    for(var i= 0;i<args.length;i++){
		if(!(args[i] instanceof Cell)){
		    if(this.vars[args[i]]){
			args[i] = this.vars[args[i]];
		    } else {
			args[i] = new Cell(args[i], this.scope, this.vars);
		    }
		}
		args[i].addObserver(this);
	    }
	    this.formula = formula;
	} else {
	    this.val = formula;
	}
	this.compute = function(){
	    var args1 = [];
	    for(var i=0; i<args.length;i++){
		args1.push(args[i].get());
	    }
	    this.val = formula.apply(this, args1);
	    if(this.driver.setter){
		this.driver.setter(this.val, this.jquerySelector);
	    }
	    this.updateObservers();
	    return this;
	}
	if(args.length) this.compute();
	return this;
    }
    
    var lib_var_name = 'Firera';
    
    if(window[lib_var_name]){
	throw new Exception('Cant assign library, varname already taken: ' + lib_var_name);
    } else {
	window[lib_var_name] = {
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
			var cell = vars[i] ? vars[i] : new Cell(i, scope, vars);
			if(selector[i] instanceof Array){
			    if(selector[i][0] instanceof Function){
				cell['is'].apply(cell, selector[i]);
			    } else {
				cell[selector[i][0]].apply(cell, selector[i].slice(1));
			    }
			} else {
			    cell.is(selector[i]);
			}
		    }
		    return true;
		}
		//////////////////////////////////////////		
		if(init_hash){
		    init_with_hash(init_hash);
		}
		
		var hash = function(selector){
		    if(selector instanceof Object){
			return init_with_hash(selector);
		    }
		    return vars[selector] || new Cell(selector, scope, vars);
		}
		hash.applyTo = function(selector){
		    for(var i in vars){
			vars[i].setScope(selector).rebind();
		    }
		}
		    
		return hash;
	    },
	    list: function(){/* */
		
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
    }
})()
