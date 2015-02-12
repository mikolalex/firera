/*
 * 
 * @todo Write custom readers for value range of array
 * @todo selection(projecion) by parameter(true/false) app('numbers.even'), where .each({even: [function(n){ return n % 2 === 0;}, 'val']}})
 * РўР°Рє Р»РµРіРєРѕ С‚СЂРµРєР°С‚Рё Р·РјС–РЅРё С†РёС… РїР°СЂР°РјРµС‚СЂС–РІ С– Р·РјС–РЅСЋРІР°С‚Рё Р»РёС€Рµ С‚С– РЅРѕРґРё, СЏРєС– Р·РјС–РЅРёР»РёСЃСЏ :)
 * .range(10) - should return [1, 2, ..., 10]
 * $datasource - should be able to update existing items instead of adding new
 */
(function(){
	///// 
	///// 
	///// UTILITIES
	///// 
	///// Dirty functions names should begin with "$"
	var utils = {

		
		filterFields: function(data, fields){
			var res = {};
			if(fields === true || fields === '*') fields = false;
			for(var i in data){
				if(!fields || fields.indexOf(i) !== -1){
					res[i] = data[i];
				}
			}
			return res;
		},
		
		$remove: function(obj, val){
			for(var i in obj){
				if(obj[i] == val){
					delete obj[i];
				}
			}
		},
                
                id: function(a){ return a},
		
		$getScopedElement: function(selector, $scope){
			if(selector === '' || selector === 'root'){
				return $scope;
			} else {
				return $(selector, $scope);
			}
		},
		
		isReservedName: function(name){
			return name[0] === '$';
		},
		
		isHTMLCell: function(name){
			return name.indexOf('|') !== -1;
		},

		existy: function(a) {
			return (a !== undefined) && (a !== null);
		},

		isInt: function(n) {
			return n % 1 == 0;
		},
		
		union: function(a, b){
			var c = {};
			for(var i in a){
				c[i] = a[i];
			}
			for(var i in b){
				c[i] = b[i];
			}
			return c;
		},

		getTagName: function($el) {
			if($el instanceof Node){
				return $el.tagName;
			}
			if ($el && $el.get().length && $el.get()[0].tagName){
				return $el.get()[0].tagName.toLowerCase()
			}
			else
				return '';
		},

		$searchAttrNotNested: function(element, attr, skip_root) {
			var res = [];
			var searcher = function(el, skip_root) {
				if (!el)
					return;
				if (el.getAttribute(attr) && !skip_root) {
					res.push({name: el.getAttribute(attr), el: el})
				} else {
					for (var i = 0; i < el.children.length; i++) {
						searcher(el.children[i]);
					}
				}
			}
			searcher(element, skip_root);
			return res;
		},

		isValuable: function(tagname) {
			return ['input', 'select', 'textarea'].indexOf(tagname.toLowerCase()) !== -1;
		},

		getMergedObject: function(a, b){
			var res = {};
			for(var i in a){
				res[i] = a[i];
			}
			for(var i in b){
				res[i] = b[i];
			}
			return res;
		},
		
		chainLog: function(msg){
			return function(val){
				console.log('chain log val::' + msg + '::', val);
				return val;
			}
		},

		getDefaultTemplate: function(vars) {
			if (vars.length === 1 && vars[0] === '__val'){
				//return '';
			}
			var res = [];
			for (var i in vars) {
				if (_.isHTMLCell(vars[i])) continue;
				res.push('<div data-fr="' + vars[i] + '"></div>');
			}
			return res.join('');
		},

		attrReader: function(obj){
			return function(key){
				//console.log('got', key, 'return', obj[key], 'form', obj);
				return obj[key] ? obj[key] : '';
			}
		},

		$objJoin: function(a, b, overwrite) {
			for (var i in a) {
				if (!b[i] || overwrite)
					b[i] = a[i];
			}
		},
                
                firstExisting: function(/* args */){
                    for(var i = 0; i < arguments.length; ++i){
                        if(arguments[i] !== undefined && arguments[i] !== null) {
                            return arguments[i];
                        }
                    }
                },
                
                compose: function(funcs){
                    for(var i = 0; i< funcs.length; ++i){
                        if(funcs[i] instanceof Array){
                            // it should be a funcion with arguments, let's bind it
                            funcs[i] = funcs[i][0].bind(null, funcs[i].slice(1));
                        }
                    }
                    return function(){
			// pass all the args to the first function,
			// then pass it's result to the next func
                        var v = funcs[0].apply(null, arguments);
                        for(var i = 1; i< funcs.length; ++i){
                            v = funcs[i](v);
                        }
                        return v;
                    }
                },
                
                canTakeArray: function(func){
                    return function(val){
                        if(val instanceof Array){
                            for(var i in val){
                                func.apply(this, (val[i] instanceof Array) ? val[i] : [val[i]]);
                            }
                        } else {
                            func.apply(this, arguments);
                        }
                    }
                },

		getMapFunc: function(func) {
			var res;
			if (func && !(func instanceof Function)) {// its object property , like "name" or "!completed"
				if (func.indexOf("!") === 0) {
					res = (function(field) {
						return function() {
							return !this[field];
						}
					}(func.replace("!", "")))
				} else {
					res = (function(field) {
						return function() {
							return !!this[field];
						}
					}(func))
				}
			} else {
				res = func;
			}
			return res;
		}
	}
	
	_ = window._ || {};
	for(var i in utils){
		if(_[i]){
			error('Cant assign util function:', i);
			return;
		}
		_[i] = utils[i];
	}
})();

