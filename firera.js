(function() {
	/* @todo: unbind previous bindings
	 * var a = frp(function(){}, b, c);
	 * @todo: fix pour() to .prototype - common arrays!
	 * @todo: refactor for(var i = 0;i< this.changers.length;i++){ to for(var i = 0, changer;changer = this.changers[i];i++){
	 * prohibit direct use of |html modifier! Use vars instead!
	 */
	var $ = window['jQuery'] || window['$'] || false;

	var reserved_words = ['datasource', 'template', 'data', 'sync'];

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

	var generate_default_template = function(vars) {
		if (vars.length === 1 && vars[0] === '__item')
			return '';
		var res = [];
		for (var i in vars) {
			if (vars[i].indexOf('|') !== -1)
				continue;
			res.push('<div data-fr="' + vars[i] + '"></div>');
		}
		return res.join('');
	}

	var drivers = {
		cell: {
		},
		datasource: {
			setter: function(val) {
				if (this.host && this.host.host) {// should be a list
					if (!val)
						val = [];
					this.host.host.clear().push(val);
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
			startObserving: function($el) {
				this.set($el.is(":visible"));
			}
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
						$(this).attr('data-value', $.trim($(this).html()))
					}
				});
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
		attr: {
			setter: function(val, $el, atrname) {
				$el.attr(atrname, val);
			}
		}
	}

	var error = function() {
		console.log.apply(console, ['ERROR!'].concat(Array.prototype.slice.call(arguments)));
	}

	var changeble = {
		__init: function() {
			this.changers = [];
		},
		change: function(prev_val, new_val) {
			for (var i = 0; i < this.changers.length; i++) {
				this.changers[i].call(this, prev_val, new_val);
			}
		},
		onChange: function(func) {
			this.changers.push(func);
		}
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

	var Cell = function(selector, host) {
		if (!host) {
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

		var root_element;
		if (this.getScope() && selector.indexOf("|") === -1) {
			if (this.getName() === '__item') {
				root_element = this.getScope();
			} else {
				root_element = $('[data-fr=' + this.getName() + ']', this.getScope());
			}
			if (root_element.length) {
				this.bindToDOM(root_element, this.getName());
			}
		}

		if (selector.indexOf("|") !== -1) {// HTML selector
			// this is a dom selector
			var parts = selector.split("|");
			this.jquerySelector = parts[0];
			if (parts[1].indexOf("(") !== -1) {
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
			switch (this.getName()) {
				case 'datasource':
					this.type = 'datasource';
					this.rebind = function() {
						this.driver.setter.apply(this, [this.val].concat(this.params));
						return this;
					}
					break;
				default:
					this.type = 'cell';
					break;
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
			if (this.observers[i] == cell) {
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

	Cell.prototype.set = function(val) {
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
		this.change(old_val, new_val);
		this.invalidateObservers(this.getName());
		this.updateObservers(this.getName());
		this.host.change();
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
		if (url.indexOf('/') === -1) {// its varname
			args.unshift(url);
			url = false;
			skip_first = true;
		}
		var ars = [function(u) {
				var request_hash = get_request_hash(args);
				var uri = url || u;
				$.getJSON(uri, request_hash, function(data) {
					self.set(data);
				})
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
		arr.rootElement = this.DOMElement;
		this.host.setVar(this.getName(), arr);
		for (var i in mass) {
			var element = mass[i] instanceof Object ? mass[i] : {__item: mass[i]};
			arr.push(element);
		}
		return arr;
	}

	Cell.prototype.counts = function(pred, arr) {
		var listname = arr ? arr : pred;
		var func = arr ? pred : false;
		if (!this.host.getVar(listname)) {
			error('Wrong parameter provided(' + listname + ') for counts()');
		}
		var list = this.host.getVar(listname);
		list.addObserver(this);
		func = get_map_func(func);
		this.compute = function() {
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
		if (this.driver && this.driver.setter && this.getScope()) {
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
			console.dir(this);
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
				args[i] = this.host.create_cell_or_event(args[i]);
			}
		}
		this.args = args;
		this.formula = formula;

		this.depend(this.args);

		if (args.length)
			this.compute();
		return this;
	}

	pour(Cell.prototype, changeble);

	var collect_values = function(obj) {
		var res = {};
		for (var i in obj) {
			if (i.indexOf("|") != -1)
				continue;
			res[i] = obj[i].get();
		}
		return res;
	}
	var collect_names = function(obj) {
		var res = [];
		for (var i in obj) {
			if (i.indexOf("|") != -1)
				continue;
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
				submitters.bind('click', function() {
					var hash = gather_form_values(selector, scope, true);
					callback(hash);
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
			var $el, sel = this.getSelector();
			if (sel === 'root' || sel === '') {
				$el = $(this.getScope());
			} else {
				$el = $(this.getSelector(), this.getScope());
			}
			if ($el.length === 0) {
				error('Empty selector for binding: ' + this.getSelector(), this);
			}
			$el.bind(this.event, this.process.bind(this))
		}
		return this;
	}

	Event.prototype.process = function(initial_val) {
		var val = initial_val || null;
		for (var i = 0; i < this.handlers.length; i++) {
			var sup = this.host.host || false;
			val = this.handlers[i](this.host, this.host._index, sup, val);
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

	var events = ['click', 'submit', 'keyup', 'keydown', 'mouseover', 'focus', 'blur', 'mouseon', 'mouseenter', 'mouseleave', 'keypress', 'dbclick'];


	var get_cell_type = function(cellname) {
		!cellname.indexOf && console.log('we are given', cellname);
		var type = (cellname.indexOf("|") === -1 || events.indexOf(cellname.split("|")[1]) === -1) ? 'cell' : 'event';
		return type;
	}

	var is_int = function(joe) {
		return Number(joe) == joe;
	}

	var make_window_between_hashes = function(parent, child, config) {
		if(!config) return;
		if (config.takes) {
			if(!(config.takes instanceof Array)){
				config.takes = [config.takes];
			}
			for (var i in config.takes) {
				var varname = isInt(i) ? config.takes[i] : i;
				if(varname === 'city'){
					console.log('we set', child(varname), 'to', parent(config.takes[i]), config.takes[i]);
					ololo2 = child(varname);
					ololo = parent;
					ololo3 = child;
				}
				child(varname).is(parent(config.takes[i]));
			}
		}
		if (config && config.gives) {
			if(!(config.gives instanceof Array)){
				config.gives = [config.gives];
			}
			for (var i in config.gives) {
				var varname = isInt(i) ? config.gives[i] : i;
				parent(varname).is(child(config.takes[i]));
			}
		}
	}

	var hash_methods = {
		create_cell_or_event: function(selector, params, dont_check_if_already_exists) {
			if (!dont_check_if_already_exists && this.getVar(selector))
				return this.getVar(selector);
			var type = get_cell_type(selector);
			var new_cell = new types[type](selector, this, params);
			this.setVar(selector, new_cell);
			return new_cell;
		},
		getName: function() {
			if (this.host && this.host.getAllVars && !this._index) {
				var parent_vars = this.host.getAllVars();
				for (var i = 0; i < parent_vars.length; i++) {
					if (parent_vars[i] === self) {
						return i;
					}
				}
				var parent_mixins = this.host.mixins;
				for (var i in parent_mixins) {
					if (parent_mixins[i] === self) {
						return 'mixin-' + i;
					}
				}
				return '?!?';
			} else {
				if (this.host instanceof List) {
					for (var i = 0; i < this.host.list.length; i++) {
						if (this.host.list[i] == this)
							return i;
					}
				}
				if (this._index !== undefined)
					return this._index;
				return '><';
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
			if (!vr && this.linked_hash && (name != 'template')/* && name.indexOf("|") == -1  - hmm, maybe it should be?! */) {
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
	}

	var Firera = {
		hash: function(init_hash, params) {
			if(params && params.linked_hash){
				console.log('WE HAVE linked hash');
			}
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
			self.vars = [];
			self.scope = false;

			for (var i in hash_methods) {
				self[i] = hash_methods[i];
			}

			get_context = self.getScope.bind(self);


			//////////////////////////////////////////
			var init_with_hash = function(selector, params) {
				for (var i in selector) {
					if (i === '__setup' || i === '__mixins' || i === 'each' || i === 'vars' || i === 'data'){
						continue;
					}
					var cell = self.create_cell_or_event(i, undefined, true);
					var cell_type = cell.getType();
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
										selector[i][0] = [selector[i][0]];
									}
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
						var list = new window[lib_var_name].list({data: hash[i]}, {host: self});
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
					self.checkForTemplateAndRender();
					self.updateVarsBindings();
					self.updateDOMBindings();
					self.updateMixins();
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
			}

			self.applyTo = function(selector_or_element) {
				if (selector_or_element instanceof Object) {// JQuery object
					self.rootElement = selector_or_element;
				} else {// rare case, only for root objects
					self.rootElement = $(selector_or_element);
				}
				self.unbindToDOM();
				self.checkForTemplateAndRender();
				self.updateVarsBindings();
				self.updateDOMBindings();
				self.updateMixins();
			}

			self.updateVarsBindings = function() {
				if (self.isSingleVar) {
					self.getVar("__item").bindToDOM(this.getScope());
				} else {
					var cell, frs = search_attr_not_nested(self.getScope().get()[0], 'data-fr', true);
					for (var i in frs) {
						if (cell = self.getVar(frs[i].name)) {
							if (cell.bindToDOM) {
								cell.bindToDOM($(frs[i].el));
							} else {// it's probably event...
								//console.log('No BTD method in', cell);
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

			self.checkForTemplateAndRender = function() {
				if (!self.noTemplateRenderingAllowed) {
					var template = $.trim(self.getScope().html());
					if (!template) {
						if (!self.getVar('template')) {
							template = generate_default_template(self.getVarNames());
							self("template").set(template);
						}
						template = self('template').get();
						self.getScope().html(template);
					}
				}
			}

			self.getRebindableVars = function() {
				var vars = self.getAllVars();
				if (self.host && self.host.shared) {
					var shared_vars = self.host.shared.getAllVars();
					for (var j in shared_vars) {
						if (reserved_words.indexOf(j) === -1) {
							vars[j] = shared_vars[j];
						}
					}
				}
				return vars;
			}

			self.updateDOMBindings = function() {
				var vars = self.getRebindableVars();
				for (var i in vars) {
					//if(i == 'root|html') continue;
					if (vars[i].applyTo) {
						vars[i].applyTo();
					} else {
						vars[i].rebind();
					}
				}
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

			pour(self, changeble);

			self.onChange(function() {
				if (this.host) {
					this.host.change();
				}
			})

			if (init_hash instanceof Function) {
				init_hash = {__setup: init_hash};
			}

			if (init_hash) {
				if (init_hash.data && !params.skip_data) {
					init_with_data(init_hash.data);
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
		}
	}

	var List = function(init_hash, config) {
		this.list = [];
		this.each_is_set = false;
		this.each_hash = {};
		this.shared_hash = {};
		this.map_funcs = [];
		this.reduce_funcs = [];
		this.count_funcs = [];
		this._counter = 0;
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
		this.shared = new Firera.hash(init_hash, this.shared_config);
		if(config) {
			config.host && this.setHost(config.host);
			if (config.selector) {
				this.selector = config.selector;
			}
		}
		if (init_hash) {
			if (init_hash.each) {
				this.each_is_set = true;
				this.each_hash = init_hash.each;
			}
			if (init_hash.data) {
				for (var i = 0; i < init_hash.data.length; i++) {
					this.each_hash.data = init_hash.data[i];
					var hash = new window[lib_var_name].hash(this.each_hash, {host: this});
					this.list[this._counter] = hash;
					this.list[this._counter]._index = this._counter;
					this.list[this._counter].getName = function() {
						return this._index;
					};
					this._counter++;
				}
			}
			// maybe delete .data and .each?
		}
		var self = this;
		this.onChange(function() {
			if (self.updateObservers) {
				self.updateObservers();
			}
		})
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

	List.prototype.getScope = function(func) {
		return this.rootElement;
	}

	List.prototype.push = function(obj, nochange) {
		if (obj instanceof Array) {
			var c = this._counter;
			for (var i in obj) {
				this.push(obj[i], true)
			}
			this.rebind('push', c);
			this.change();
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
		this.list[this._counter] = window[lib_var_name].hash(obj, confa);
		this.list[this._counter]._index = this._counter;
		if (this.each_is_set) {
			this.list[this._counter].update(this.each_hash);
		}
		if (!nochange) {
			this.rebind('push', this._counter);
			this.change();
		}
		this._counter++;
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

	List.prototype.remove = function(func) {
		if (!func && func !== 0) {
			// Hm... remove all or nothing?
			return;
		}
		if (is_int(func)) {
			this.list[func] && this.list[func].remove() && delete this.list[func];
			this.change();
			return;
		}
		var f = get_map_func(func);
		for (var i in this.list) {
			if (f.apply(this.list[i].get())) {
				this.list[i].remove();
				delete this.list[i];
			}
		}
		this.change();
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

	List.prototype.get = function() {
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
			this.rootElement = this.rootElement.add($el);
		} else {
			this.rootElement = $el;
		}
		switch (tagName($el)) {
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
		return this;
	}

	List.prototype.unbindToDOM = function() {

	}

	List.prototype.applyTo = function(selector_or_element, start_index, end_index) {
		if (selector_or_element) {
			if (selector_or_element instanceof Object) {// $el
				this.rootElement = selector_or_element;
			} else {// rare case, only for root objects
				this.rootElement = $(selector_or_element);
			}
		}
		if (this.getScope()) {
			// update template, if not provided previously
			var inline_template = this.getScope() ? $.trim(this.getScope().html()) : false;
			this.getScope().html('');
			if (this.wrapperTag === 'option') {// this is SELECT tag
				this.shared('template').just('');
			}
			if (!this.shared.getVar('template') && inline_template) {
				this.shared('template').just(inline_template);
				this.getScope().html('');
			}

			for (var i in this.list) {
				if ((start_index && i < start_index) || (end_index && i > end_index))
					continue;
				var nested_scope = " > " + this.wrapperTag + "[data-firera-num=" + i + "]";
				var nested_element = $(nested_scope, this.getScope());
				if (nested_element.length === 0) {
					this.getScope().append('<' + this.wrapperTag + ' class="firera-item" data-firera-num="' + i + '"></' + this.wrapperTag + '>');
					nested_element = $(nested_scope, this.getScope());
					if (nested_element.length === 0) {
						error('Still cant bind nested element: ', this.getRoute());
					}
				}
				this.list[i].applyTo(nested_element);
			}
		}
		return this;
	}

	List.prototype.rebind = function(msg, start_index, end_index) {
		if (this.getScope()) {
			for (var i in this.list) {
				if ((start_index && i < start_index) || (end_index && i > end_index))
					continue;
				var nested_scope = " > " + this.wrapperTag + "[data-firera-num=" + i + "]";
				var nested_element = $(nested_scope, this.getScope());
				if (nested_element.length === 0) {
					this.getScope().append('<' + this.wrapperTag + ' class="firera-item" data-firera-num="' + i + '"></' + this.wrapperTag + '>');
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

	pour(List.prototype, changeble);

	var lib_var_name = 'Firera';
	if (window[lib_var_name] !== undefined) {
		throw new Exception('Cant assign Firera library, varname already taken: ' + lib_var_name);
	} else {
		window[lib_var_name] = Firera;
	}
})()
