(function() {
	/* @todo: unbind previous bindings
	 * var a = frp(function(){}, b, c);
	 * @todo: fix pour() to .prototype - common arrays!
	 * @todo: refactor for(var i = 0;i< this.changers.length;i++){ to for(var i = 0, changer;changer = this.changers[i];i++){
	 * prohibit direct use of |html modifier! Use vars instead!
	 */
	var $ = window['jQuery'] || window['$'] || false;
	
	String.prototype.contains = function(s){
		return this.indexOf(s) !== -1;
	}
	String.prototype.notContains = function(s){
		return this.indexOf(s) === -1;
	}

	var reserved_cellnames = function(name){
		return name[0] === '$';
	}
	var not_html_but_needs_setter = ['$datasource', 'showItem', '$template'];
	
	var existy = function(a) {
		return (a !== undefined) && (a !== null);
	}

	function isInt(n) {
		return n % 1 == 0;
	}

	var tagName = function($el) {
		if ($el && $el.get().length && $el.get()[0].tagName)
			return $el.get()[0].tagName.toLowerCase()
		else
			return '';
	}

	var search_attr_not_nested = function(element, attr, skip_root) {
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
	}

	var is_valuable = function(tag) {
		return ['input', 'select', 'textarea'].indexOf(tag.toLowerCase()) !== -1;
	}
	
	var join_object_attrs = function(a, b){
		for(var i in b){
			a[i] = b[i];
		}
		return a;
	}

	var generate_default_template = function(vars) {
		if (vars.length === 1 && vars[0] === '__item'){
			//return '';
		}
		var res = [];
		for (var i in vars) {
			if (vars[i].contains('|')) continue;
			res.push('<div data-fr="' + vars[i] + '"></div>');
		}
		return res.join('');
	}

	var drivers = {
		cell: {
		},
		$datasource: {
			setter: function(val) {
				if (this.host && this.host.host) {// should be a list
					if (!val)
						val = [];
					this.host.host.clear().setData(val);
				}
			}
		},
		$template: {
			setter: function(){
				this.host && this.host.refreshTemplate && this.host.refreshTemplate();
			}
		},
		showItem: {
			setter: function(val) {
				if (this.host && this.host.host) {// should be a list
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
			}
		},
		visibility: {
			setter: function(val, $el) {
				if (val) {
					$el.show();
				} else {
					$el.hide();
				}
			},
		},
		value: {
			def: '',
			setter: function(val, $el) {
				switch ($el.attr('type')) {
					case 'checkbox':
						$el.attr('checked', !!val);
						break;
					default:
						$el.val(val);
						break;
				}
			},
			startObserving: function($el) {
				var self = this;
				var type = $el.attr('type');
				$el.bind("change, keyup, input", function() {
					switch (type) {
						case 'checkbox':
							self.set($(this).attr('checked'));
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
			startObserving: function($el) {
				var self = this;
				$el.mouseenter(function() {
					self.set(true);
				}).mouseleave(function() {
					self.set(false);
				})
			}
		},
		selectedItem: {
			def: false,
			/*setter: function(val, list){
			 alert('we set' + val + ' to ' + list);
			 var new_chosen = list.children("[data-value=" + val + "]");
			 if(!new_chosen.length){
			 error("No list selection found: [data-value=" + val + "]");
			 }
			 list.children().removeClass('selected');
			 new_chosen.addClass("selected");
			 },*/
			startObserving: function($el) {
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
				if (tagName($el) === 'select') {
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
						self.set(val);
					})
				}
			}
		},
		html: {
			setter: function(val, $el) {
				if (!$el.length) {
					error('Empty selector in html');
					return;
				}
				$el.html(val);
			}
		},
		toggleClass: {
			setter: function(val, $el, classname) {
				if (val) {
					$el.addClass(classname);
				} else {
					$el.removeClass(classname);
				}
			}
		},
		css: {
			setter: function(val, $el, property, speed) {
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
			}
		},
		attr: {
			setter: function(val, $el, atrname) {
				$el.attr(atrname, val);
			}
		}
	}

	var error = function() {
		console.log.apply(console, ['ERROR!'].concat(Array.prototype.slice.call(arguments)));
	}

	var obj_join = function(a, b, overwrite) {
		for (var i in a) {
			if (!b[i] || overwrite)
				b[i] = a[i];
		}
	}

	var pour = function(obj, mixin) {
		if (mixin.__init) {
			mixin.__init.call(obj);
		}
		for (var i in mixin) {
			if (i == '__init')
				continue;
			if (obj[i]) {
				error('conflict, property ' + i + ' already exists in mixin!');
			}
			if (mixin[i] instanceof Function) {
				obj[i] = mixin[i];
			}
		}
	}

	var get_map_func = function(func) {
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

	var Cell = function(selector, host, params) {
		if (!host) {
			error('no host in cell ' + selector);
		}
		this.free = true;
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

		var root_element;
		if (this.getScope() && selector.notContains("|") && selector[0] !== '$') {
			if (this.getName() === '__item') {
				root_element = this.getScope();
			} else {
				root_element = $('[data-fr=' + this.getName() + ']', this.getScope());
			}
			if (root_element.length) {
				this.bindToDOM(root_element, this.getName());
			}
		}

		if (selector.contains("|")) {// HTML selector
			// this is a dom selector
			var parts = selector.split("|");
			this.jquerySelector = parts[0];
			if (parts[1].contains("(")) {
				// there are some params
				var m = parts[1].match(/([a-z]*)\((.*)\)/i);
				this.params = m[2].split(",");
				parts[1] = m[1];
			}
			if (!drivers[parts[1]]) {
				error('Unknown driver: ' + parts[1]);
				return;
			} else {
				this.type = parts[1];
			}
			this.driver = drivers[this.type];
			if (!this.driver)
				error('No driver found for:', this.type);
			if (!drivers[this.type])
				error('No driver type:', this.type);
			if (drivers[this.type].startObserving) {
				this.val = drivers[this.type].def;
				this.rebind = function() {
					this.HTMLElement = false;// abort link to old element
					drivers[this.type].startObserving.apply(this, [this.getElement()].concat(this.params));
					if (this.driver && this.driver.setter && this.getScope()) {
						this.driver.setter.apply(this, [this.val, this.getElement()].concat(this.params));
					}
					return this;
				}
				this.getScope() && this.rebind('cell constructor');
			} else {
				var self = this;
				this.rebind = function(source) {
					this.HTMLElement = false;// abort link to old element
					if (self.driver.setter && self.getScope()) {
						self.driver.setter.apply(self.driver, [self.val, self.getElement()].concat(this.params));
					}
				}
			}
		} else { // this is just custom abstract varname
			params && params.dumb && (this.dumb = true);
			if(not_html_but_needs_setter.indexOf(this.getName()) !== -1){
				this.type = this.getName();
				this.rebind = function() {
					this.driver.setter.apply(this, [this.val].concat(this.params));
					return this;
				}
			} else {
				this.type = 'cell';
			}
		}
		this.driver = drivers[this.type];
	}

	Cell.prototype.getName = function() {
		return this.selector;
	}

	Cell.prototype.getElement = function() {
		if (!this.HTMLElement) {
			var selector = this.getSelector();
			if (selector === 'root' || selector === '') {
				this.HTMLElement = this.getScope();
			} else {
				this.HTMLElement = $(this.getSelector(), this.getScope());
			}

		}
		return this.HTMLElement;
	}

	Cell.prototype.getScope = function() {
		return this.host.getScope();
	}

	Cell.prototype.getSelector = function() {
		return (this.jquerySelector === 'root' ? '' : this.jquerySelector);
	}

	Cell.prototype.remove = function() {
		for (var i in this.deps) {
			this.deps[i].removeObserver(this);
		}
	}

	Cell.prototype.addObservable = function(cellname) {
		this.observables[cellname] = 0;
	}

	Cell.prototype.invalidateObservers = function(name) {
		if (this.getName() != name)
			this.observables[name]++;
		for (var i in this.observers) {
			this.observers[i].invalidateObservers(name);
		}
	}

	Cell.prototype.addObserver = function(cell) {
		this.observers.push(cell);
	}

	Cell.prototype.removeObserver = function(cell) {
		for (var i in this.observers) {
			if (this.observers[i] === cell) {
				delete this.observers[i];
			}
		}
	}

	Cell.prototype.get = function() {
		//console.log('we call get, got', this.val, 'in', this.getName());
		//console.dir(this.host);
		return this.val;
	}

	Cell.prototype.getType = function() {
		return 'cell';
	}

	Cell.prototype.rebind = function() {
		/* empty for default cell, will be overwritten for self-refreshing cells */
	}

	Cell.prototype.then = function(func) {
		this.modifiers.push(func);
	}

	Cell.prototype.map = function(map) {
		this.then(function(val) {
			if (map[val] !== undefined)
				return map[val];
			return val;
		})
	}

	Cell.prototype.set = function(val, setanyway) {
		if(Object.keys(this.observables).length && !setanyway){
			error('Cant set dependent value manually: ', this.getName(), this);
			return;
		}
		var old_val = this.val;
		var new_val = val;
		for (var i = 0; i < this.modifiers.length; i++) {
			new_val = this.modifiers[i](new_val);
		}
		this.val = new_val;
		//////////
		if (this.driver && this.driver.setter) {
			this.driver.setter.apply(this, [this.val, this.getElement()].concat(this.params));
		}

		if (this.getScope() && this.DOMElement) {
			this.updateDOMElement();
		}
		//////////
		this.invalidateObservers(this.getName());
		this.updateObservers(this.getName());
		this.change(old_val, new_val);
		return this;
	}

	Cell.prototype.updateObservers = function(name) {
		if (this.observers) {
			for (var i in this.observers) {
				this.observers[i].compute(name);
			}
		}
	}

	Cell.prototype.just = function(val) {
		this.val = val;// just a value
		return this;
	}

	Cell.prototype.isNot = function(cell) {
		return this.is(function(flag) {
			return !flag;
		}, cell);
	}

	Cell.prototype.or = function() {
		return this;
	}

	Cell.prototype.orJust = function() {
		return this;
	}

	Cell.prototype.ifEqual = function(c1, c2) {
		return this.is(function(a, b) {
			return a == b;
		}, c1, c2);
	}

	Cell.prototype.selectIf = function(c1, c2) {
		return this.is(function(a, b) {
			if (b === '*')
				return true;
			return a == b;
		}, c1, c2);
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

	Cell.prototype.gets = function() {
		var self = this;
		var args = Array.prototype.slice.call(arguments);
		var url = args.shift();
		var req = 
		{
			type: 'GET',
			dataType: 'json',
		}
		if(url instanceof Object){// it's params
			join_object_attrs(req, url);
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
		return this.is.apply(this, ars);
	}

	Cell.prototype.if = function(cond, then, otherwise) {
		return this.is.call(this, function(flag) {
			return flag ? (existy(then) ? then : true) : (existy(otherwise) ? otherwise : false);
		}, cond);
	}

	Cell.prototype.ifAll = function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift(function() {
			var args = Array.prototype.slice.call(arguments);
			var res = true;
			for (var i = 0; i < args.length; i++) {
				res = res && args[i];
			}
			return res;
		});
		return this.is.apply(this, args);
	}
	Cell.prototype.bindToDOM = function($el) {
		if (this.DOMElement instanceof $) {
			this.DOMElement = this.DOMElement.add($el)
		} else {
			this.DOMElement = $el;
		}
		if (is_valuable(tagName($el))) {
			this.updateDOMElement = function() {
				this.DOMElement.val(this.get());
			}
			drivers['value'].startObserving.apply(this, [$el]);
		} else {
			this.updateDOMElement = Cell.prototype.updateDOMElement;
		}
		this.updateDOMElement();
		return this;
	}

	Cell.prototype.unbindToDOM = function() {
		this.DOMElement = false;
		return this;
	}

	Cell.prototype.updateDOMElement = function() {
		this.DOMElement.html(this.get());
	}

	Cell.prototype.template = function() {
		//console.log('args are', arguments);
		var vars = Array.prototype.slice.call(arguments);
		vars.unshift(function() {
			var obj = {};
			for (var i = 1; i < arguments.length; i++) {
				obj[vars[i + 1]] = arguments[i];
			}
			var html = make_template(obj, arguments[0]);
			return html;
		});
		return this.is.apply(this, vars);
	}
	Cell.prototype.ifAny = function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift(function() {
			var args = Array.prototype.slice.call(arguments);
			var res = false;
			for (var i = 0; i < args.length; i++) {
				res = res || args[i];
			}
			return res;
		});
		return this.is.apply(this, args);
	}

	Cell.prototype.are = function(arr, config) {
		if(arr instanceof Function){// it's a datasource!
			return this.are.call(this, {$datasource: Array.prototype.slice.call(arguments)});			
		}
		var mass = [];
		if (!(arr instanceof List)) {
			var conf = config || {};
			conf.host = this.host;
			conf.selector = this.selector;
			if (arr instanceof Array) {
				mass = arr;
				arr = new Firera.list({}, conf);
			} else {
				arr = new Firera.list(arr, conf);
			}
		}
		obj_join(this, arr);
		arr.setScope(this.DOMElement);
		this.host.setVar(this.getName(), arr);
		for (var i in mass) {
			var element = mass[i] instanceof Object ? mass[i] : {__val: mass[i]};
			arr.push(element);
		}
		arr.rebind();
		return arr;
	}
	
	var typical_compute = function(list, func, listname) {
		var old_val = this.val;
		var new_val = list.count(func);
		for (var i = 0; i < this.modifiers.length; i++) {
			new_val = this.modifiers[i](new_val);
		}
		this.val = new_val;

		if (this.DOMElement) {
			this.updateDOMElement();
		}
		if (this.getScope() && this.driver.setter) {
			this.driver.setter.apply(this, [this.val, this.getElement()]);
		}
		this.change(old_val, this.val);
		this.updateObservers(listname);
		return this;
	}

	Cell.prototype.counts = function(pred, arr) {
		var listname = arr ? arr : pred;
		var func = arr ? pred : false;
		if (!this.host.getVar(listname)) {
			error('Wrong parameter provided(' + listname + ') for counts()');
		}
		var list = this.host.getVar(listname);
		var self = this;
		list.onChangeItem('*', function(){
			self.compute();
		})
		//list.addObserver(this);
		func = get_map_func(func);
		this.compute = typical_compute.bind(this, list, func, listname);
		return this.compute();
	}
	Cell.prototype.force = function() {
		this.compute();
	}

	Cell.prototype.compute = function(name) {
		if (name && this.observables[name]) {
			this.observables[name]--;
			if (this.observables[name] > 0)
				return;
		}
		var args1 = [];
		for (var i = 0; i < this.args.length; i++) {
			args1.push(this.args[i].get());
		}
		var old_val = this.val;
		var new_val = this.formula.apply(this, args1);
		for (var i = 0; i < this.modifiers.length; i++) {
			new_val = this.modifiers[i](new_val);
		}
		this.val = new_val;
		if (this.DOMElement) {
			this.updateDOMElement();
		}
		if (
			this.driver 
			&& this.driver.setter 
			&& (
				this.getScope() 
				|| (
					not_html_but_needs_setter.indexOf(this.getName()) !== -1
				)
			)
		) {
			this.driver.setter.apply(this, [this.val, this.getElement()].concat(this.params));
		}
		this.change(old_val, this.val);
		this.updateObservers(name);
		return this;
	}

	Cell.prototype.depend = function(cells) {
		var arr = (cells instanceof Array) ? cells : [cells];
		for (var i = 0; i < cells.length; i++) {
			this.deps.push(cells[i]);
			if (!(Object.keys(cells[i].observables).length)) {
				this.addObservable(cells[i].getName());
			} else {
				for (var x in cells[i].observables) {
					this.addObservable(x);
				}
			}
			cells[i].addObserver(this);
		}
	}

	Cell.prototype.is = function(f) {
		if (f instanceof Cell) {
			// just link his var to that)
			return this.is.call(this, function(a) {
				return a
			}, f);
		}
		var formula = f;
		if (this.inited) {
			error('Cell already inited!');
			return;
		} else {
			this.inited = true;
		}

		if (formula instanceof Array) {// creating new Firera hash
			//console.log('array is ', formula);
			this.self = Firera.list(formula, {host: this.host});
			return this;
		}
		if (formula instanceof Object && !(formula instanceof Function)) {// creating new Firera hash
			this.self = Firera.hash(formula);
			return this;
		}
		
		var args = Array.prototype.slice.call(arguments, 1);
		if (!args.length) {// is just an another cell
			args[0] = formula;
			formula = function(val) {
				return val;
			};
		}
		if ((args[0] instanceof Array) && !(args[1])) {
			args = args[0];
		}
		for (var i = 0; i < args.length; i++) {
			if (!(args[i] instanceof Cell)) {
				args[i] = this.host.create_cell_or_event(args[i], {dumb: true});
			}
		}
		this.args = args;
		this.formula = formula;

		this.depend(this.args);
		this.free = false;

		if (args.length)
			this.compute();
		return this;
	}
	
	Cell.prototype.change = function(prev_val, new_val) {
		for (var i = 0; i < this.changers.length; i++) {
			this.changers[i].call(this, prev_val, new_val);
		}
		this.host.change(this.getName(), new_val);
	}
	
	Cell.prototype.onChange = function(func) {
		this.changers.push(func);
	}

	var collect_values = function(obj) {
		var res = {};
		for (var i in obj) {
			if(
				reserved_cellnames(i)
				|| 
				(not_html_but_needs_setter.indexOf(i) !== -1)
				|| 
				(i.contains("|"))
			) continue;
			res[i] = obj[i].get();
		}
		return res;
	}
	var collect_names = function(obj) {
		var res = [];
		for (var i in obj) {
			if (i.contains("|")) continue;
			res.push(i);
		}
		return res;
	}

	var make_template = function(obj, templ) {
		for (var i in obj) {
			templ = templ.replace("{" + i + "}", obj[i]);
		}
		return templ;
	}

	var gather_form_values = function(selector, scope, clear) {
		var res = {};
		$(selector + " input", scope).each(function() {
			var val = '';
			switch ($(this).attr('type')) {
				case 'checkbox':
					val = !!$(this).attr('checked');
					break;
				case 'submit':
					return;
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
			res[$(this).attr('name')] = val;
		})
		return res;
	}

	var custom_event_drivers = {
		submit: function(selector, scope, callback) {
			var submitters = $(selector + " input[type=submit]", scope);
			if (submitters.length < 1) {
				submitters = $(selector + " .firera-submitter");
			}
			if (submitters.length === 1) {// ok, binding
				submitters.bind('click', function(e) {
					var hash = gather_form_values(selector, scope, true);
					callback(e, hash);
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

	var Event = function(selector, host) {
		this.host = host;
		this.selector = selector.split("|")[0];
		this.event = selector.split("|")[1];
		this.handlers = [];
		if (this.getScope()) {
			this.rebind('event constructor');
		}
	}

	Event.prototype.getSelector = function() {
		return (this.selector === 'root' ? '' : this.selector);
	}

	Event.prototype.getScope = function() {
		return this.host.getScope();
	}

	Event.prototype.rebind = function() {
		if (custom_event_drivers[this.event]) {
			custom_event_drivers[this.event](this.getSelector(), this.getScope(), this.process.bind(this));
		} else {
			var $el, sel = this.getSelector(), processor = this.process.bind(this);
			// using event delegating!
			if (sel === 'root' || sel === '') {
				this.getScope().on(this.event, processor);
			} else {
				this.getScope().on(this.event, this.getSelector(), processor);
			}
			/*if ($el.length === 0) {
				error('Empty selector for binding: ' + this.getSelector(), this);
			}*/
		}
		return this;
	}

	Event.prototype.process = function(e, initial_val) {
		e.preventDefault();
		var val = initial_val || null;
		for (var i = 0; i < this.handlers.length; i++) {
			var sup = this.host.host || false;
			val = this.handlers[i](this.host, this.host.getName(), sup, val);
			if (val === false) {
				break;
			}
		}
	}

	Event.prototype.getType = function() {
		return 'event';
	}

	Event.prototype.removes = function(pred, list) {
		var arr = list ? list : pred;
		var func = list ? pred : false;
		var mass = this.host(arr);
		this.handlers.push(function() {
			mass.remove(func);
		})
		return this;
	}

	Event.prototype.removesSelf = function() {
		var hash = this.host;
		this.handlers.push(function() {
			hash.host.remove(hash.getName());
		})
		return this;
	}

	Event.prototype.sets = function(cell, val) {
		var cell2 = this.host(cell);
		this.handlers.push(function() {
			cell2.set(val);
		})
		return this;
	}

	Event.prototype.toggles = function(cell, val) {
		var cell2 = this.host(cell);
		this.handlers.push(function() {
			cell2.set(!cell2.get());
		})
		return this;
	}

	Event.prototype.then = function(func) {
		this.handlers.push(func);
		return this;
	}

	Event.prototype.pushTo = function(arr) {
		this.handlers.push(function(self, _, _, val) {
			self(arr).push(val);
		});
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

	var events = ['click', 'submit', 'keyup', 'keydown', 'mouseover', 'focus', 'blur', 'mouseon', 'mouseenter', 'mouseleave', 'keypress', 'dblclick'];


	var get_cell_type = function(cellname) {
		return (cellname.notContains("|") || events.indexOf(cellname.split("|")[1]) === -1)  ? 'cell' : 'event';
	}

	var is_int = function(joe) {
		return Number(joe) == joe;
	}

	var make_window_between_hashes = function(parent, child, config) {
		if(!config) return;
		if (config.takes) {
			if(!(config.takes instanceof Object)){
				config.takes = [config.takes];
			}
			for (var i in config.takes) {
				var varname = isInt(i) ? config.takes[i] : i;
				if(!parent.getVar(config.takes[i])){
					//error('Linking to dumb vars while mixing(takes): ', config.takes[i]);
					//return;
				}
				child(varname).is(parent(config.takes[i]));
			}
		}
		if (config && config.gives) {
			if(!(config.gives instanceof Object)){
				config.gives = [config.gives];
			}
			for (var i in config.gives) {
				var varname = isInt(i) ? config.gives[i] : i;
				if(!child.getVar(config.gives[i])){
					//error('Linking to dumb vars while mixing(gives): ', config.gives[i]);
					//return;
				}
				parent(varname).is(child(config.gives[i]));
			}
		}
	}

	var hash_methods = {
		create_cell_or_event: function(selector, params, dont_check_if_already_exists) {
			if(!selector) error('No selector provided', arguments);
			if(selector.contains('/')){
				var parts = selector.split('/');
				var member = parts[0];
				var host;
				if(member === '..'){// its parent
						if(!this.host){
							error('Could not access parent hash as ', selector); return;
						}
						host = this.host;
						if(this.host.shared = this){
							host = this.host.host;
						}
				} else {
					if(isInt(member)){ // its part of list
						if(this instanceof List && this.list){
							host = this.list[member];
						} else {
							error('Could not access list member as ', selector); return;
						}
					} else {
						if(this instanceof List){
							host = this.shared.getVar(selector);
							//error('Could not access shared member as ', selector); return;
						} else {
							host = this.getVar(selector);
						}
						if(!host) {	
							error('Cound not access cell as', selector); return;
						}
					}
				}
				var tail = parts.slice(1).join('/');
				return host.create_cell_or_event(tail);
			}
			
			
			if (!dont_check_if_already_exists && this.getVar(selector))
				return this.getVar(selector);
			var type = get_cell_type(selector);
			var new_cell = new types[type](selector, this, params);
			this.setVar(selector, new_cell);
			return new_cell;
		},
		getName: function() {
			if(!this.host){ return 'ROOT';};
			if (this.host && this.host.getAllVars && !(this.host instanceof List)) {
				var parent_vars = this.host.getAllVars();
				for (var i = 0; i < parent_vars.length; i++) {
					if (parent_vars[i] === this) {
						return i;
					}
				}
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
				for (var i = 0; i < this.host.list.length; i++) {
					if (this.host.list[i] == this)
						return i;
				}
			}
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
		///// NEW
		getOwnVar: function(name) {
			return this.vars[name];
		},
		getVar: function(name) {
			var vr = this.vars[name];
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
		setVar: function(name, val) {
			this.vars[name] = val;
		},
		getAllVars: function() {
			return this.vars;
		},
		getVarNames: function() {
			return Object.keys(this.vars);
		},
		getScope: function(func) {
			return this.rootElement;
		},
		getType: function() {
			return 'hash';
		},
		setScope: function(scope2) {
			this.scope = scope2;
			return this;
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
		change: function(cellname, new_val) {
			if(this.changers[cellname]){
				for(var j in this.changers[cellname]){
					this.changers[cellname][j](cellname, new_val);
				}
			}
			if(reserved_cellnames(cellname)) return;
			if(this.changers['_all']){
				for(var j in this.changers['_all']){
					this.changers['_all'][j](cellname, new_val);
				}
			}
			if(this.host){
				if(this.host instanceof List){
					this.host.changeItem('update', this.getName(), cellname, new_val);
				}
			}
		},
		onChange: function(func, fields) {
			if(!fields){
				fields = ['_all'];
			}
			for(var i in fields){
				if(this.changers[fields[i]]) this.changers[fields[i]] = [];
				this.changers[fields[i]].push(func);
			}
		}
	}

	var Firera = {
		join: function(a, b){
			var c = {};
			for(var i in a){
				c[i] = a[i];
			}
			for(var i in b){
				c[i] = b[i];
			}
			return c;
		},
		dump: function(hash){
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
		},
		dumpCell: function(cell){
			var res = {val: cell.get(), self: cell};
			res.rootElement = cell.getElement().length ? cell.getElement().get() : false;
			cell.DOMElement && (res.DOMElement = cell.DOMElement.get());
			return res;
		},
		dumpList: function(list){
			var res = {
				rootElement: list.rootElement ? list.rootElement.get() : undefined,
				shared: Firera.dump(list.shared),
				list: []
			};
			for(var i in list.list){
				res.list[i] = Firera.dump(list.list[i]);
			}
			res.changers = list.changers;
			return res;
		},
		hash: function(init_hash, params) {
			var get_context = function() {
			};

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
				var possible_params = ['host', 'linked_hash', 'isSingleVar', 'noTemplateRenderingAllowed', 'config']
				for (var i in possible_params) {
					if (params[possible_params[i]]) {
						self[possible_params[i]] = params[possible_params[i]];
					}
				}
			}
			self.changers = {};
			self.vars = [];
			self.scope = false;

			for (var i in hash_methods) {
				self[i] = hash_methods[i];
			}

			get_context = self.getScope.bind(self);


			//////////////////////////////////////////
			var init_with_hash = function(selector, params) {
				for (var i in selector) {
					if (i === '__setup' || i === '__mixins' || i === 'vars' || i === '$data'){
						continue;
					}
					var cell = self.create_cell_or_event(i, undefined, true);
					var cell_type = cell.getType();
					if(i === 'each'){
						continue;
					}
					if(selector[i] instanceof Object && !(selector[i] instanceof Array) && !(selector[i] instanceof Function)){
						self(i).are(selector[i]);
						continue;
					}
					switch (cell_type) {
						case 'cell':
							if (selector[i] instanceof Array) {
								if (selector[i][0] instanceof Function) {
									cell['is'].apply(cell, selector[i]);
								} else {
									if (!cell[selector[i][0]]) {
										error('Using unknown function:', selector[i], selector);
									}
									cell[selector[i][0]].apply(cell, selector[i].slice(1));
								}
							} else {
								cell.just(selector[i]);
							}
							break;
						case 'event':
							if (selector[i] instanceof Function) {
								cell.then(selector[i]);
							} else {
								if (selector[i] instanceof Array) {
									if (!(selector[i][0] instanceof Array) && !(selector[i][0] instanceof Function)) {
										//selector[i][0] = [selector[i][0]];
										// its some event method
										if(!Event.prototype[selector[i][0]]){
											error('Unknown method for event: ', selector[i]);
										} else {
											Event.prototype[selector[i][0]].apply(cell, selector[i].slice(1));
										}
									} else {
										for (var j = 0; j < selector[i].length; j++) {
											if (selector[i][j] instanceof Function) {
												cell.then(selector[i][j]);
											} else {
												if (selector[i][j] instanceof Array) {
													var func = selector[i][j][0];
													cell[func].apply(cell, selector[i][j].slice(1));
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
							cell.update(selector[i]);
							break;
					}

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
				return true;
			}
			//////////////////////////////////////////
			var init_with_data = function(hash) {
				for (var i in hash) {
					var cell = self.create_cell_or_event(i);
					if (hash[i] instanceof Array) {
						for (var j in hash[i]) {
							if (!(hash[i][j] instanceof Object)) {
								hash[i][j] = {item: hash[i][j]};
							}
						}
						var list = new window[lib_var_name].list({$data: hash[i]}, {host: self});
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
			}

			self.update = function(hash) {
				init_with_hash(hash, self.config);
				if (self.getScope()) {
					self.checkForTemplate().refreshTemplate();
				}
			}

			//////////////////////////////////////////		

			self.setHost = function(host) {
				self.host = host;
			}

			self.unbindToDOM = function() {
				var vars = self.getAllVars();
				for (var i in vars) {
					if (vars[i].unbindToDOM)
						vars[i].unbindToDOM();
				}
				return self;
			}

			self.applyTo = function(selector_or_element) {
				var check = false;
				if(selector_or_element === 'body') check = true;
				if (selector_or_element instanceof Object) {// JQuery object
					self.rootElement = selector_or_element;
				} else {// rare case, only for root objects
					self.rootElement = $(selector_or_element);
				}
				self.unbindToDOM().checkForTemplate().refreshTemplate().attachEventHandlers();
			}

			self.updateVarsBindings = function() {
				if (self.isSingleVar) {
					self.getVar("__item").bindToDOM(this.getScope());
				} else {
					var cell, frs = search_attr_not_nested(self.getScope().get()[0], 'data-fr', true);
					for (var i in frs) {
						if (cell = self.getVar(frs[i].name)) {
							if (cell.bindToDOM) {
								cell.DOMElement = false;
								cell.bindToDOM($(frs[i].el));
							}
						} else {
							//console.log('we coudnt bind var', frs[i].name);
						}
					}
				}
			}

			self.updateMixins = function() {
				for (var context in self.mixins) {
					for (var j in self.mixins[context]) {
						if (context == 'root') {
							self.mixins[context][j].applyTo(self.getScope())
						} else {
							var root = $(context, self.getScope());
							self.mixins[context][j].applyTo(root);
						}
					}
				}
			}

			self.checkForTemplate = function() {
				if (!self.noTemplateRenderingAllowed) {
					var template = $.trim(self.getScope().html());
					self.template_source = 'HTML';
					if (!template) {
						if (!self.getVar('$template') || !self.getVar('$template').get().length) {
							template = generate_default_template(self.getVarNames());
							self.template_source = 'generated';
							self("$template").set(template);
						} else {
							self.template_source = 'props';
						}
					}
				}
				return self;
			}
			
			self.refreshTemplate = function(){
				if(self.getScope()){
					var template = self('$template').get();
					self.getScope().html(template);
					self.updateVarsBindings();
					self.updateDOMBindings();
					self.updateMixins();
				}
				return self;
			}

			self.getRebindableVars = function() {
				var vars = self.getAllVars();
				var res = {};
				if (self.host && self.host.shared) {
					var shared_vars = self.host.shared.getAllVars();
					for (var j in shared_vars) {
						if (!reserved_cellnames(j)) {
							res[j] = shared_vars[j];
						}
					}
				}
				for(var i in vars){
					if(i[0] !== '$'){
						res[i]  = vars[i];
					}
				}
				return res;
			}

			self.updateDOMBindings = function() {
				var vars = self.getRebindableVars();
				for (var i in vars) {
					//if(i == 'root|html') continue;
					if(vars[i] instanceof Event) continue;
					if (vars[i].applyTo) {
						vars[i].applyTo();
					} else {
						vars[i].rebind();
					}
				}
			}
			
			self.attachEventHandlers = function(){
				var vars = self.getRebindableVars();
				for (var i in vars) {
					if(!(vars[i] instanceof Event)) continue;
					vars[i].rebind();
				}
				return self;
			}

			self.remove = function() {
				self.getScope().remove();
				for (var i in self.vars) {
					// unbind each cell
					if (self.vars[i] instanceof Cell) {
						self.vars[i].remove();
					}
				}
				return true;
			}

			self.get = function() {
				return collect_values(self.getAllVars());
			}

			if (init_hash instanceof Function) {
				init_hash = {__setup: init_hash};
			}

			if (init_hash) {
				if (init_hash.$data && (!params || !params.skip_data)) {
					init_with_data(init_hash.$data);
				}
				self.update(init_hash);
			}

			return self;
		},
		list: function(config, data) {
			var self = new List(config, data);// deprecated!
			return self;
		},
		config: function(obj) {
			if (obj.dom_lib)
				$ = obj.dom_lib;
			if (obj.custom_drivers && (obj.custom_drivers instanceof Object)) {
				for (var i in obj.custom_drivers) {
					drivers[i] = obj.custom_drivers[i];
				}
			}
		},
		addPredicate: function(name, func){
			if(Cell.prototype[name]){
				error('Predicate already assigned!'); 
				return;
			}
			Cell.prototype[name] = function(){
				var args = Array.prototype.slice.call(arguments);
				args.unshift(function(){
					var args = Array.prototype.slice.call(arguments);
					var res = func.apply(null, args);
					return res;
				});
				this.is.apply(this, args);
			}
		},
		addHashMethod: function(name, func){
			hash_methods[name] = func;
		},
		addListMethod: function(name, func){
			if(List.prototype[name]){
				error('List method already exists:', name); return;
			}
			List.prototype[name] = function(){
				func.apply(this, arguments);
				return this;
			}
		}
	}

	var List = function(init_hash, config) {
		this.changers = {
			create: [],
			read: [],
			update: [],
			delete: [],
		};
		this.list = [];
		this.each_is_set = false;
		this.each_hash = {};
		this.shared_hash = {};
		this.map_funcs = [];
		this.reduce_funcs = [];
		this.count_funcs = [];
		this.rootElement = false;
		this.shared_config = {host: this, skip_data: true};
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
			config.host && this.setHost(config.host);
			if (config.selector) {
				this.selector = config.selector;
			}
			if(config.autoselect !== undefined){
				this.autoselect = config.autoselect;
			}
		}
		if (init_hash) {
			if (init_hash.each) {
				this.each_is_set = true;
				this.each_hash = init_hash.each;
			}
			if (init_hash.$data) {
				for (var i = 0; i < init_hash.$data.length; i++) {
					this.each_hash.$data = init_hash.$data[i];
					var hash = new window[lib_var_name].hash(this.each_hash, {host: this});
					var counter = this.list.push(hash) - 1;
				}
			}
			// maybe delete .data and .each?
		}
	}
	
	List.prototype.select = function(num){
		if(this.getScope()){
			this.getScope().children().removeClass('selected').slice(num, num+1).addClass('selected');
			this.shared('$selectionNum').set(num);
			this.shared('$selectionData').set(this.list[num] ? this.list[num].get() : {});// !!!!!
		}
	}

	List.prototype.wrapperTag = 'div';

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
			this.each(init_hash.each)
			obj_join(init_hash.each, this.each_hash, true);
		}
	}

	List.prototype.setHost = function(host) {
		this.host = host;
		make_window_between_hashes(this.host, this.shared, this.how_to_share_config);
	}

	List.prototype.getType = function() {
		return 'list';
	}

	List.prototype.setScope = function(re) {
		this.rootElement = re;
		// update template, if not provided previously
		//console.log('scope is', this.getScope());
		var inline_template = this.getScope() ? $.trim(this.getScope().html()) : false;
		this.getScope() && this.getScope().html('');
		if (this.wrapperTag === 'option') {// this is SELECT tag
			this.template_source = 'No template';
			this.shared('$template').just('');
		}
		if (!this.shared.getVar('$template') && inline_template) {
			this.template_source = 'HTML';
			this.shared('$template').just(inline_template);
			this.getScope().html('');
		}
		switch (tagName(re)) {
			case 'ul':
			case 'ol':
			case 'menu':
				this.wrapperTag = 'li';
				break;
			case 'select':
				this.wrapperTag = 'option';
				break;
			default:
				this.wrapperTag = 'div';
				break;
		}
		var self = this;
		$(re).on('click', '.firera-item', function(){
			self.select(re.children().index($(this)));
		})
		return this;
	}

	List.prototype.getScope = function(func) {
		return this.rootElement;
	}

	List.prototype.push = function(obj, nochange) {
		if (obj instanceof Array) {
			for (var i in obj) {
				this.push(obj[i], true)
			}
			this.rebind('push', c);
			this.changeItem('create', c, c+obj.length);
			return;
		}
		if (!(obj instanceof Object)) {
			error('Cant create new hash in list with' + obj + '!!!');
			return;
		}
		var confa = {host: this};
		if (obj.__item) {
			confa.isSingleVar = true;
		}
		var counter = this.list.push(window[lib_var_name].hash(obj, confa)) - 1;
		if (this.each_is_set) {
			this.list[counter].update(this.each_hash);
		}
		if (!nochange) {
			this.rebind('push', counter);
			this.changeItem('create', counter);
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
		this.getScope() && this.getScope().html('');
		return this;
	}

	List.prototype.addOne = function() {
		this.push({});
	}

	List.prototype.getName = function() {
		return this.selector;
	}

	List.prototype.map = function(func) {

	}

	List.prototype.reduce = function(func) {

	}

	List.prototype.remove = function(func, end) {
		if (!func && func !== 0) {
			// Hm... remove all or nothing?
			return;
		}
		if (is_int(func)) {
			if(end && is_int(end) && Number(end) > Number(func)){
				for(var i = Number(func); i <= Number(end); i++){
					this.remove(i);
				}
			}
			this.changeItem('delete', func);
			this.list[func] && this.list[func].remove() && this.list.splice(func, 1);
			return;
		}
		if(func instanceof Object){// it's hash!
			for(var i in this.list){
				if(this.list[i] === func){
					this.list[i].remove() && this.list.splice(i, 1);
				}
			}
			return;
		}
		var f = get_map_func(func);
		for (var i in this.list) {
			if (f.apply(this.list[i].get())) {
				this.changeItem('delete', i);
				this.list[i].remove();
				this.list.splice(i, 1);
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
		//console.log('we are asked', num, 'list is', this.list);
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

	List.prototype.bindToDOM = function($el) {
		if (this.rootElement instanceof $) {
			this.setScope(this.getScope().add($el));
		} else {
			this.setScope($el);
		}
		return this;
	}

	List.prototype.unbindToDOM = function() {

	}

	List.prototype.applyTo = function(selector_or_element, start_index, end_index) {
		if (selector_or_element) {
			if (selector_or_element instanceof $) {
				this.setScope(selector_or_element);
			} else {
				this.setScope($(selector_or_element));
			}
		}
		if (this.getScope()) {
			for (var i in this.list) {
				if ((start_index && i < start_index) || (end_index && i > end_index))
					continue;
				var nested_scope = " > " + this.wrapperTag + ":nth-child(" + (Number(i) + 1) + ")";
				var nested_element = $(nested_scope, this.getScope());
				if (nested_element.length === 0) {
					this.getScope().append('<' + this.wrapperTag + ' class="firera-item"></' + this.wrapperTag + '>');
					nested_element = $(nested_scope, this.getScope());
					if (nested_element.length === 0) {
						error('Still cant bind nested element: ', this.getRoute());
					}
				}
				this.list[i].applyTo(nested_element);
			}
		}
		if(this.autoselect !== undefined){
			this.select(this.autoselect);
		}
		return this;
	}

	List.prototype.rebind = function(msg, start_index, end_index) {
		if (this.getScope()) {
			for (var i in this.list) {
				if ((start_index && i < start_index) || (end_index && i > end_index))
					continue;
				var nested_scope = " > " + this.wrapperTag + ":nth-child(" + (Number(i) + 1) + ")";
				var nested_element = $(nested_scope, this.getScope());
				if (nested_element.length === 0) {
					this.getScope().append('<' + this.wrapperTag + ' class="firera-item"></' + this.wrapperTag + '>');
					nested_element = $(nested_scope, this.getScope());
				}
				if (nested_element.length < 1) {
					error('Cant apply to empty element!', nested_scope, this.getScope());
				}
				this.list[i].applyTo(nested_element);
			}
		}
	}

	List.prototype.updateDOMElement = function() {
		// Do nothing!
	}
	
	List.prototype.changeItem = function(changetype, itemnum, cellname, new_val) {
		for(var i in this.changers[changetype]){
			this.changers[changetype][i](changetype, itemnum, cellname, new_val);
		}
	}
	List.prototype.onChangeItem = function(changetype, func){
		var types = [];
		if(changetype === '*'){
			changetype = 'create, read, update, delete';
		}
		if(changetype.contains(',')){// multiple events
			types = changetype.split(", ");
		} else {
			types = [changetype];
		}
		for(var i in types){
			this.changers[types[i]].push(func);
		}
	}
	
	var filterFields = function(data, fields){
		var res = {};
		for(var i in data){
			if(!fields || fields.indexOf(i) !== -1){
				res[i] = data[i];
			}
		}
		return res;
	}
	
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
			return join_object_attrs(data, getContext());
		};
		var needed_params = {
			
			contextvars: [],
			fields: true,
			idFields: ['id'],
			
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
			deleteMethod: 'DELETE'// HTTP method, default is DELETE
		};
		
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
		
		join_object_attrs(needed_params, params);
		
		// forming params done! Now, attaching handlers...
		
		this.onChangeItem('create', function(_, itemnum){
			var fields = getData('fields');
			var data = filterFields(list.list[itemnum].get(), fields);
			data = getFunc('createRequest')(data);
			$.ajax({
				url: getData('createURL', name, data),
				type: getData('createMethod'),
				data: data,
				success: function(result) {
				    // Do something with the result
				}
			});
		})
		this.onChangeItem('update', function(_, itemnum, field, value){
			var fields = getData('fields');
			var all_data = filterFields(list.list[itemnum].get(), fields);
			
			var req = {};
			req[field] = value;
			var data = getData('getUpdateRequestData', req, all_data, getData('idFields'));
			$.ajax({
				url: getData('updateURL'),
				type: getData('updateMethod'),
				data: data,
				success: function(result) {
				    // Do something with the result
				}
			});
		})
		this.onChangeItem('delete', function(_, itemnum){
			var idFields = getData('idFields');
			var data = {};
			for(var i in idFields){
				data[idFields[i]] = list.list[itemnum](idFields[i]).get();
			}
			data = getFunc('deleteRequest')(data);
			$.ajax({
				url: getData('deleteURL'),
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
					if(isInt(i)){// its array
						dt[contextvars[i]] = list.shared(contextvars[i]).get();
					} else {
						dt[i] = list.shared(contextvars[i]).get();
					}
				}
				var req_config = {
					url: getData('readURL'),
					type: getData('readMethod'),
					data: getData('readRequest', dt),
					success: function(result) {
					    if(result){
						    list.setData(result);
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
					url: getData('readURL'),
					type: getData('readMethod'),
					getRequestHash: getFunc('readRequest')
				});
				list.shared('$datasource').gets.apply(list.shared('$datasource'), contextvars);
			break;
		}
	})

	var lib_var_name = 'Firera';
	if (window[lib_var_name] !== undefined) {
		throw new Exception('Cant assign Firera library, varname already taken: ' + lib_var_name);
	} else {
		window[lib_var_name] = Firera;
	}
})()