(function() {
	// Firera globals
	var $ = window['jQuery'] || window['$'] || false;
	var debug_level = window.debug_level || 1;// 0 - no messages shown
	var HTMLDrivers = {};
	var customDrivers = {};
	var customEventDrivers = {}
	var events = ['click', 'submit', 'keyup', 'keydown', 'mouseover', 'focus', 'blur', 'mouseon', 'mouseenter', 'mouseleave', 'keypress', 'dblclick', 'change'];
	var get_cell_type = function(cellname) {
		return (!_.isHTMLCell(cellname) || events.indexOf(cellname.split("|")[1]) === -1)  ? 'cell' : 'event';
	}
	// adding some sugar
	String.prototype.contains = function(s){
		return this.indexOf(s) !== -1;
	}
	String.prototype.notContains = function(s){
		return this.indexOf(s) === -1;
	}
	
	// Useful internal functions
	var debug = (function(level){
		if(level === 0){
			return function(){}
		} else {
			return function(){
				console.log.apply(console, ['--------DEBUG: '].concat(Array.prototype.slice.call(arguments)));
			}
		}
	})(debug_level)
	var error = function() {
		try {
                    console.log(arguments);
                    throw new Error('|' + Array.prototype.join.call(arguments, "|") + '|');
		} catch(e) {
			var stack = e.stack;
			console.error(stack);
		}
	}
	var collect_values = function(obj) {
		var res = {};
		for (var i in obj) {
			if(_.isReservedName(i) || _.isHTMLCell(i)) continue;
			res[i] = obj[i].get();
		}
		return res;
	}


	var Cell = function(name, host, params) {
            if (!host) {
                    error('no host in cell ' + name);
            }
            this.free = true;
            this.params = [];
            this.host = host;
            this.deps = [];
            this.inited = false;
            this.observables = 0;
            this.changers = [];
            this.observers = [];
            this.name = name;
            var driver = Firera.find_cell_driver(name);
            driver.call(this, name);
	}

	Cell.prototype.getName = function() {
            return this.name;
	}
        
        Cell.prototype.cell = function(name){
            return this.host(name);
        }

	Cell.prototype.remove = function() {
            for (var i in this.deps) {
                    this.cell(this.deps[i]).removeObserver(this.getName());
            }
	}

	Cell.prototype.invalidateObservers = function() {
		this.observables++;
		for (var i in this.observers) {
			this.cell(this.observers[i]).invalidateObservers();
		}
	}

	Cell.prototype.addObserver = function(cellname) {
            this.observers.push(cellname);
	}

	Cell.prototype.removeObserver = _.$remove.bind(null, this.observers);

	Cell.prototype.get = function() {
		return this.val;
	}

	Cell.prototype.getType = function() {
		return 'cell';
	}

	Cell.prototype.rebind = function() {
		/* empty for default cell, will be overwritten for self-refreshing cells */
	}
        
	Cell.prototype.set = function(val, setanyway) {
		// @todo: refactor this comdition to checking simple boolean var(to increase speed)
		if(!this.free && !setanyway && !this.reader){
			error('Cant set dependent value manually: ', this.getName(), this, val);
			return;
		}
		var old_val = this.val,
		    new_val = val;
		this.val = new_val;
		if (this.writer) {
			this.writer.apply(this, [this.val].concat(this.params));
		}
		//////////
		this.invalidateObservers();
                this.observables--;
		this.updateObservers(this.getName());
		this.change(old_val, new_val);
		return this;
	}

	Cell.prototype.updateObservers = function(name, no_change) {
		for (var i in this.observers) {
			this.cell(this.observers[i]).compute(this.val, this.name, no_change);
		}
	}

	Cell.prototype.just = function(val) {
		this.set(val);// just a value
		return this;
	}
	
	Cell.prototype.load = function(url) {
		var self = this;
		$.get(url, function(data) {
			self.set(data);
		})
		this.set('');
		return this;
	}

	Cell.prototype.loadJSON = function(url) {
		$.getJSON(url, function(data) {
			this.set(data);
		}.bind(this))
		this.set('');
		return this;
	}
        
        var some_shitty_suffix = "___!!!___";
        
        var list_compute = function(val, cellname) {
            if(!this.formula){// something strange
                    return;
            }
            this.observables--;
            if (this.observables > 0) return;
            
            if(cellname !== undefined){
                this.argsValues[this.argsKeys[cellname]] = val;
            }
            var arr, conf = {}, res = this.formula.apply(this, this.argsValues);
            if(res instanceof Array){
                arr = res[0];
                conf = res[1];
            } else {
                arr = res;
            }
            conf.host = this.host;
            var list = new List(arr, conf);
            Cell.prototype.alias.call(list, this.getName().replace(some_shitty_suffix, ""));
	}
        
        Cell.prototype.list = function(){
            this.compute = list_compute;
            this.name = this.getName() + some_shitty_suffix;
            this.alias(this.getName());
            
            return this.is.apply(this, arguments);
        }

	Cell.prototype.are = function(arr, config) {
		if(arr instanceof Function){// it's a datasource!
			return this.are.call(this, {$datasource: Array.prototype.slice.call(arguments)});			
		}
		var mass = [];
		if (!(arr instanceof List)) {
			var conf = config || {};
			conf.host = this.host;
                        conf.name = this.getName();
			if (arr instanceof Array) {
				mass = arr;
				arr = new List({}, conf);
			} else {
				arr = new List(arr, conf);
			}
		}
		_.$objJoin(this, arr);
		this.host.setVar(this.getName(), arr);
		for (var i in mass) {
			var element = mass[i] instanceof Object ? mass[i] : {__val: mass[i]};
			arr.push(element);
		}
		arr.rebind();
		return arr;
	}

	/* To be done :)
	Cell.prototype.projects = function(arr_name, fields, map_func, map_fields) {
		var conf = {};
		conf.host = this.host;
		var arr = new List({}, conf);
		_.$objJoin(this, arr);
		this.host.setVar(this.getName(), arr);
		arr.rebind();
		return arr;
	}*/
	
	Cell.prototype.alias = function(name) {
		this.host.aliases[name] = this;
		this.host.removeVar(name);
	}
        
        Cell.prototype.getArgsValues = function(){
            var args1 = [];
            for (var i in this.argsValues) {
                    args1.push(this.argsValues[i]);
            }
            return args1;
        }

	Cell.prototype.compute = function(val, cellname, no_change) {
		if(!this.formula){// something strange
			return;
		}
                this.observables--;
                if (this.observables > 0) return;
                
                if(cellname !== undefined){
                    if(this.argsKeys !== undefined && this.argsKeys[cellname] !== undefined){
                        this.argsValues[this.argsKeys[cellname]] = val;
                    }
                }
		var old_val = this.val;
		var new_val = this.formula.apply(this, this.argsValues);
		this.val = new_val;
		if (this.writer && !_.isReservedName(this.getName())) {
			this.writer.apply(this, [this.val].concat(this.params));
		}
		if(!no_change) this.change(old_val, this.val);
		this.updateObservers(name, no_change);
		return this;
	}

	Cell.prototype.depend = _.canTakeArray(function(cell, path) {
            this.deps.push(cell.getName());
            path = path ? this.host.getReversePath(path, this.getName()) : this.getName();
            cell.addObserver(path);
	});
        
	Cell.prototype.is = function(f) {
            if (f instanceof Cell) {
                error('Cant depend on cell iself(provide a name)');
            }
            var formula = f;
            if (this.inited) {
                    console.warn('Cell already inited!');
                    //return;
            } else {
                    this.inited = true;
            }

            if (formula instanceof Array) {
                if(arguments.length === 1){
                    // creating new Firera List from array
                    this.self = new List(formula, {host: this.host});
                    return this;
                } else {
                    // it's function composition!
                   formula = _.compose(formula);
                }
            }
            if (formula instanceof Object && !(formula instanceof Function)) {// creating new Firera hash
                    this.self = Firera.hash(formula, {host: this.host});
                    return this;
            }

            var args = Array.prototype.slice.call(arguments, 1);
            if (!args.length) {// is just an another cell
                    args[0] = formula;
                    formula = function(val) {
                            return val;
                    };
            } else {
                // it's function, defned by string, like '+'
                if(formula.replace){
                    switch(formula){
                        case '+':
                            formula = function(a, b){ return a + b;};
                        break;
                        case '-':
                            formula = function(a, b){ return a - b;};
                        break;
                        case '*':
                            formula = function(a, b){ return a * b;};
                        break;
                        case '/':
                            formula = function(a, b){ return a / b;};
                        break;
                        default:
                            error('Formula cant be string:', formula);
                            return;
                    }
                }
            }
            if ((args[0] instanceof Array) && !(args[1])) {
                    args = args[0];
            }
            this.argsValues = [];
            this.argsKeys = {};
            for (var i = 0; i < args.length; i++) {
                    var cell = args[i];
                    if (args[i] instanceof Cell) {
                        error('Cant depend on cell iself(provide a name)');
                    } else {
                        cell = this.host(args[i]);
                    }
                    this.depend(cell, args[i]);
                    this.argsKeys[this.host(args[i]).getName()] = i;
                    this.argsValues.push(this.host(args[i]).get());
            }
            this.formula = formula;
            this.free = false;
            if (args.length) this.compute();
            return this;
	}
        
        var stream_compute = function(val, cellname, no_change){
            this.observables--;
            if (this.observables > 0) return;
            var old_val = this.val;
            var new_val = this.formula.call(this, val, cellname);
            this.val = new_val;
            if (this.writer && !_.isReservedName(this.getName())) {
                    this.writer.apply(this, [this.val].concat(this.params));
            }
            if(!no_change) this.change(old_val, this.val);
            this.updateObservers(name, no_change);
            return this;
        }
        
        Cell.prototype.streams = function(){
            var vars = [], func, args = Array.prototype.slice.call(arguments);
            if(typeof args[0] === 'function'){
                func = args.shift();
            }
            if(args[0] instanceof Array){
                // it's a list of variables
                vars = args[0];
            } else if(typeof args[0] === 'string'){
                // it's var name
                vars = args;
            } else if(args[0] instanceof Object){
                // it's mapping object
                var map = args.shift();
                func = function(val, key){
                    if(!map[key]){
                        // something strange...
                        error('Unknown cell for streams()');
                        return;
                    } else {
                        return map[key](val);
                    }
                }
                vars = Object.keys(map);
            } else {
                error('Wrong parameter for streams()', arguments);
                return;
            }
            this.formula = func || _.id;
            this.free = false;
            var self = this;
            if(vars[0] === '*'){
                // it means all variables
                this.host.onChange(function(key, __, val){
                    stream_compute.call(self, val, key, true);
                })
            } else {
                for (var i = 0; i < vars.length; i++) {
                    var cell = vars[i];
                    if (!(vars[i] instanceof Cell)) {
                        cell = this.host.create_cell_or_event(vars[i], {dumb: true});
                    }
                    this.depend(cell, vars[i]);
                }
                this.compute = stream_compute;
            }
            return this;
        }
	
	Cell.prototype.change = function(prev_val, new_val) {
		for (var i = 0; i < this.changers.length; i++) {
			this.changers[i].call(this, prev_val, new_val);
		}
		this.host.change(this.getName(), prev_val, new_val);
	}
	
	Cell.prototype.onChange = function(func) {
		this.changers.push(func);
	}

	var Event = function(selector, host) {
		this.host = host;
		this.selector = selector.split("|")[0];
		this.event = selector.split("|")[1];
		this.handlers = [];
	}

	Event.prototype.process = function(e, initial_val, $el) {
		e.preventDefault();
		var val = initial_val || null;
		for (var i = 0; i < this.handlers.length; i++) {
			var sup = this.host.host || false;
			val = this.handlers[i](this.host, this.host.getName(), sup, val, $el, e);
			if (val === false) {
				break;
			}
		}
	}

	Event.prototype.getType = function() {
		return 'event';
	}

	Event.prototype.then = function(func) {
		this.handlers.push(func);
		return this;
	}

	Event.prototype.filter = function(func) {
		if (!(func instanceof Function)) {
			var field = func.replace("!", "");
			if (func.indexOf("!") === 0) {
				this.handlers.push(function(obj) {
					return obj(field).get() ? false : true;
				})
			} else {
				this.handlers.push(function(obj) {
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

	var make_window_between_hashes = function(parent, child, config) {
		if(!config) return;
		if (config.takes) {
			if(!(config.takes instanceof Object)){
				config.takes = [config.takes];
			}
			for (var i in config.takes) {
				var varname = _.isInt(i) ? config.takes[i] : i;
				if(!parent.getVar(config.takes[i])){
					//error('Linking to dumb vars while mixing(takes): ', config.takes[i]);
					//return;
				}
                                //console.log('NC', '../' + config.takes[i]);
				child(varname).is(function(a){ return a;}, '../' + config.takes[i]);
			}
		}
		if (config && config.gives) {
			if(!(config.gives instanceof Object)){
				config.gives = [config.gives];
			}
			for (var i in config.gives) {
				var varname = _.isInt(i) ? config.gives[i] : i;
				if(!child.getVar(config.gives[i])){
					//error('Linking to dumb vars while mixing(gives): ', config.gives[i]);
					//return;
				}
                                var childname = child.isShared() ? child.host.getName() : child.getName();
				parent(varname).is(function(a){ return a;}, childname + '/' + config.gives[i]);
			}
		}
	}
	
	var check_for_constructor = function(hash){
		if (hash instanceof Function) {
			hash = {__setup: hash};
		}
		return hash;
	}

	var hash_methods = {
                getReversePath: function(path, cellname){
                    //return path;
                    if(path.indexOf('/') !== -1){
                        var parts = path.split("/");
                        for(var i = 1; i < parts.length; i++){
                            parts[i - 1] = '..';
                        }
                        parts[parts.length - 1] = cellname;
                        return parts.join('/');
                    } else return cellname;
                },
		create_cell_or_event: function(selector, params, dont_check_if_already_exists) {
			if(_.isInt(selector) && this.isSharedHash){
				return this.host.list[selector];
			}
			if(!selector) error('No selector provided', arguments);
			if(selector.contains('/')){
				var parts = selector.split('/');
				var member = parts[0];
				var host;
				if(member === '..'){// its parent
						if(!this.host){
							error('Could not access parent hash as ', selector); return;
						}
						if(this.host instanceof List){
							if(this.isShared()){
								host = this.host.host;
							} else {
								host = this.host.shared;
							}
						} else {
							host = this.host;
					f	}
				} else {
					if(_.isInt(member)){ // its part of list
						if(this instanceof List && this.list){
							host = this.list[member];
						} else {
							if(this.isShared()){
								host = this.host.list[member];
							} else {
								error('Could not access list member as ', selector, this.isSharedHash); return;
							}
						}
					} else {
						if(this instanceof List){
							host = this.shared.getVar(member);
						} else {
							host = this.getVar(member);
						}
						if(host instanceof List){
							host = host.shared;
						}
						if(!host) {	
							error('Could not access cell as', selector, this.getRoute(), member); 
							return;
						}
					}
				}
				var tail = parts.slice(1).join('/');
				return host.create_cell_or_event(tail);
			}
			
			
			if (!dont_check_if_already_exists && this.getVar(selector)){
				return this.getVar(selector);
			} else {
				var vr = this.getOwnVar(selector);
				if(vr) return vr;
				//console.log('we have own', selector);
			}
			var type = get_cell_type(selector);
			var new_cell = new types[type](selector, this, params);
			this.setVar(selector, new_cell);
			return new_cell;
		},
		getName: function() {
			if(!this.host){ return 'ROOT';};
			if (this.host && this.host.getAllVars && !(this.host instanceof List)) {
				var parent_vars = this.host.getAllVars();
				var ind = parent_vars.indexOf(this);
				if(ind !== -1) return ind;
				var parent_mixins = this.host.mixins;
				for (var i in parent_mixins) {
					for(var j in parent_mixins[i]){
						if (parent_mixins[i][j] === this) {
							return 'MIXIN_' + i;
						}
					}
				}
				return '?!?';
			} else {
				if(this.isShared()) return 'shared';
				return this.getIndex();
			}
		},
		getIndex: function(){
			if(!this.host || !this.host.list) {
				error('Cant get ondex of non-array member!');
				return;
			}
			return this.host.list.indexOf(this);
		},
		getRoute: function() {
			if (!this.host) {
				return 'root / ';
			} else {
				if (!this.host) {
					error('Who I am?');
					return;
				}
				return this.host.getRoute() + (this.getName ? this.getName() : '???') + ' / ';
			}
		},
		toString: function() {
			if (!this.host) {
				return 'root / ';
			} else {
				if (!this.host) {
					error('Who I am?');
					return;
				}
				return this.host.getRoute() + (this.getName ? this.getName() : '???') + ' / ';
			}
		},
		///// NEW
		getOwnVar: function(name) {
			return this.vars[name] ? this.vars[name] : (this.aliases[name] ? this.vars[this.aliases[name]] : false);
		},
		getVar: function(name) {
			var vr = this.vars[name];
			if(!vr && this.host && !this.isShared() && (!this.host instanceof List)){// hash attached to hash
				vr = this.host.getVar(name);
			}
			if(!vr && this.aliases[name]){
				return this.aliases[name];
			}
			if (
				!vr
				&& this.host
				&& this.host.shared
				&& (this.host.shared !== this/* ho-ho ;) */)
				) {// if this is a part of List, search in it's SHARED vars
				vr = this.host.shared.getVar(name) || false;
			}
			// search in shared cells!
			if (!vr && this.linked_hash && (name !== '$template')/* && name.indexOf("|") == -1  - hmm, maybe it should be?! */) {
				vr = this.linked_hash.getVar(name) || false;
			}
			return vr;
		},
		removeVar: function(name){
			delete this.vars[name];// !!! unbind also
		},
		setVar: function(name, val) {
			this.vars[name] = val;
		},
		getAllVars: function() {
			return this.vars;
		},
		getVarNames: function() {
			return Object.keys(this.vars);
		},
		getType: function() {
			return 'hash';
		},
		mix: function(mixed_obj, context, share, config) {
			var config = {host: this, noTemplateRenderingAllowed: true, config: (config ? config : {})};
			if (!share) {// we should take vars of the host!
				config.linked_hash = this;
			}
			this.mixins = this.mixins || {};
			context = context || 'root';
			this.mixins[context] = this.mixins[context] || [];
			var mixin_hash = new Firera.hash(mixed_obj, config);
			make_window_between_hashes(this, mixin_hash, share);
			this.mixins[context].push(mixin_hash);
		},
		setData: function(hash){
			if(!(hash instanceof Object)){
				hash = {__val: hash};
			}
			for(var i in hash){
				if(hash[i] instanceof Array){
					if(!this.getVar(i)){
						this(i).are([]);
					}
					if(!(this(i) instanceof List)){
						this(i).are({});
						this(i).setData(hash[i]);
						//error('Could not assign array data to not-array!', this(i), hash[i]);
						return;
					}
					this(i).setData(hash[i]);
				}
				else {
					if(hash[i] instanceof Object){
						
					} else {
						this(i).set(hash[i]);
					}
				}
			}
		},
		change: function(cellname, prev_val, new_val) {
			if(this.changers[cellname]){
				for(var j in this.changers[cellname]){
					this.changers[cellname][j](cellname, prev_val, new_val);
				}
			}
			if(_.isReservedName(cellname)) return;
			if(this.changers['_all']){
				for(var j in this.changers['_all']){
					this.changers['_all'][j](cellname, prev_val, new_val);
				}
			}
			if(prev_val !== undefined && this.host && this.host instanceof List){
				this.host.changeItem('update', this.getName(), cellname, prev_val, new_val);
				this.host.changeItemField(cellname, this.getName(), prev_val, new_val);
			}
		},
		onChange: function(func, fields) {
			if(!fields){
				fields = ['_all'];
			}
			for(var i in fields){
				if(!this.changers[fields[i]]) this.changers[fields[i]] = [];
				this.changers[fields[i]].push(func);
			}
		},
		init_with_data: function(hash) {
			for (var i in hash) {
				var cell = this.create_cell_or_event(i);
				if (hash[i] instanceof Array) {
					for (var j in hash[i]) {
						if (!(hash[i][j] instanceof Object)) {
							hash[i][j] = {item: hash[i][j]};
						}
					}
					var list = new window[lib_var_name].list({$data: hash[i]}, {host: this});
					cell.are(list);
				} else {
					if (hash[i] instanceof Object) {
						// Ready Firera List object
					} else {
						cell.just(hash[i]);
					}
				}

			}
			return true;
		},
		get: function(arr){
			if(!arr) {
				var vars = this.getAllVars();
				if(vars.__val) return vars.__val.get();
				return collect_values(vars);
			}
			if(!(arr instanceof Array)) return this(arr).get();
			var res = {};
			for(var i in arr){
				var field = arr[i];
				res[field] = this(field).get();
			}
			return res;
		},
		setHost: function(host) {
			this.host = host;
		},
		applyTo: function(selector_or_element) {
			this('$rootSelector').set(selector_or_element);
		},
		getRebindableVars: function() {
			var vars = this.getAllVars();
			var res = {};
			if (this.host && this.host.shared) {
				var shared_vars = this.host.shared.getAllVars();
				for (var j in shared_vars) {
					if (!_.isReservedName(j)) {
						res[j] = shared_vars[j];
					}
				}
			}
			for(var i in vars){
				if(!_.isReservedName(i)){
					res[i]  = vars[i];
				}
			}
			return res;
		},
		remove: function() {
			this.getScope().remove();
			for (var i in this.vars) {
				// unbind each cell
				if (this.vars[i] instanceof Cell) {
					this.vars[i].remove();
				}
			}
			return true;
		},
		isShared: function(a){
			if(a) console.log('checkig if shared', this.host.shared === this);
			return !!this.isSharedHash;//host && this.host.shared === this;
		}
	}
	
	/////
	/////
	///// HASH
	/////
	/////

	var Firera = function(init_hash, params) {
		//debug('New hash created', init_hash, params);
		var self = function(selector) {
			if (selector instanceof Function)
				return self({__setup: selector});
			if (selector instanceof Object) {
				return init_with_hash(selector, self.config);
			}
			var pars = Array.prototype.slice.call(arguments, 1);
			return self.create_cell_or_event(selector, pars);
		}
		if (params) {
			var possible_params = ['host', 'linked_hash', 'isSingleVar', 'noTemplateRenderingAllowed', 'config', 'isSharedHash']
			for (var i in possible_params) {
				if (params[possible_params[i]]) {
					self[possible_params[i]] = params[possible_params[i]];
				}
			}
		}
		self.changers = {};
		self.aliases = {};
		self.vars = {};

		for (var i in hash_methods) {
			self[i] = hash_methods[i];
		}
		
		//////////////////////////////////////////
		var init_with_hash = function(selector, params) {
			for (var i in selector) {
				if (i === '__setup' || i === '__mixins' || i === 'vars' || i === '$data'){
					continue;
				}
				var cell = self.create_cell_or_event(i, undefined, true);
				if(i === 'each'){
					continue;
				}
				Firera.apply_dependency_to_cell_from_hash(cell, selector[i]);
			}
			if (selector.__mixins) {// special case)
				if (!(selector.__mixins instanceof Array)) {
					error('Mixins should be contained in array!');
				}
				for (var j = 0; j < selector.__mixins.length; j++) {
					var mx = selector.__mixins[j];
					self.mix(mx.hash, mx.context, mx.share, mx.config)
				}
			}
			if (selector.__setup) {// run setup function
				selector.__setup.call(self, params);
			}
			if(selector.$data){
				self.setData(selector.$data);
			}
			if(self.isShared()) return self.host;
			return true;
		}
		self.update = function(hash) {
			init_with_hash(hash, this.config);
		}
		//////////////////////////////////////////	
		if (init_hash instanceof Function) {
			init_hash = {__setup: init_hash};
		}

		if (init_hash) {
			if (init_hash.$data && (!params || !params.skip_data)) {
				self.init_with_data(init_hash.$data);
			}
			self.update(init_hash);
		}

		return self;
	}

	/////
	/////
	///// LIST
	/////
	/////
	var List = function(init_hash, config) {
		this.changers = {
			create: [],
			read: [],
			update: [],
			delete: [],
		};
		this.field_changers = {};
		this.list = [];
		this.each_is_set = false;
		this.each_hash = {};
		this.shared_hash = {};
		this.map_funcs = [];
		this.reduce_funcs = [];
		this.count_funcs = [];
		this.shared_config = {host: this, skip_data: true, isSharedHash: true};
		this.how_to_share_config = {takes: [], gives: []};
		if(config && config.share) {
			if(config.share === true){
				this.shared_config.linked_hash = config.host;
			} else {
				if(config.share instanceof Object){
					this.how_to_share_config = config.share;
				}
			}
		}
		if(config && config.host){
			this.host = config.host;
		}
		this.shared = new Firera.hash(init_hash, this.shared_config);
		if(config) {
                    if(config.name){
                        this.name = config.name
                    }
                    if(config.host){
                        config.host.setVar(this.getName(), this);
                        this.setHost(config.host);
                    }
                    if(config.autoselect !== undefined){
                            this.autoselect = config.autoselect;
                    }
		}
		if (init_hash) {
			if (init_hash.each) {
				this.each_is_set = true;
				this.each_hash = check_for_constructor(init_hash.each);
			}
			if (init_hash.$data) {
                this.push(init_hash.$data);
			}
			// maybe delete .data and .each?
		}
	}
        
	List.prototype.getRoute = function() {
		if (!this.host) {
			return 'root / ';
		} else {
			return this.host.getRoute() + this.getName() + ' / ';
		}
	}

	List.prototype.update = function(init_hash) {
		if (init_hash.each) {
			this.each_is_set = true;
			init_hash.each = check_for_constructor(init_hash.each);
			this.each(init_hash.each)
			_.$objJoin(init_hash.each, this.each_hash, true);
		}
	}

	List.prototype.setHost = function(host) {
		this.host = host;
                //console.log('!!!name', this.getName());
		make_window_between_hashes(this.host, this.shared, this.how_to_share_config);
	}

	List.prototype.getType = function() {
		return 'list';
	}
	
	List.prototype.item = function(num) {
		return this.list[num];
	}

	List.prototype.push = function(obj, nochange) {
		if (obj instanceof Array) {
			for (var i in obj) {
				this.push(obj[i], true);
				this.changeItem('create', '*', this.list.length - 1);
			}
			return;
		}
		if (!(obj instanceof Object)) {
			obj = {__val: obj};
		}
		var confa = {host: this};
		if (obj.__val) {
			confa.isSingleVar = true;
		}
		var counter = this.list.push(window[lib_var_name].hash(obj, confa)) - 1;
		if (this.each_is_set) {
			this.list[counter].update(this.each_hash);
		}
		if (!nochange) {
			this.changeItem('create', '*', counter);
		}
		return this;
	}

	List.prototype.setData = function(arr) {
		this.clear();
		for(var i in arr){
			this.addOne();
			var last = this.list.length - 1;
			this.get(last).setData(arr[i]);
		}
		if(this.autoselect !== undefined){
			this.select(this.autoselect);
		}
		return this;
	}

	List.prototype.clear = function() {
		this.list = [];
		return this;
	}

	List.prototype.addOne = function() {
		this.push({});
	}

	List.prototype.getName = function() {
		return this.name;
	}

	List.prototype.map = function(func) {

	}

	List.prototype.reduce = function(func) {

	}
	
	List.prototype._remove_by_num = function(i){
		var item_to_delete = this.list[i];
		this.changeItem('delete', null, i);
		item_to_delete && item_to_delete.remove();
		this.list.splice(i, 1);
		this.changeItem('afterDelete', i);
	}

	List.prototype.remove = function(func, end) {
		if (!func && func !== 0) {
			// Hm... remove all or nothing?
			return;
		}
		
		if (_.isInt(func)) {
			if(end && _.isInt(end) && Number(end) > Number(func)){
				for(var i = Number(func); i <= Number(end); i++){
					this.remove(i);
				}
			}
			this._remove_by_num(func);
			return;
		}
		if(func instanceof Object){// it's hash!
			var i = this.list.indexOf(func);
			this._remove_by_num(i);
		}
		var f = _.getMapFunc(func);
		for (var i in this.list) {
			if (f.apply(this.list[i].get())) {
				this._remove_by_num(i);
			}
		}
	}

	List.prototype.count = function(func) {
		if (!func) {
			return Object.keys(this.list).length;
		}
		var total = 0;
		for (var i in this.list) {
			var obj = this.list[i].get();
			if (!!func.apply(obj))
				total++;
		}
		return total;
	}

	List.prototype.get = function(num) {
		if(num || num === 0){
			return this.list[num];
		}
		var res = [];
		for (var i in this.list) {
			res.push(this.list[i].get());
		}
		return res;
	}

	List.prototype.filter = function() {

		return this;
	};

	List.prototype.each = function(hash) {
		hash = check_for_constructor(hash);
		this.each_is_set = true;
		for (var i in hash) {
			this.each_hash[i] = hash[i];
		}
		for (var i in this.list) {
			this.list[i].update(hash);
		}
		return this;
	};

	List.prototype.show = function(cond, val) {
		var args = Array.prototype.slice.call(arguments);
		if (cond instanceof Function) {
			args.shift('is');
		}
		this.each({
			"root|visibility": args
		})
		return this;
	}

	List.prototype.applyTo = function(selector_or_element, start_index, end_index) {
		
	}
	
	List.prototype.changeItem = function(changetype, fields, itemnum, cellname, prev_val, new_val) {
		for(var i in this.changers[changetype]){
                    this.changers[changetype][i](changetype, itemnum, cellname, prev_val, new_val);
		}
	}
	List.prototype.onChangeItem = function(changetype, func){
		var types = [];
		if(changetype === '*'){
			changetype = 'create, update, delete';
		}
		if(changetype.contains(',')){// multiple events
			types = changetype.split(", ");
		} else {
			types = [changetype];
		}
		for(var i in types){
			if(!this.changers[types[i]]) this.changers[types[i]] = [];
			this.changers[types[i]].push(func);
		}
	}
	List.prototype.changeItemField = function(field, index, prev_val, new_val) {
		for(var i in this.field_changers[field]){
			this.field_changers[field][i](index, prev_val, new_val);
		}
	}
	List.prototype.onChangeItemField = function(fields, func){
		fields = fields.split(", ");
		for(var i in fields){
			var field = fields[i];
			if(!this.field_changers[field]) this.field_changers[field] = [];
			this.field_changers[field].push(func);
		}
	}
	
	List.prototype.pick = function(fields){
		var res = [];
		for(var i in this.list){
			res.push(this.list[i].get(fields))
		}
		return res;
	}
	
	Firera.get_params = function(str){
		var m = str.match(/([a-z]*)\((.*)\)/i);
		return m[2].split(",");
	}
	
	Firera.apply_dependency_to_cell_from_hash = function(cell, row){
		var cell_type = cell.getType();
		if(row instanceof Object && !(row instanceof Array) && !(row instanceof Function)){
			self(i).are(row);
			return;
		}
		switch (cell_type) {
			case 'cell':
				if (row instanceof Array) {
					if (row[0] instanceof Function) {
						cell['is'].apply(cell, row);
					} else {
						if(row[0] instanceof Array){
							cell['is'].apply(cell, row);
						} else {
							if (!cell[row[0]]) {
								error('Using unknown function:', arguments);
							}
							cell[row[0]].apply(cell, row.slice(1));
						}
					}
				} else {
					cell.just(row);
				}
				break;
			case 'event':
				if (row instanceof Function) {
					cell.then(row);
				} else {
					if (row instanceof Array) {
						if (!(row[0] instanceof Array) && !(row[0] instanceof Function)) {
							//row[0] = [row[0]];
							// its some event method
							if(!Event.prototype[row[0]]){
								error('Unknown method for event: ', row);
							} else {
								Event.prototype[row[0]].apply(cell, row.slice(1));
							}
						} else {
							for (var j = 0; j < row.length; j++) {
								if (row[j] instanceof Function) {
									cell.then(row[j]);
								} else {
									if (row[j] instanceof Array) {
										var func = row[j][0];
										cell[func].apply(cell, row[j].slice(1));
									} else {
										error('wrong parameter type for cell creation!');
									}
								}
							}
						}
					}
				}
				break;
			case 'list':
				cell.update(row);
				break;
		}
	}
	
	Firera.cell_drivers = [
            {
                    name: 'common',
                    regex: new RegExp('.*'),
                    func: function(){
                            this.dumb = true;
                    }
            },
            {
                    name: 'system',
                    regex: new RegExp('^\\$.*'),
                    func: function(name){
                            var params;
                            var driver_name = name.slice(1);
                            if (driver_name.contains("(")) {
                                    params = Firera.get_params(driver_name);
                            }
                            if (!customDrivers[driver_name]) {
                                    // it's a free, but system variable
                                    //error('Unknown custom driver: ' + driver_name);
                                    return;
                            }
                            var driver = this.driver = customDrivers[driver_name];
                            if (driver.def) this.val = driver.def;
                            driver.reader && driver.reader.call(this);
                            if(driver.depends){
                                    //console.log('apply_dependency_to_cell_from_hash', this, driver.depends);
                                    Firera.apply_dependency_to_cell_from_hash(this, driver.depends);
                            }
                    }
            }
	];
	
	Firera.find_cell_driver = function(name){
                var i = this.cell_drivers.length;
		while(i--){
			if(this.cell_drivers[i].regex.test(name)){
				return this.cell_drivers[i].func;
			}
		}
	}
	
	/////
	/////
	///// OTHER LIB METHODS FOR Firera OBJECT
	/////
	/////
	Firera.list = List;
	Firera.hash = Firera;
	Firera.dump = function(hash){
                if(hash instanceof List){
                    return Firera.dumpList(hash);
                }
		var res = {
			rootElement: hash.rootElement ? hash.rootElement.get() : undefined,
			self: hash,
		}
		var vars = hash.getAllVars();
		for(var i in vars){
			if(vars[i] instanceof Event){
				if(!res.events) res.events = {};
				res.events[i] = vars[i];
			}
			if(vars[i] instanceof Cell){
				if(i === '$template'){
					res.template = vars[i].get();
					res.template_source = hash.template_source;
					res.template_self = vars[i];
					continue;
				}
				if(!vars[i].free){
					if(!res.dependentVars) res.dependentVars = {};
					res.dependentVars[i] = Firera.dumpCell(vars[i]);
				} else {
					if(vars[i].dumb){
						if(!res.dumbVars) res.dumbVars = {};
						res.dumbVars[i] = Firera.dumpCell(vars[i]);
					} else {
						if(!res.freeVars) res.freeVars = {};
						res.freeVars[i] = Firera.dumpCell(vars[i]);
					}
				}
			}
			if(vars[i] instanceof List){
				if(!res.lists) res.lists = {};
				res.lists[i] = Firera.dumpList(vars[i]);
			}
		}
		if(hash.mixins){
			res.mixins = {};
			for(var i in hash.mixins){
				res.mixins[i] = {};
				for(var j in hash.mixins[i]){
					res.mixins[i][j] = Firera.dump(hash.mixins[i][j]);
				}
			}
		}
		return res;
	}
	Firera.dumpCell = function(cell){
		var res = {val: cell.get(), self: cell};
		return res;
	}
	Firera.dumpList = function(list){
		var res = {
			shared: Firera.dump(list.shared),
			list: []
		};
		for(var i in list.list){
			res.list[i] = Firera.dump(list.list[i]);
		}
		res.changers = list.changers;
		return res;
	}
	
	/////
	/////
	///// METHODS FOR EXTENDING FIRERA ABILITIES
	/////
	/////
	
	Firera.addEventAction = function(name, func){
		if(Event.prototype[name]) {
			error('Cant add event action', name, ', already taken!');
			return;
		}
		Event.prototype[name] = function(){
			this.handlers.push(func);
		}
	}
	
	Firera.addEventPreparedAction = function(name, func){
		if(Event.prototype[name]) {
			error('Cant add event action', name, ', already taken!');
			return;
		}
		Event.prototype[name] = function(){
			this.handlers.push(func(arguments));
		}
	}
	
	// Methos for adding some special cellnames. For example, app(".name|visibility") - here visibility is a custom HTML driver
	Firera.addHTMLReader = function(name, func, def){
		if(HTMLDrivers[name]) {
			error('Cant add HTML reader - name already taken!', name);
			return;
		}
		HTMLDrivers[name] = {reader: func, def: def};
	}
	Firera.addHTMLWriter = function(name, func, def){
		if(HTMLDrivers[name]) {
			error('Cant add HTML writer - name already taken!', name);
			return;
		}
		HTMLDrivers[name] = {writer: func, def: def};
	}
	Firera.addHTMLReaderWriter = function(name, func, def){
		if(HTMLDrivers[name]) {
			error('Cant add HTML writer - name already taken!', name);
			return;
		}
		HTMLDrivers[name] = {writer: func.writer, reader: func.reader, def: def};
	}
	
	Firera.addCustomWriter = function(name, func, def){
		if(customDrivers[name]) {
			error('Cant add custom writer - name already taken!', name);
			return;
		}
		customDrivers[name] = {writer: func, def: def};
	}
	Firera.addCustomReader = function(name, func, def){
		if(customDrivers[name]) {
			error('Cant add custom reader - name already taken!', name);
			return;
		}
		customDrivers[name] = {reader: func, def: def};
	}
	Firera.addCustomVar = function(name, args){
		if(customDrivers[name]) {
			error('Cant add custom var - name already taken!', name);
			return;
		}
		customDrivers[name] = {depends: args};
	}
	
	Firera.addCustomListWriter = function(name, func, def){
		if(customDrivers[name]) {
			error('Cant add custom list writer - name already taken!', name);
			return;
		}
		customDrivers[name] = {writer: function(){
				if(!this.host.isShared()){
					error('Cant run list writer of a non-list!', this);
					return;
				}
				return func.apply(this, arguments);
		}, def: def};
	};
	Firera.addCustomListReader = function(name, func, def){
		if(customDrivers[name]) {
			error('Cant add custom list reader - name already taken!', name);
			return;
		}
		customDrivers[name] = {
			reader: function(){
				if(!this.host || !this.host.isShared()){
					error('Cant run list reader ' + name + ' of a non-list!', this, this.host, this.host.isShared());
					return;
				}
				return func.apply(this, arguments);
			}, 
			def: def
		};
	};
	
	
	Firera.addCellFunction = function(name, func){
		if(Cell.prototype[name]){
			error('Cell function already assigned!'); 
			return;
		}
		Cell.prototype[name] = function(){
			var args = Array.prototype.slice.call(arguments);
			args.unshift(func);
			this.is.apply(this, args);
		}
	}
	Firera.addCellMacros = function(name, func){
		if(Cell.prototype[name]){
			error('Cell macros already assigned!'); return;
		}
		Cell.prototype[name] = function(){
			return this.is.apply(this, func.apply(this, arguments));
		}
	}
	Firera.addHashMethod = function(name, func){
		hash_methods[name] = func;
	}
	Firera.addListMethod = function(name, func){
		if(List.prototype[name]){
			error('List method already exists:', name); return;
		}
		List.prototype[name] = function(){
			func.apply(this, arguments);
			return this;
		}
	}
	
	Firera.addCustomEventDriver = function(name, func){
		if(customEventDrivers[name]){
			error('Custom driver already assigned: ', name); return;
		}
		customEventDrivers[name] = func;
	}
	
	Firera.addCellDriver = function(_, driver){
		Firera.cell_drivers.push(driver);
	}
	
	Firera.addPackage = function(package){
		var method_names = {
			customEventDrivers: 'addCustomEventDriver',	
			customReaders: 'addCustomReader',
			customWriters: 'addCustomWriter',
			customListReaders: 'addCustomListReader',
			customVars: 'addCustomVar',
			customListWriters: 'addCustomListWriter',
			HTMLReaders: 'addHTMLReader',
			HTMLWriters: 'addHTMLWriter',
			HTMLReadersWriters: 'addHTMLReaderWriter',
                        cellDrivers: 'addCellDriver',
			cellMacrosMethods: 'addCellMacros'
		}
		for(var field in method_names){
			if(package[field]){
				var method = method_names[field];
				for(var name in package[field]){
					Firera[method](name, package[field][name]);
				}
			}
		}
	}
        Firera.HTMLDrivers = HTMLDrivers;
	
	Firera.error = error;
	
	var lib_var_name = 'Firera';
	if (window[lib_var_name] !== undefined) {
		throw new Exception('Cant assign Firera library, varname already taken: ' + lib_var_name);
	} else {
		window[lib_var_name] = Firera;
	}
})();


//////////
//////////
////////// ADDING CORE CUSTOM AND HTML DRIVERS
//////////
//////////
(function(){

	var gather_form_values = function(selector, scope, clear, cb) {
		var res = {};
		$(selector + " input", scope).each(function() {
			var val = '', name = $(this).attr('name');
			switch ($(this).attr('type')) {
				case 'checkbox':
					val = !!$(this).attr('checked');
				break;
				case 'submit':
					
				break;
				case 'file':
					
				break;
				case 'text':
					val = $(this).val();
					if (clear) {
						$(this).val('');
					}
				break;
				case 'hidden':
					val = $(this).val();
				break;
			}
			res[name] = val;
		})
		$(selector + " textarea", scope).each(function() {
			res[$(this).attr('name')] = $(this).val();
		})
		return res;
	}
	
	var core = {
                cellDrivers: [
                    {
			name: 'HTML',
			regex: new RegExp('(.|\s)*\\|.*'),
			func: function(name){
			    var parts = name.split("|");
			    if (parts[1].contains("(")) {
				// there are some params
				var m = parts[1].match(/([a-z]*)\((.*)\)/i);
				this.params = m[2].split(",");
				parts[1] = m[1];
			    }
			    if (!Firera.HTMLDrivers[parts[1]]) {
				    error('Unknown driver: ' + parts[1]);
				    return;
			    }
			    var selector = parts[0];
			    this.driver = Firera.HTMLDrivers[parts[1]];
			    if (this.driver.def) this.val = this.driver.def;
			    if (this.driver.reader) {
				this.depend(this.host('$actualRootNode'));
				this.reader = true;
				this.formula = function(){
					var element = $(selector, this.host('$actualRootNode').get());
					if(element.length){
						this.driver.reader.call(this, element);
					}
				}
				this.formula();
			    }
			    if (this.driver.writer) {
				this.depend(this.host('$actualRootNode'));
				this.writer = function(val/*, params */){
					var element = $(selector, this.host('$actualRootNode').get());
					//console.log('getting element', selector, this.host('$actualRootNode').get(), element.length);
					var args = Array.prototype.slice.call(arguments);
					args.splice(1, 0, element);
					this.driver.writer.apply(this, args);
				}
			    }
			}
                    },
                ],
		customReaders: {
			i: function(){
				if(!this.host.host.list){
					error('Cant get index of not array element in reader!'); return;
				}
				this.set(this.host.getIndex());
				this.host.host.onChangeItem('afterDelete', function(){
					if(!this.host) return;// its deleted node
					this.set(this.host.getIndex());
				}.bind(this))
			}
		},
		customWriters: {
			template: function(){
				this.host && this.host.refreshTemplate && this.host.refreshTemplate();
			}
		},
		customVars: {
			rootNodeX: ['el', '$rootSelector'],
			vars: ['streams', function(val, key){
                                return {
                                    val: val,
                                    key: key
                                }
                        }, '*'],
			actualRootNode: [_.firstExisting, '$rootNode', '$rootNodeX'],
			templateX: ['html', '$actualRootNode'],
            actualTemplate: [_.firstExisting, '$template', '$templateX'],
            bindings: [function(templ, $el){
                    $el.html(templ);
                    var bindings = _.$searchAttrNotNested($el.get()[0], 'data-fr', true);
                    var res = {};
                    for(var i in bindings){
                        if(!res[bindings[i].name]) res[bindings[i].name] = [];
                        res[bindings[i].name].push(bindings[i].el);
                        var c = this.host.getVar(bindings[i].name);
                        if(c){
                            var type = c.getType();
                            switch(type){
                                case 'cell':
                                    bindings[i].el.innerHTML = c.get();
                                break;
                                case 'list':
                                case 'hash':
                                    c.applyTo(bindings[i].el);
                                break;
                            }
                        }
                    }
                    return res;
            }, '$actualTemplate', '$actualRootNode'],
            HTMLVarsWriter: [
                function(bindings, var_obj){
                    if(!var_obj || !bindings[var_obj.key]) return;
                    for(var i in bindings[var_obj.key]){
                        bindings[var_obj.key][i].innerHTML = var_obj.val;
                        //console.log('writing var', var_obj.key, bindings[var_obj.key], var_obj.val);
                    }
                }, '$bindings', '$vars'
            ]
		},
		customListReaders: {
			length: function() {
                var self = this;
                var list = this.host.host;
                list.onChangeItem('delete', function(){
                    self.set(self.get() - 1);
                })
                list.onChangeItem('create', function(){
                    self.set(self.get() + 1);
                })
                this.set(list.list.length);
			},
			selectedItem: function() {
                var self = this;
                if(!this.host.isShared()){
                        error('cound not count length of non-list!'); return;
                }
                var list = this.host.host;
                list.onChangeItem('delete', function(){
                        self.set(self.get() - 1);
                })
                list.onChangeItem('create', function(){
                        self.set(self.get() + 1);
                })
                this.set(list.list.length);
			},
		},
		customListWriters: {
			datasource: function(val) {
				if (this.host && this.host.host) {// should be a list
					if (!val)
						val = [];
					this.host.host.clear().setData(val);
				}
			},
			shownItems: {
				writer: function(val) {
					var scope = this.host.host.getScope();
					if(scope){
						var items = scope.children();
						var start = val, end = parseInt(val) + 1;
						if(val === '*' || val === true){
							items.show(); return;
						}
						if(val instanceof Array){
							// range
							start = val[0];
							end = val[1];
						}
						items.hide().slice(start, end).show();
					}
				}
			},
		},
		HTMLReaders: {
			mouseover: function($el) {
				var self = this;
				$el.mouseenter(function() {
					self.set(true);
				}).mouseleave(function() {
					self.set(false);
				})
			},
			files: function($input_element){
				var self = this;
				var get_files_info = function(input){
					var files = input.files;
					if(files.length){
						var res = [];
						for(var i = 0; i < files.length; i++){
							res.push({
								name: files[i].name,
								size: files[i].size,
								type: files[i].type,
							});
						}
						return res;
					}
				}
				$input_element.change(function(){
					self.set(get_files_info($(this).get()[0]));
				})
				this.set(get_files_info($input_element.get()[0]));
			}
		},
		HTMLWriters: {
			visibility: function(val, $el) {
				if (val) {
					$el.show();
				} else {
					$el.hide();
				}
			},
			html: function(val, $el) {
				if (!$el.length) {
					//Firera.error('Empty selector in html');
					return;
				}
				$el.html(val);
			},
			toggleClass: function(val, $el, classname) {
				if (val) {
					$el.addClass(classname);
				} else {
					$el.removeClass(classname);
				}
			},
			css:  function(val, $el, property, speed) {
				if(!speed){
					$el.css(property, val);
				} else {
					var time = {
						'slow': 500,
						'fast': 100,
					}[speed];
					var anim = {};
					anim[property] = val;
					$el.animate(anim, time);
				}
			},
			attr: function(val, $el, atrname) {
				$el.attr(atrname, val);
			}
		},
		HTMLReadersWriters: {
			value: {
				writer: function(val, $el) {
					switch ($el.attr('type')) {
						case 'checkbox':
							$el.attr('checked', !!val);
							break;
						default:
							$el.val(val);
							break;
					}
				},
				reader: function($el) {
					var self = this;
					var type = $el.attr('type');
					$el.bind("keyup, input, focus, keypress, blur, change", function() {
						var val;
						switch (type) {
							case 'checkbox':
								val = $(this).attr('checked');
								break;
							default:
								val = $(this).val();
								break;
						}
						self.set(val);
					})
				}
			},
			
			selectedItem: {
				reader: function($el){
					if (!$el.length) {
						error("No element found by selector ");
					}
					var self = this;
					var items = $el.children();
					items.each(function() {
						if (!$(this).attr('data-value')) {
							$(this).attr('data-value', items.index($(this)));
						}
					}); //just return index! 
					if (_.getTagName($el) === 'select') {
						var onChange = function() {
							self.set($el.val());
						}
						$el.change(onChange);
						onChange();
					} else {
						items.click(function() {
							items.removeClass('selected');
							$(this).addClass('selected');
							var val = $(this).attr('data-value');
							self._selectedItem_writer_is_in_process = true;
							self.set(val);
						})
					}
				},
				writer: function(val, $el){
					if(this._selectedItem_writer_is_in_process){
						this._selectedItem_writer_is_in_process = false;
					} else {
						if(_.isInt(val)){
							this._selectedItem_writer_is_in_process = true;
							$($el.children().get()[val]).click();
						}
					}
				}
			}
		},
		cellMacrosMethods: {
			ifAny: function() {
				var args = Array.prototype.slice.call(arguments);
				args.unshift(function() {
					var args = Array.prototype.slice.call(arguments);
					var res = false;
					for (var i = 0; i < args.length; i++) {
						res = res || args[i];
					}
					return res;
				});
				return args;
			},
			picks: function(arr_or_obj_cell, fields){
				fields = fields instanceof Array ? fields : [fields];
				var pick = function(arr_or_obj){
					if(arr_or_obj instanceof Array){
						var res = [];
						for(var i in arr_or_obj){
							res.push(pick(arr_or_obj[i]))
						}
						return res;
					} else {// it should be object
						var obj = {};
						for(var i in fields){
							obj[fields[i]] = arr_or_obj[fields[i]];
						}
						return obj;
					}
				}
				return [pick, arr_or_obj_cell];
			},
			ifAll: function() {
				var args = Array.prototype.slice.call(arguments);
				args.unshift(function() {
					var args = Array.prototype.slice.call(arguments);
					var res = true;
					for (var i = 0; i < args.length; i++) {
						res = res && args[i];
					}
					return res;
				});
				return args;
			},
			'if': function(cond, then, otherwise) {
				return [function(flag) {
					return flag ? (_.existy(then) ? then : true) : (_.existy(otherwise) ? otherwise : false);
				}, cond];
			},
			html: function(cellname) {
				return [function(el) {
					return $(el).html();
				}, cellname];
			},
			el: function(cellname) {
				return [function(selector) {
					return $(selector);
				}, cellname];
			},
			gets: function() {
				var self = this;
				var args = Array.prototype.slice.call(arguments);
				var url = args.shift();
				var req = 
				{
					type: 'GET',
					dataType: 'json',
				}
				if(url instanceof Object){// it's params
					req = _.getMergedObject(req, url);
				} else {
					if (url.notContains('/')) {// its varname !!!! may be /parent!
						args.unshift(url);
						url = false;
						skip_first = true;
					} else {
						req.url = url;
					}
				}
				var aliases = false;
				if (args.length == 1) {
					if (args[0] instanceof Array) {
						args = args[0];
					} else {
						if (args[0] instanceof Object) {
							aliases = args[0];
							args = Object.keys(args[0]);
						}
					}
				}

				var skip_first = false;
				var get_request_hash = function(arr) {
					var res = {};
					for (var i in arr) {
						if (skip_first) {
							skip_first = false;
							continue;
						}
						var varname = aliases ? aliases[arr[i]] : arr[i];
						res[args[i]] = self.host(varname).get();
					}
					skip_first = true;
					return res;
				}
				var ars = [function(u) {
						req.data = get_request_hash(args);
						req.url = url || u;
						req.success = function(data) {
							self.set(data, true);
						};
						$.ajax(req);
					}].concat(args);
				return ars;
			},
			ifEqual: function(c1, c2) {
				return [function(a, b) {
						return a == b;
					}, 
					c1, 
					c2
				];
			},
			selectIf: function(c1, c2) {
				var args = [
					function(a, b) {
						if (b === '*')
							return true;
						return a == b;
					}, 
					c1, 
					c2
				];
				return args;
			},
			isNot: function(cell) {
				var args = [
					function(flag) {
						return !flag;
					}, 
					cell
				];
				return args;
			}
		},
		customEventDrivers: {
			submit: function(selector, scope, callback) {
				var submitters = $(selector + " input[type=submit]", scope);
				if (submitters.length < 1) {
					submitters = $(selector + " .firera-submitter", scope);
				}
				if (submitters.length === 1) {// ok, binding
					submitters.bind('click', function(e) {
						var hash = gather_form_values(selector, scope, true);
						callback(e, hash, scope);
						return false;
					});
				} else {
					if (submitters.length > 1) {
						error('Multiple submitters found!');
					} else {
						error('No submitters found! (' + selector + " input[type=submit]" + ")");
					}
				}
			}
		}
	}
	
	Firera.addPackage(core);
	
	//////////
	//////////
	////////// ADDING CORE LIST METHODS: syncing with server etc
	//////////
	//////////
	
	Firera.addListMethod('sync', function(params){
		var list = this;
		var name = list.getName();
		var defaults = {
			getUrl: function(){
				return list.getName();
			}
		}
		var getContext = function(){
			
		};
		var getRequest = function(data){
			return _.getMergedObject(data, getContext());
		};
		var needed_params = {
			host: '',
			contextvars: [],
			fields: true,
			idFields: ['id'],
			dataType: 'json',
			
			create: 'onCreate',// (default), 'manual', 60(interval in seconds)
			createURL: '/' + name,// default: "/hashName"
			createRequest: getRequest,
			createMethod: 'PUT', // HTTP method, default is PUT
			
			read: 'once',// 'once'(default), 'manual', 60(interval in seconds)
			readURL: '/' + name,// default: "/hashName"
			readRequest: function(a){ return a },
			readMethod: 'GET', // HTTP method, default is GET
			
			update: 'onChange',// 'manual', 60(interval in seconds)
			updateURL: '/' + name,
			getUpdateRequestData: function(changeset, fields, id_fields){
				if(!id_fields){
					for(var i in fields){
						changeset['where_' + i] = fields[i];
					}
				}
				return changeset;
			},
			updateMethod: 'POST',
			updateDelay: 0,
			
			delete: 'once',//(default),// 'manual', 60(interval in seconds)
			deleteURL: '/' + name,
			deleteRequest: function(data){
				return data;
			},
			getDeleteRequestData: function(changeset, fields, id_fields){
				if(!id_fields){
					for(var i in fields){
						changeset['where_' + i] = fields[i];
					}
				}
				return changeset;
			},
			deleteMethod: 'DELETE'// HTTP method, default is DELETE
		};
		needed_params = _.getMergedObject(needed_params, params);
		
		var getData = function(key){
			if(needed_params[key] instanceof Function){
				return needed_params[key].apply(null, Array.prototype.slice.call(arguments, 1));
			} else {
				return needed_params[key];
			}
		}
		
		var getFunc = function(key){
			return needed_params[key];
		}
		
		
		// forming params done! Now, attaching handlers...
		
		
		this.onChangeItem('create', function(x, itemnum){
			if(list.dontfirechange) return;
			var fields = getData('fields');
			var data = _.filterFields(list.list[itemnum].get(), fields);
			data = getFunc('createRequest')(data, name);
			var params = {
				url: getData('createURL', name, data, getData('host')),
				type: getData('createMethod'),
				data: data,
				dataType: getData('datatype'),
				success: function(result) {
				    // Do something with the result
				}
			}
			console.log(params);
			$.ajax(params);
		})
		
		var changer;
		switch(getData('update')){
			case 'onChange':
				changer = function(x, itemnum, field, old_val, new_val){
					if(list.dontfirechange) return;
					
					console.log(arguments);
					var where_fields = _.filterFields(list.list[itemnum].get(), getData('idFields'));
					var req = {};
					req[field] = new_val;
					var data = getData('getUpdateRequestData', req, where_fields, name);
					$.ajax({
						url: getData('updateURL', name, getData('host')),
						type: getData('updateMethod'),
						data: data,
						dataType: getData('datatype'),
						success: function(result) {
						    // Do something with the result
						}
					});
				}
			break;
			case 'manual':
				var change_flags_hash = {};
				var change_values_hash = {};
				var fields = getData('fields');
				changer = function(x, itemnum, fieldname, old_val, new_val){
					if(list.dontfirechange) return;
					if(!(fields instanceof Array) || fields.indexOf(fieldname) !== -1){// we are changing, remember old values
						change_flags_hash[itemnum] || (change_flags_hash[itemnum] = {});
						change_flags_hash[itemnum][fieldname] || (change_flags_hash[itemnum][fieldname] = false);
						if(change_flags_hash[itemnum][fieldname] === false){
							change_values_hash[itemnum] || (change_values_hash[itemnum] = {});
							change_values_hash[itemnum][fieldname] = old_val;
							change_flags_hash[itemnum][fieldname] = true;
						}
					}
				}
				list._sync = {
					update: function(number){
						var h = list.list[number], c = change_values_hash[number];
						var where_fields = _.filterFields(h.get(), getData('idFields'));
						var data = {};
						for(var i in c){
							data[i] = h(i).get();
						}
						data = getData('getUpdateRequestData', data, where_fields, name);
						$.ajax({
							url: getData('updateURL', name, getData('host')),
							type: getData('updateMethod'),
							data: data,
							dataType: getData('datatype'),
							success: function() {
							}
						});
						for(var i in c){
							change_flags_hash[number][i] = false;
						}
					},
					restore: function(number){
						var h = list.list[number], c = change_values_hash[number];
						for(var i in c){
							h(i).set(c[i]);
							change_flags_hash[number][i] = false;
						}
					},
				}
				Firera.addEventAction('update', function(x, number, list){
					list._sync.update(number);
				})
				Firera.addEventAction('restore', function(x, number, list){
					list._sync.restore(number);
				})
			break;
		}
	
		this.onChangeItem('update', changer);
		
		this.onChangeItem('delete', function(x, itemnum){			
			var fields = getData('fields');
			var data = _.filterFields(_.filterFields(list.list[itemnum].get(), fields), getData('idFields'));
			data = getFunc('deleteRequest')(data);
			$.ajax({
				url: getData('deleteURL', name, getData('host')),
				type: getData('deleteMethod'),
				data: data,
				success: function(result) {
				    // Do something with the result
				}
			});
		})
		/// READ!
		var contextvars = getData('contextvars');
		switch(getData('read')){
			case 'once':
				var dt = {};
				for(var i in contextvars){
					if(_.isInt(i)){// its array
						dt[contextvars[i]] = list.shared(contextvars[i]).get();
					} else {
						dt[i] = list.shared(contextvars[i]).get();
					}
				}
				var req_config = {
					url: getData('readURL', name, getData('host')),
					type: getData('readMethod'),
					data: getData('readRequest', dt),
					dataType: getData('datatype'),
					success: function(result) {
					    if(result){
						    list.dontfirechange = true;
                            list.setData(result);
						    list.dontfirechange = false;
					    }
					}
				};
				$.ajax(req_config);
			break;
			case false:
				// do nothing!
			break;
			case 'onContextChange':
				contextvars.unshift({
					url: getData('readURL', name, getData('host')),
					type: getData('readMethod'),
					dataType: getData('datatype'),
					getRequestHash: getFunc('readRequest')
				});
				list.shared('$datasource').gets.apply(list.shared('$datasource'), contextvars);
			break;
		}
	})
	
	Firera.addListMethod('simplePHPSync', function(params){
		var default_params = {
			readURL: function(name){
				return '/get_' + name + '.php';
			},
			updateURL: function(name){
				return '/edit_' + name + '.php';
			},
			createURL: function(name){
				return '/add_' + name + '.php';
			},
			deleteURL: function(name){
				return '/remove_' + name + '.php';
			},
			deleteMethod: 'GET',
			createMethod: 'POST',
		}
		for(var i in params){
			default_params[i] = params[i];
		}
		return this.sync.call(this, default_params);
	});
	
	Firera.addListMethod('DChSync', function(params){
		var default_params = {
			createRequest: function(data, name){
				var res = {};
				for(var i in data){
					res[name + '_' + i] = data[i];
				}
				return res;
			},
			readURL: function(name, host){
				return host + '/get_' + name;
			},
			updateURL: function(name, host){
				return host + '/edit_' + name;
			},
			createURL: function(name, data, host){
				return host + '/add_' + name;
			},
			deleteURL: function(name, host){
				return host + '/remove_' + name;
			},
			getUpdateRequestData: function(changeset, id_fields, name){
				/*if(!id_fields){
					for(var i in fields){
						changeset['where_' + i] = fields[i];
					}
				}*/
				var res = {};
				
				return changeset;
			},
			deleteMethod: 'GET',
			createMethod: 'GET',
			updateMethod: 'GET',
		}
		for(var i in params){
			default_params[i] = params[i];
		}
		return this.sync.call(this, default_params);
	});
	
	/////
	/////
	///// Plugins
	/////
	/////
	
	Firera.plugins = {
		// ;)
	}
	
})();

////// Firera.History
(function(){

	Firera.startHistory = function(config, main_app_hash){
		var possible_handlers = {
			'val': function(key, val){
				return val;
			},
			'key/val': function(key, val){
				return key + '/' + val;
			},
			'param': function(key, val){
				return key + '=' + val;
			}
		}
		var self = window.hist = Firera.history = new Firera.hash({config: ['just', config]});
		var fields_to_pick = [];
		var field_cells = {};
		var cell_fields = {};
		var parse_url_func;
		var set_url = function(x, config){
			var args = [];
			var handlers = [];
			var types = [];
			for(var i in config.fields){
				var f = config.fields[i], fieldname;
				f.key = fieldname = f['key'] || f['cell'];
				var cellname = f['cell'];
				fields_to_pick.push(cellname);
				cell_fields[cellname] = fieldname;
				field_cells[fieldname] = cellname;
				args.push(main_app_hash(cellname));
				types.push(f['type']);
				handlers.push(possible_handlers[f['type']].bind(null, fieldname));
			}
			args.unshift(function(){
				var path_url = [], context;
				var param_url = [];
				for(var i in handlers){
					context = types[i] === 'param' ? param_url : path_url;
					context.push(handlers[i](arguments[i] || ''));
				}
				return (path_url ? '' + path_url.join("/") : '') + (param_url ? '?' + param_url.join("&") : '');
			})
			self("url").is.apply(self("url"), args);
		
			var parse_url = function(){
				var tail = location.pathname.replace(prefix, "");
				var parts = tail.split('/');
				var data = {};
				var p = 0;
				var c = 0;
				while(parts[p]){
					if(types[c] === 'val'){
						data[config.fields[c].cell] = parts[p];
						p++;
						c++;
						continue;
					}
					if(types[c] === 'key/val'){
						data[config.fields[c].cell] = parts[p + 1];
						p += 2;
						c++;
						continue;
					}
				}
				var req = location.search.slice(1).split('&');
				for(var i in req){
					var prt = req[i].split("=");
					data[field_cells[prt[0]]] = prt[1];
				}
				return data;
			}
			parse_url_func = parse_url;
		}
		
		self('config').onChange(set_url);
		var prefix;
		switch(config.prefix){
			case '%filename%':
				var path = location.pathname.split('/');
				path.pop();
				prefix = path.join('/');
			break;
			case false:
				prefix = location.pathname;
			break;
			default:
				prefix = config.prefix;
		}
		var skip = true;
		self('url').onChange(function(old_url, new_url){
			if(skip){
				skip = false;
				return;
			}
			var url = prefix + new_url;
			var state = main_app_hash.get(fields_to_pick);
			var st = {};
			for(var i in state){
				st[cell_fields[i]] = state[i];
			}
			history.pushState(st, null, url);
		})
		set_url(null, config);
		var data = parse_url_func();
		for(var i in data){
			main_app_hash(i).set(data[i]);
		}
		window.onpopstate = function(e){
			var state = e.state;
			for(var field in state){
				main_app_hash(field_cells[field]).set(state[field]);
			}
		}
	}
	
}());

