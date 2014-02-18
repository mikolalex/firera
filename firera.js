var Firera = function($el){
    var $scope = $el || $(document);
    var vars = [];
    var modifiers = {
	cell: {
	    
	},
	visibility: {
	    setter: function(val){
		if(val){
		    $(this.jquerySelector, $scope).show();
		} else {
		    $(this.jquerySelector, $scope).hide();
		}
	    }
	},
	val: {
	    selfRefresh: true,
	    setter: function(val){
		$(this.jquerySelector, $scope).val(val);
	    },
	    getter: function(){
		return $(this.jquerySelector, $scope).val();
	    },
	    startObserving: function(){
		var self = this;
		$(this.jquerySelector, $scope).keyup(function(val){
		    self.val = val;		    
		    self.compute();
		})
	    }
	},
	html: {
	    setter: function(val){
		$(this.jquerySelector, $scope).html(val);
	    }
	}
    }
    
    var Cell = function(selector){
	vars[selector] = this;
	if(selector.indexOf("|") !== -1){
	    // this is a dom selector
	    var parts = selector.split("|");
	    this.jquerySelector = parts[0];
	    if(!modifiers[parts[1]]){
		error('Unknown html modifier: ' + parts[1]);
	    } else {
		this.type = parts[1];
	    }
	    if(modifiers[this.type].selfRefresh){
		this.compute = function(){
		    this.val = modifiers[this.type].getter.apply(this);
		    if(this.observers){
			for(var i=0; i<this.observers.length;i++){
			    this.observers[i].compute();
			}
		    } 
		}
		modifiers[this.type].startObserving.apply(this);
		this.compute();
	    }
	} else { // this is just custom abstract varname
	    this.type = 'cell';
	}
	this.observers = [];
	this.modifier = modifiers[this.type];
    }
    
    Cell.prototype.addObserver = function(cell){
	this.observers.push(cell);
    }
    
    Cell.prototype.get = function(){
	return this.val;
    }
    
    Cell.prototype.set = function(val){
	this.val = val;
	this.compute(true);
	if(this.modifier.setter){
	    this.modifier.setter.apply(this, val);
	}
	return this;
    }
    
    Cell.prototype.as = function(cell){
	this.is.call(this, function(flag){ return !!flag;}, cell);
    }
    Cell.prototype.notAs = function(cell){
	this.is.call(this, function(flag){ return !flag;}, cell);
    }
    
    Cell.prototype.is = function(func){
	var args = Array.prototype.slice.call(arguments, 1);
	if(args.length){
	    for(var i= 0;i<args.length;i++){
		if(!(args[i] instanceof Cell)){
		    if(vars[args[i]]){
			args[i] = vars[args[i]];
		    } else {
			args[i] = new Cell(args[i]);
		    }
		}
		args[i].addObserver(this);
	    }
	    this.func = func;
	} else {
	    this.val = func;
	}
	this.compute = function(skipSelf){
	    if(!skipSelf){
		var args1 = [];
		for(var i=0; i<args.length;i++){
		    args1.push(args[i].get());
		}
		this.val = func.apply(this, args1);
		if(this.modifier.setter){
		    this.modifier.setter.call(this, this.val);
		}
	    }
	    if(this.observers){
		for(var i=0; i<this.observers.length;i++){
		    this.observers[i].compute();
		}
	    } 
	}
	if(args.length) this.compute();
	return this;
    }
    
    return function(selector){
	return vars[selector] || new Cell(selector);
    }
}
