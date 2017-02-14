(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var PackagePool = require('./PackagePool');
var LinkManager = require('./LinkManager');
var Parser = require('./Parser');
var utils = require('./utils');
var Grid = require("./Grid");
var Obj = utils.Obj;
var Arr = utils.Arr;
var apps = [];
var appIds = 0;
var type_map = {
	'is': 'formula',
	'free': 'free',
	'fake': 'fake'
};

var get_grid_struct = function get_grid_struct(grid) {
	var cells_1 = Object.keys(grid.cell_types);
	var cells_2 = Object.keys(grid.cell_values);
	var cells_3 = Arr.unique(cells_1.concat(cells_2));
	var cells = [];
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = cells_3[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var cell = _step.value;

			var types = void 0,
			    type = void 0;
			if (!grid.cell_types[cell]) {
				// probably, nested cell child
				types = ['free'];
				type = 'free';
			} else {
				types = utils.split_camelcase(grid.cell_types[cell].type);
				type = grid.cell_types[cell].type;
			}
			var props = {};
			var once = false;
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = types[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var subtype = _step2.value;

					if (Parser.system_macros.has(subtype) && subtype !== 'is') {
						props[subtype] = true;
						once = true;
					}
				}
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion2 && _iterator2.return) {
						_iterator2.return();
					}
				} finally {
					if (_didIteratorError2) {
						throw _iteratorError2;
					}
				}
			}

			if (once) {
				type = 'is';
			}
			if (!type_map[type]) {
				console.log('unmapped type!', type);
			}
			type = type_map[type];
			var parents = grid.cell_parents(cell);
			var wrong_links = {};
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = parents[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var cn = _step3.value;

					if (!grid.cellExists(cn)) {
						wrong_links[cn] = true;
					}
				}
			} catch (err) {
				_didIteratorError3 = true;
				_iteratorError3 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion3 && _iterator3.return) {
						_iterator3.return();
					}
				} finally {
					if (_didIteratorError3) {
						throw _iteratorError3;
					}
				}
			}

			var obj = {
				name: cell,
				val: grid.cell_values[cell],
				parents: parents,
				wrong_links: wrong_links,
				type: type,
				props: props
			};
			if (once) {
				obj.subtype = grid.cell_types[cell].type;
			}
			cells.push(obj);
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}

	var by_types = utils.group_by(cells, function (obj) {
		if (obj.name.indexOf('/') !== -1) {
			return 'linked';
		}
		if (obj.name.indexOf('$child') === 0 || obj.name === '$all_children') {
			return 'children';
		}
		if (obj.name.indexOf('|') !== -1) {
			return 'DOM';
		}
		if (obj.name[0] === '$') {
			return 'system';
		}
		if (obj.props.funnel) {
			return 'funnel';
		}
		return obj.type;
	});

	var childs = grid.linked_grids_provider.pool;
	var children = {};
	for (var child_name in childs) {
		if (child_name === '..') continue;
		var child_id = childs[child_name];
		var child = grid.app.getGrid(child_id);
		children[child_name] = get_grid_struct(child);
	}
	for (var celltype in by_types) {
		by_types[celltype].sort(function (a, b) {
			return a.name > b.name ? 1 : -1;
		});
	}
	return {
		children: children,
		cells: by_types
	};
};

var get_app_struct = function get_app_struct(app) {
	return get_grid_struct(app.root);
};

var App = function App(packages, root_package_pool) {
	this.id = ++appIds;
	this.grid_create_counter = 0;
	this.packagePool = new PackagePool(root_package_pool, this.id);
	if (packages) {
		var _iteratorNormalCompletion4 = true;
		var _didIteratorError4 = false;
		var _iteratorError4 = undefined;

		try {
			for (var _iterator4 = packages[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
				var pack = _step4.value;

				this.packagePool.load(pack);
			}
		} catch (err) {
			_didIteratorError4 = true;
			_iteratorError4 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion4 && _iterator4.return) {
					_iterator4.return();
				}
			} finally {
				if (_didIteratorError4) {
					throw _iteratorError4;
				}
			}
		}
	}
	this.grids = {};
	this.gridIds = 0;
	this.linkManager = new LinkManager(this);
};

App.prototype.onChangeFinished = function (cb) {
	if (!this.onChangeFinishedStack) {
		this.onChangeFinishedStack = [];
	}
	this.onChangeFinishedStack.push(cb);
};
App.prototype._changeFinished = function () {
	if (this.onChangeFinishedStack) {
		var _iteratorNormalCompletion5 = true;
		var _didIteratorError5 = false;
		var _iteratorError5 = undefined;

		try {
			for (var _iterator5 = this.onChangeFinishedStack[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
				var cb = _step5.value;

				cb();
			}
		} catch (err) {
			_didIteratorError5 = true;
			_iteratorError5 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion5 && _iterator5.return) {
					_iterator5.return();
				}
			} finally {
				if (_didIteratorError5) {
					throw _iteratorError5;
				}
			}
		}
	}
};

App.prototype.get = function (cell, path) {
	if (path && path[0] === '/') path = path.substr(1);
	return this.root.get(cell, path);
};
App.prototype.getStruct = function () {
	return get_app_struct(this);
};
App.prototype.getVals = function () {
	return get_vals(this.root);
};
App.prototype.getGrid = function (id) {
	return this.grids[id];
};
App.prototype.set = function (cell, val, child) {
	this.root.set(cell, val, child);
};
App.prototype.eachChild = function (parent_grid_id, cb) {
	var grid = this.getGrid(parent_grid_id);
	for (var l in grid.linked_grids) {
		var child = this.getGrid(grid.linked_grids[l]);
		cb(child);
		this.eachChild(grid.linked_grids[l], cb);
	}
};
App.prototype.eachParent = function (grid_id, cb) {
	while (grid_id) {
		var grid = this.getGrid(grid_id);
		cb(grid);
		grid_id = grid.parent;
	}
};

var cb_prot = {
	cell_parents: function cell_parents(cell) {
		return this.cell_types[cell] ? this.cell_types[cell].parents : [];
	},
	cell_children: function cell_children(cell) {
		return this.cell_types[cell] ? this.cell_types[cell].children : {};
	},
	setLevels: function setLevels() {
		var level = 1;
		this.levels = {};
		var max_level = 1;
		var already_set = new Set();
		var pool = [];
		for (var i in this.cell_types) {
			if (this.cell_types[i].parents.length === 0) {
				this.levels[i] = 1;
				for (var j in this.cell_types[i].children) {
					pool.push(j);
					this.setLevelsRec(j, already_set);
				}
			}
		}
		var c = 0;
		while (pool[c]) {
			this.setLevelsIterable(pool[c], pool);
			c++;
		}
	},
	setLevelsIterable: function setLevelsIterable(cellname, pool) {
		var max_level = 1;
		var _iteratorNormalCompletion6 = true;
		var _didIteratorError6 = false;
		var _iteratorError6 = undefined;

		try {
			for (var _iterator6 = this.cell_parents(cellname)[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
				var cell = _step6.value;

				cell = Parser.real_cell_name(cell);
				if (this.levels[cell] === undefined) {
					if (pool.indexOf(cell) === -1) {
						this.setLevelsIterable(cell, pool);
					}
				}
				if (this.levels[cell] > max_level) {
					max_level = this.levels[cell];
				}
			}
		} catch (err) {
			_didIteratorError6 = true;
			_iteratorError6 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion6 && _iterator6.return) {
					_iterator6.return();
				}
			} finally {
				if (_didIteratorError6) {
					throw _iteratorError6;
				}
			}
		}

		if (this.levels[cellname]) {
			if (max_level + 1 > this.levels[cellname]) {
				this.levels[cellname] = max_level + 1;
			}
			return;
		} else {
			this.levels[cellname] = max_level + 1;
		}
		for (var cell in this.cell_children(cellname)) {
			if (pool.indexOf(cell) === -1) {
				pool.push(cell);
				//this.setLevelsRec(cell, already_set);
			}
		}
	},
	setLevelsRec: function setLevelsRec(cellname, already_set) {
		var max_level = 1;
		var _iteratorNormalCompletion7 = true;
		var _didIteratorError7 = false;
		var _iteratorError7 = undefined;

		try {
			for (var _iterator7 = this.cell_parents(cellname)[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
				var cell = _step7.value;

				cell = Parser.real_cell_name(cell);
				//if(cell[0] === '-') debugger;
				if (this.levels[cell] === undefined) {
					//this.setLevelsRec(cell, already_set);
				}
				if (this.levels[cell] > max_level) {
					max_level = this.levels[cell];
				}
			}
		} catch (err) {
			_didIteratorError7 = true;
			_iteratorError7 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion7 && _iterator7.return) {
					_iterator7.return();
				}
			} finally {
				if (_didIteratorError7) {
					throw _iteratorError7;
				}
			}
		}

		if (this.levels[cellname]) {
			if (max_level + 1 > this.levels[cellname]) {
				this.levels[cellname] = max_level + 1;
			}
			for (var cell in this.cell_children(cellname)) {
				if (this.levels[cell] <= this.levels[cellname]) {
					already_set.add(cell);
					this.setLevelsRec(cell, already_set);
				}
				/*if(!(already_set.has(cell))){
    	log('REC 112');
    }*/
			}
			return;
		} else {
			this.levels[cellname] = max_level + 1;
		}
		//console.log('New level for', cellname, 'is', max_level + 1);
		for (var cell in this.cell_children(cellname)) {
			if (!already_set.has(cell)) {
				already_set.add(cell);
				this.setLevelsRec(cell, already_set);
			}
		}
	}
};

App.prototype.parse_cbs = function (a) {
	var eachMixin = Object.assign({}, this.packagePool.eachGridMixin);
	var res = Object.create(cb_prot);
	res.plain_base = Object.assign(eachMixin, a);
	res.side_effects = {};
	res.grids_to_link = {};
	res.no_args_cells = {};

	Parser.parse_pb(res, this.packagePool);
	utils.init_if_empty(res.plain_base, '$init', {}, '$name', null);
	res.cell_types = Parser.parse_cell_types(res.plain_base);
	res.setLevels();
	return res;
};

App.prototype.loadPackage = function (pack) {
	this.packagePool.load(pack);
};

App.prototype.setGrid = function (id, grid) {
	this.grids[id] = grid;
};

App.prototype.branchCreated = function (grid_id) {
	var grid = this.getGrid(grid_id);
	var path = grid.path;
	if (Firera.onBranchCreatedStack[this.id]) {
		var _iteratorNormalCompletion8 = true;
		var _didIteratorError8 = false;
		var _iteratorError8 = undefined;

		try {
			for (var _iterator8 = Firera.onBranchCreatedStack[this.id][Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
				var cb = _step8.value;

				cb(this, grid_id, path, grid.parent);
			}
		} catch (err) {
			_didIteratorError8 = true;
			_iteratorError8 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion8 && _iterator8.return) {
					_iterator8.return();
				}
			} finally {
				if (_didIteratorError8) {
					throw _iteratorError8;
				}
			}
		}
	}
};

App.prototype.createGrid = function (type, link_as, free_vals, parent_id) {
	var parent = this.getGrid(parent_id);
	free_vals = parent.init_values[link_as] ? Object.assign({}, parent.init_values[link_as], free_vals || {}) : free_vals;
	var parent_path = parent.path;
	var path = (parent_path !== '/' ? parent_path + '/' : '/') + link_as;
	var child = new Grid(this, type, link_as, free_vals, true, parent_id, path);
	Firera.gridCreated(this, child.id, child.path, child.parent);
	//child.setLevels();
	return child.id;
};
App.apps = apps;
App.get_app_struct = get_app_struct;
module.exports = App;
},{"./Grid":2,"./LinkManager":3,"./PackagePool":4,"./Parser":5,"./utils":15}],2:[function(require,module,exports){
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Parser = require('./Parser');
var utils = require('./utils');
var Obj = utils.Obj;
var Arr = utils.Arr;

var unusual_cell = function unusual_cell(cellname) {
	return !cellname.match(/^([a-zA-Z0-9\_]*)$/);
};

var create_provider = function create_provider(app, self) {
	return {
		pool: {},
		create: function create(self, type, link_as, free_vals) {
			var child_id = self.app.createGrid(type, link_as, free_vals, self.id);
			utils.init_if_empty(self, 'linked_grids', {}, link_as, child_id);
			this.set(link_as, child_id);
			this.get(link_as).linked_grids_provider.set('..', self.id);
			app.linkManager.onNewGridAdded(self.id, child_id);
			return child_id;
		},
		set: function set(name, grid_id) {
			this.pool[name] = grid_id;
		},
		isLinked: function isLinked(name) {
			return !!this.get(name);
		},
		get: function get(name) {
			var id = this.pool[name];

			return id ? app.grids[id] : false;
		},
		eachChild: function eachChild(cb) {
			for (var child in this.pool) {
				if (child === '..') continue;
				cb(this.pool[child], child);
			}
		},
		remove: function remove(name) {
			var id = this.pool[name];
			delete this.pool[name];
			self.app.grids[id].set('$remove', true);
			delete self.app.grids[id];
		},
		setCellValues: function setCellValues(childName, values, skipsame) {
			this.get(childName).set(values, false, false, false, skipsame);
		},
		initChild: function initChild(name) {
			if (!this.get(name).init) {
				console.log('strange', this, name);
			}
			this.get(name).init();
		},
		unlinkChildCells: function unlinkChildCells(name) {
			var hsh = this.get(name);
			if (!hsh) {
				//console.warn('removing unexisting grid!', name);
				return;
			}
			this.remove(name);
		},
		getLinkedGridCellValue: function getLinkedGridCellValue(gridname, cellname) {
			var grid = this.get(gridname);
			return grid ? grid.cell_value(cellname) : false;
		},
		linkAnyTwoCells: function linkAnyTwoCells(slave, master) {
			if (slave.indexOf('/') !== -1) {
				app.linkManager.initLink(self.id, slave);
			} else {
				add_dynamic_link(self.dynamic_cell_links, slave, '__self', master, 'dynamic');
			}
		}
	};
};

var add_dynamic_link = function add_dynamic_link(pool, cell, grid, slave_cell, type) {
	utils.init_if_empty(pool, cell, {}, grid, []);
	var links = pool[cell][grid];
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = links[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var lnk = _step.value;

			if (lnk.cell_name === slave_cell && lnk.type === type) {
				// already exists
				return;
			}
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}

	links.push({
		cell_name: slave_cell,
		type: type
	});
};

var Grid = function Grid(app, parsed_pb_name, name, free_vals, init_later, parent_id, path) {
	var _this = this;

	var self = this;
	var id = ++app.gridIds;
	//////////////////////////
	//bm.start('init', '2', id);
	this.path = path;
	app.setGrid(id, this);
	this.id = id;
	this.parent = parent_id;
	this.app = app;
	this.name = name || '__root';
	var parsed_pb;
	this.parsed_pb_name = parsed_pb_name;
	if (typeof parsed_pb_name === 'string') {
		parsed_pb = app.cbs[parsed_pb_name];
	} else {
		var key = '$$$_@@@_tag';
		if (parsed_pb_name[key]) {
			parsed_pb = parsed_pb_name[key];
		} else {
			parsed_pb = app.parse_cbs(parsed_pb_name);
			parsed_pb_name[key] = parsed_pb;
		}
	}
	if (!parsed_pb) {
		console.error('Cannot find grid to parse:', parsed_pb_name);
		return;
	}
	this.cell_types = parsed_pb.cell_types;
	this.side_effects = parsed_pb.side_effects;
	this.grids_to_link = parsed_pb.grids_to_link;
	this.plain_base = Object.create(parsed_pb.plain_base);
	this.link_chains = Object.create(parsed_pb.link_chains || {});
	this.levels = Object.create(parsed_pb.levels);
	//this.setLevels();
	this.linked_grids_provider = create_provider(app, self);
	this.linked_grids = {};
	// for "closure" cell type
	this.cell_funcs = {};
	this.dirtyCounter = {};
	this.dynamic_cell_links = {};
	this.dynamic_cells_props = {};
	this.cell_values = Object.assign({}, this.plain_base.$init || {});
	this.init_values = Object.assign({}, this.plain_base.$init, free_vals || {});
	this.asterisk_omit_list = this.all_cell_children('*');
	//////////////////////////
	//bm.stop('init', '2', id);
	//bm.start('init', '1', id);
	Obj.each(this.grids_to_link, function (grid_name, link_as) {
		return _this.linkChild(grid_name, link_as);
	});
	// @todo: refactor, make this set in one step
	//console.log('Setting $init values', this.init_values);
	//////////////////////////
	//bm.stop('init', '1', id);
	//bm.start('init', '3', id);

	if (this.plain_base.$init && !init_later) {
		this.init();
	}
	//////////////////////////
	//bm.stop('init', '3', id);
	//bm.start('init', '4', id);
	if (parsed_pb.no_args_cells) {
		//this.set(parsed_pb.no_args_cells);
		var min_level = Number.POSITIVE_INFINITY;
		var cell_vals = {};
		this.updateTree(parsed_pb.no_args_cells, false, true);
	}
	//////////////////////////
	//bm.stop('init', '4', id);
	//bm.start('init', '5', id);
	if (this.link_chains) {
		for (var link in this.link_chains) {
			this.initLinkChain(link);
		}
	}
	//////////////////////////
	//bm.stop('init', '5', id);
};

Grid.prototype.changesFinished = function () {
	this.app._changeFinished();
};

Grid.prototype.initIfSideEffectCell = function (cell) {
	if (!this.cellExists(cell) && unusual_cell(cell)) {
		Parser.parse_cellname(cell, this, 'getter', this.app.packagePool, this);
		this.cell_types = Parser.parse_cell_types(this.plain_base);
		var matched = Parser.findMatcher(cell, this.app.packagePool);
		if (matched) {
			this.compute(cell);
		}
		// update levels for this new cell
		if (this.cell_types[cell]) {
			var max_level = 0;
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = this.cell_types[cell].parents[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var parent = _step2.value;

					if (this.levels[parent] > max_level) {
						max_level = this.levels[parent];
					}
				}
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion2 && _iterator2.return) {
						_iterator2.return();
					}
				} finally {
					if (_didIteratorError2) {
						throw _iteratorError2;
					}
				}
			}

			this.levels[cell] = max_level + 1;
		}
	}
};

Grid.prototype.hasChild = function (name) {
	return this.linked_grids && this.linked_grids[name];
};

Grid.prototype.init = function () {
	for (var cell in this.init_values) {
		Parser.parse_cellname(cell, this, 'setter', this.app.packagePool);
	}
	this.set(this.init_values);
};
Grid.prototype.updateChildFreeValues = function (childName, values, skipsame) {
	this.linked_grids_provider.setCellValues(childName, values, skipsame);
};

Grid.prototype.initLinkChain = function (link) {
	this.app.linkManager.initLink(this.id, link);
};

Grid.prototype.linkGrid = function (cellname, val) {
	var _this2 = this;

	++this.app.grid_create_counter;
	//log('RUNNING SIDE EFFECT', this, val); 
	var grid, link1, link2, free_vals;
	cellname = cellname.replace("$child_", "");
	if (val instanceof Array) {
		// it's grid and link
		grid = val[0];
		link1 = val[1];
		link2 = val[2];
		free_vals = val[3] || {};
	} else {
		grid = val;
	}
	if (!grid) {
		console.warn('Trying to link undefined grid:', grid);
		return;
	}
	var child_id = this.linkChild(grid, cellname, free_vals);
	if (link1) {
		//console.info('Linking by link1 grid', link1);
		Obj.each(link1, function (his_cell, my_cell) {
			_this2.app.linkManager.initLink(_this2.id, cellname + '/' + his_cell, my_cell);
		});
	}
	if (link2) {
		//console.info('Linking by link2 grid', link2);
		Obj.each(link2, function (his_cell, my_cell) {
			_this2.app.linkManager.initLink(child_id, '../' + his_cell, my_cell);
		});
	}
	--this.app.grid_create_counter;
	//console.log('grid created', this.app.getGrid(child_id).path);
	if (this.app.grid_create_counter === 0) {
		this.app.branchCreated(child_id);
	}
};

Grid.prototype.getChild = function (link_as) {
	return this.app.getGrid(this.linked_grids_provider.pool[link_as]);
};

Grid.prototype.linkChild = function (type, link_as, free_vals) {
	if (this.linked_grids_provider.isLinked(link_as)) {
		var pb = this.getChild(link_as).parsed_pb_name;
		if (pb === type) {
			this.getChild(link_as).set(free_vals);
			return this.linked_grids_provider.pool[link_as];
		} else {
			this.unlinkChild(link_as);
		}
	}
	var id = this.linked_grids_provider.create(this, type, link_as, free_vals);
	this.linked_grids_provider.initChild(link_as);
	return id;
};

Grid.prototype.unlinkChild = function (link_as) {
	this.linked_grids_provider.unlinkChildCells(link_as);
};
Grid.prototype.getChildrenValues = function () {
	var _this3 = this;

	var res = [];
	this.linked_grids_provider.eachChild(function (child, key) {
		res[key] = _this3.app.getGrid(child).cell_values;
	});
	return res;
};

Grid.prototype.doRecursive = function (func, cell, skip, parent_cell) {
	var _this4 = this;

	var already_counted_cells = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
	var run_async = arguments[5];

	var cb = this.doRecursive.bind(this, func);
	if (!skip) {
		//console.log('--Computing cell', this.cell_type(cell));
		func(cell, parent_cell);
		already_counted_cells[cell] = true;
	} else {
		//throw new Error('Skipping!', arguments);
	}
	if (this.cell_has_type(cell, 'async') && !run_async) {
		//console.log('Skipping counting children of async');
		return;
	}
	Obj.eachKey(this.cell_children(cell), function (child_cell_name) {
		if (!already_counted_cells[child_cell_name]) {
			already_counted_cells[child_cell_name] = true, _this4.doRecursive(func, child_cell_name, false, cell, Object.create(already_counted_cells));
		} else {
			//console.error('Circular dependency found!', child_cell_name, already_counted_cells, this);
		}
	});
};

Grid.prototype.compute = function (cell, parent_cell_name) {
	var _this5 = this;

	var real_cell_name = this.real_cell_name(cell);
	var val;
	var props = this.cell_type_props(cell);
	var parents = this.cell_parents(real_cell_name);
	var dynamic = parents.indexOf(parent_cell_name) == -1;
	var func = this.cell_func(real_cell_name);
	var arg_num = this.cell_arg_num(real_cell_name);
	if (props.dynamic && dynamic) {
		var real_props = this.dynamic_cells_props[cell];
		func = real_props.func;
		parents = real_props.parents;
		props = { dynamic: true };
		arg_num = parents.length;
		//console.log('computing dynamic cell val', parents);
	}
	// getting func
	if (props.hasOwnProperty('map') && props.map) {
		if (!parent_cell_name) {
			throw new Error('Cannot calculate map cell value - no parent cell name provided!');
		}
		if (func[parent_cell_name] === undefined) {
			throw new Error('Cannot compute MAP cell: parent cell func undefined or not function!');
		}
		func = func[parent_cell_name];
	} else if (props.closure) {
		if (!this.cell_funcs[real_cell_name]) {
			var new_func = func();
			//console.log('Setting closure function', new_func);
			this.cell_funcs[real_cell_name] = new_func;
		}
		func = this.cell_funcs[real_cell_name];
	}
	// getting arguments
	var args;
	switch (arg_num) {
		case 1:
			args = [this.cell_value(Parser.get_real_cell_name(parents[0]))];
			break;
		case 2:
			args = [this.cell_value(Parser.get_real_cell_name(parents[0])), this.cell_value(Parser.get_real_cell_name(parents[1]))];
			break;
		case 3:
			args = [this.cell_value(Parser.get_real_cell_name(parents[0])), this.cell_value(Parser.get_real_cell_name(parents[1])), this.cell_value(Parser.get_real_cell_name(parents[2]))];
			break;
		case 4:
			args = [this.cell_value(Parser.get_real_cell_name(parents[0])), this.cell_value(Parser.get_real_cell_name(parents[1])), this.cell_value(Parser.get_real_cell_name(parents[2])), this.cell_value(Parser.get_real_cell_name(parents[3]))];
			break;
		default:
			var args = this.cell_parents(real_cell_name).map(function (parent_cell_name) {
				return _this5.cell_value(Parser.get_real_cell_name(parent_cell_name));
			});
			break;
	}
	if (props.funnel) {
		if (!parent_cell_name) {
			throw new Error('Cannot calculate map cell value - no parent cell name provided!');
		}
		parent_cell_name = Parser.get_real_cell_name(parent_cell_name);
		args = [parent_cell_name, this.cell_value(parent_cell_name)];
	}
	if (props.nested) {
		args.unshift(function (cell, val) {
			var cell_to_update = real_cell_name + '.' + cell;
			_this5.set_cell_value(cell_to_update, val);
			_this5.doRecursive(_this5.compute.bind(_this5), cell_to_update, true);
		});
	} else if (props.async) {
		args.unshift(function (val) {
			//console.log('ASYNC callback called!',val); 
			_this5.set_cell_value(real_cell_name, val);
			_this5.doRecursive(_this5.compute.bind(_this5), real_cell_name, true, null, {}, true);
			_this5.changesFinished();
		});
	}
	/*for(var n of args){
 	if(n === Firera.undef){
 		//console.log('UNDEF FOUND!', cell);
 		return;
 	}
 }*/
	// counting value
	if (props.hasOwnProperty('map') && props.map) {
		var val = func instanceof Function ? func(this.cell_value(Parser.get_real_cell_name(parent_cell_name))) : func;
	} else {
		var val;
		switch (args.num) {
			case 1:
				val = func(args[0]);
				break;
			case 2:
				val = func(args[0], args[1]);
				break;
			case 3:
				val = func(args[0], args[1], args[2]);
				break;
			default:
				val = func.apply(null, args);
				break;
		}
	}
	if (val === Firera.noop || val === this.cell_value(real_cell_name) && this.isValue(real_cell_name)) {
		return Firera.noop;
	}
	if (this.isSignal(real_cell_name)) {
		if (!val) {
			return Firera.noop;
		} else {
			val = true;
		}
	}
	if (props.async || props.nested) {} else if (props.dynamic && !dynamic) {
		var fs = Parser.parse_arr_funcstring(val, cell, { plain_base: {} }, this.app.packagePool);
		Parser.parse_cell_type(cell, fs, this.dynamic_cells_props, []);
		parents = this.dynamic_cells_props[cell].parents;
		var _iteratorNormalCompletion3 = true;
		var _didIteratorError3 = false;
		var _iteratorError3 = undefined;

		try {
			for (var _iterator3 = parents[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
				var parent_cell = _step3.value;

				this.linked_grids_provider.linkAnyTwoCells(parent_cell, cell);
			}
		} catch (err) {
			_didIteratorError3 = true;
			_iteratorError3 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion3 && _iterator3.return) {
					_iterator3.return();
				}
			} finally {
				if (_didIteratorError3) {
					throw _iteratorError3;
				}
			}
		}

		this.setLevel(cell, parents.concat(this.cell_parents(real_cell_name)));
		this.compute(cell);
	} else {
		this.set_cell_value(real_cell_name, val);
	}
};

Grid.prototype.get = function (cell, child) {
	if (child) {
		// setting value for some linked child grid
		//log('Trying to set', child, cell, val);
		var path = child.split('/');
		var childname = path[0];
		var child = this.linked_grids_provider.get(childname);
		if (!child) {
			console.warn('Cannot get - no such path', path);
			return Firera.undef;
		}
		var child_path = path[1] ? path.slice(1).join('/') : undefined;
		return child.get(cell, child_path);
	} else {
		var val = this.cell_values[cell];
		return val === undefined ? this.cell_values.hasOwnProperty(cell) ? val : Firera.undef : val;
	}
};

Grid.prototype.setLevel = function (cell, parents) {
	//console.log('got parents', parents);
	var max_level = 0;
	var _iteratorNormalCompletion4 = true;
	var _didIteratorError4 = false;
	var _iteratorError4 = undefined;

	try {
		for (var _iterator4 = parents[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
			var prnt = _step4.value;

			var lvl = this.levels[prnt];
			if (lvl > max_level) {
				max_level = lvl;
			}
		}
	} catch (err) {
		_didIteratorError4 = true;
		_iteratorError4 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion4 && _iterator4.return) {
				_iterator4.return();
			}
		} finally {
			if (_didIteratorError4) {
				throw _iteratorError4;
			}
		}
	}

	this.levels[cell] = max_level + 1;
	//console.log('got max level', max_level);
};

Grid.prototype.updateTree = function (cells) {
	var no_args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
	var compute = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

	var set = Object.keys(cells);
	var start_level = Number.POSITIVE_INFINITY;
	var levels = {};
	for (var cell in cells) {
		if (compute) {
			this.compute(cell);
		}
		if (!no_args) {
			var val1 = compute ? this.cell_values[cell] : cells[cell];
			this.set_cell_value(cell, val1);
		}
		var lvl = this.levels[cell];
		if (lvl < start_level) {
			start_level = this.levels[cell];
		}
		if (!levels[lvl]) {
			levels[lvl] = new Set();
		}
		levels[lvl].add(cell);
	}
	var already = new Set();
	var x = start_level;
	var parents = {};
	while (levels[x] !== undefined) {
		var _iteratorNormalCompletion5 = true;
		var _didIteratorError5 = false;
		var _iteratorError5 = undefined;

		try {
			for (var _iterator5 = levels[x][Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
				var _cell = _step5.value;

				var skip = false;
				var needed_lvl = x + 1;
				var children = this.cell_children(_cell);
				var ct = this.cell_type(_cell);
				if (!this.cell_has_type(_cell, 'free') && (cells[_cell] === undefined || no_args) && this.cell_types[_cell].func) {
					var res = this.compute(_cell, parents[_cell]);
					if (res === Firera.noop) {
						skip = true;
					}
				}
				if (this.cell_has_type(_cell, 'async') || skip) {
					continue;
				}
				for (var child in children) {
					var lvl = this.levels[child];
					if (!levels[lvl]) {
						levels[lvl] = new Set();
					}
					if (!cells[child]) {
						levels[lvl].add(child);
					}
					parents[child] = _cell;
					for (var j = lvl - 1; j > x; j--) {
						if (!levels[j]) {
							levels[j] = new Set();
						}
					}
					if (already.has(child)) {
						console.log('skipping2', child);
						//continue;
					}
				}
			}
		} catch (err) {
			_didIteratorError5 = true;
			_iteratorError5 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion5 && _iterator5.return) {
					_iterator5.return();
				}
			} finally {
				if (_didIteratorError5) {
					throw _iteratorError5;
				}
			}
		}

		x++;
	}
};

Grid.prototype.cellExists = function (cn) {
	cn = Parser.get_real_cell_name(cn);
	return this.cell_values.hasOwnProperty(cn) || this.cell_types.hasOwnProperty(cn) && this.cell_types[cn].type !== 'fake' || this.fake_cells.indexOf(cn) !== -1;
};

Grid.prototype.set = function (cells, val, child, no_args, skipsame) {
	if (child) {
		// setting value for some linked child grid
		var path = child.split('/');
		var childname = path[0];
		var child = this.linked_grids_provider.get(childname);
		if (!child) {
			console.warn('Cannot set - no such path', path);
			return;
		}
		var child_path = path[1] ? path.slice(1).join('/') : undefined;
		child.set(cells, val, child_path);
		return;
	}
	if (!(cells instanceof Object)) {
		var a = {};
		a[cells] = val;
		cells = a;
	}
	if (skipsame) {
		//console.log('SLI{DAME');
		var res = {};
		for (var cellname in cells) {
			if (this.cell_value(cellname) === cells[cellname]) {
				// skip
				//console.log('skip', cellname, cells[cellname]);
			} else {
				res[cellname] = cells[cellname];
			}
		}
		cells = res;
	}
	this.updateTree(cells, no_args);
};

Grid.prototype.set2 = function (cell, val, child) {
	var _this6 = this;

	if (child) {
		// setting value for some linked child grid
		//log('Trying to set', child, cell, val);
		var path = child.split('/');
		var childname = path[0];
		var child = this.linked_grids_provider.get(childname);
		if (!child) {
			console.warn('Cannot set - no such path', path);
			return;
		}
		var child_path = path[1] ? path.slice(1).join('/') : undefined;
		child.set(cell, val, child_path);
		return;
	}
	if (cell instanceof Object) {
		// batch update
		//console.log('Computing batch update', cell);
		cell.eachKey(function (key) {
			_this6.force_set(key, cell[key], true);
			_this6.doRecursive(function (cell) {
				_this6.dirtyCounter[cell] ? _this6.dirtyCounter[cell]++ : _this6.dirtyCounter[cell] = 1;
			}, key);
		});
		//console.log('dirty counter', this.dirtyCounter);
		cell.eachKey(this.doRecursive.bind(this, function (cell2, parent_cell_name) {
			if (--_this6.dirtyCounter[cell2] === 0 && cell[cell2] === undefined) {
				//console.log('Computing after batch change', cell2, cell);
				_this6.compute(cell2, parent_cell_name);
				//} else {
				//console.log('Cell ', cell2, 'is not ready', this.dirtyCounter[cell2]);
			}
		}));
	} else {
		//console.log('SETT', arguments);
		//console.log('Setting cell value', cell, val);
		if (!this.cell_type(cell) === 'free') {
			throw Exception('Cannot set dependent cell!');
		}
		this.force_set(cell, val);
		//this.doRecursive(this.compute.bind(this), cell);
		//console.log('Cell values after set', this.cell_values);
	}
};
Grid.prototype.force_set = function (cell, val, omit_updating_children) {
	var _this7 = this;

	this.set_cell_value(cell, val);
	if (omit_updating_children) return;
	Obj.eachKey(this.cell_children(cell), function (child_cell_name) {
		_this7.doRecursive(_this7.compute.bind(_this7), child_cell_name, false, cell);
	});
};
Grid.prototype.cell_parents = function (cell) {
	return this.cell_types[cell] ? this.cell_types[cell].parents : [];
};
Grid.prototype.cell_arg_num = function (cell) {
	return this.cell_types[cell] ? this.cell_types[cell].arg_num : 0;
};
Grid.prototype.cell_children = function (cell) {
	return this.cell_types[cell] ? this.cell_types[cell].children : {};
};
Grid.prototype.all_cell_children = function (cell, arr) {
	var _this8 = this;

	if (!this.cell_types[cell]) {
		return [];
	}
	arr = arr || [];
	Obj.eachKey(this.cell_types[cell].children, function (cl) {
		arr.push(cl);
		_this8.all_cell_children(cl, arr);
	});
	return arr;
};
Grid.prototype.cell_func = function (cell) {
	var a;
	if (a = this.cell_types[cell].func) {
		return a;
	} else {
		throw new Error('Cannot find cell func for cell ' + cell);
	}
};
Grid.prototype.cell_type = function (cell) {
	return this.cell_types[cell] ? this.cell_types[cell].type : [];
};
Grid.prototype.cell_has_type = function (cell, type) {
	var types = this.cell_types[cell];
	if (types) {
		return types.props[type];
	} else {
		return false;
	}
};
Grid.prototype.cell_type_props = function (cell) {
	return this.cell_types[cell] ? this.cell_types[cell].props : {};
};
Grid.prototype.isValue = function (real_cell_name) {
	return this.cell_types[real_cell_name].additional_type === '=';
};
Grid.prototype.isSignal = function (real_cell_name) {
	return this.cell_types[real_cell_name].additional_type === '~';
};
Grid.prototype.real_cell_name = function (cell) {
	return this.cell_types[cell] ? this.cell_types[cell].real_cell_name : {};
};
Grid.prototype.fake_cells = ['$real_keys', '$real_values', '$path', '$app_id', '$name'];
Grid.prototype.cell_value = function (cell) {
	var _this9 = this;

	switch (cell) {
		case '$real_keys':
			return [].concat(_toConsumableArray(new Set(Object.keys(this.plain_base).concat(Object.keys(this.plain_base.$init))))).filter(function (k) {
				return k.match(/^(\w|\d|\_|\-)*$/);
			});
			break;
		case '$real_values':
			var res = {};
			Obj.each([].concat(_toConsumableArray(new Set(Object.keys(this.cell_values).concat(Object.keys(this.init_values))))).filter(function (k) {
				return k.match(/^(\w|\d|\_|\-)*$/);
			}), function (k, v) {
				res[k] = _this9.cell_value(k);
			});
			return res;
			break;
		case '$path':
			return this.path;
			break;
		case '$app_id':
			return this.app.id;
			break;
		case '$name':
			return this.name;
			break;
		default:
			if (this.cell_values.hasOwnProperty(cell)) {
				return this.cell_values[cell];
			} else {
				return Firera.undef;
				//return this.cell_values[cell];
			}
	}
};
Grid.prototype.set_cell_value = function (cell, val) {
	var _this10 = this;

	var same_song = val === this.cell_values[cell];
	this.cell_values[cell] = val;
	if (this.side_effects[cell]) {
		if (!Parser.side_effects[this.side_effects[cell]]) console.info('I SHOULD SET side-effect', cell, this.side_effects[cell], Parser.side_effects);
		Parser.side_effects[this.side_effects[cell]].func.call(this, cell, val);
		//console.log('Child', real_cell_name, 'val is', val);
	}
	//if(cell === 'text' || cell === '*') console.log('Set cell value', cell, val, this.dynamic_cell_links[cell]);
	if (this.cell_types['*'] && cell !== '*' && this.asterisk_omit_list.indexOf(cell) === -1) {
		this.set('*', [cell, val]);
	}
	if (this.dynamic_cell_links[cell]) {
		Obj.each(this.dynamic_cell_links[cell], function (links, grid_name) {
			var own = grid_name === '__self';
			var hsh = own ? _this10 : _this10.linked_grids_provider.get(grid_name);
			//console.log('Updating dynamic cell links for cell', cell, links, grid_name, this.linked_grids_provider, hsh);
			if (hsh) {
				var _iteratorNormalCompletion6 = true;
				var _didIteratorError6 = false;
				var _iteratorError6 = undefined;

				try {
					for (var _iterator6 = links[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
						var link = _step6.value;

						//console.log('Writing dynamic cell link ' + link.cell_name, link.type === 'val', this.name);
						if (link.type === 'val') {
							hsh.set(link.cell_name, val);
						} else if (link.type === 'dynamic') {
							hsh.compute(link.cell_name, cell);
						} else {
							//log('Updating links', grid_name, link.cell_name, [grid_name !== '__self' ? this.name : cell, val]);
							hsh.set(link.cell_name, [own ? cell : _this10.name, val]);
						}
					}
				} catch (err) {
					_didIteratorError6 = true;
					_iteratorError6 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion6 && _iterator6.return) {
							_iterator6.return();
						}
					} finally {
						if (_didIteratorError6) {
							throw _iteratorError6;
						}
					}
				}
			}
		});
	}
	this.app.linkManager.checkUpdate(this.id, cell, val);
};

module.exports = Grid;
},{"./Parser":5,"./utils":15}],3:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var LinkManager = function LinkManager(app) {
	this.app = app;
	this.links = [];
	this.linkStruct = {};
	this.workingLinks = {};
	this.pointers = {};
	this.doubleAsterisk = {};
	this.pathToId = {};
};

LinkManager.prototype.onNewGridAdded = function (parent_grid_id, child_id) {
	var child_path = this.app.getGrid(child_id).path;
	//console.log('new grid added to', parent_grid_id, 'as', child_id, child_path);
	// add doubleAsterisk links
	for (var path in this.doubleAsterisk) {
		if (child_path.indexOf(path) === 0) {
			// it's a child of master grid
			for (var cellname in this.doubleAsterisk[path]) {
				this.addWorkingLink(child_id, cellname, this.pathToId[path], '**/' + cellname, '**', child_path);
			}
		}
	}
	//
	for (var link_id in this.pointers[parent_grid_id]) {
		this.actualizeLink(link_id, child_id);
	}
};

LinkManager.prototype.refreshPointers = function (link_id) {
	for (var grid_id in this.pointers) {
		var links = this.pointers[grid_id];
		for (var i in links) {
			if (links[i] == link_id) {
				links.splice(i, 1);
			}
		}
	}
	var data = this.links[link_id];
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = data.pointers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var pointer = _step.value;

			utils.init_if_empty(this.pointers, pointer.grid_id, {}, link_id, data.path[pointer.pos]);
			//log('considering pointer', link_id, data.str, pointer);
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}
};

LinkManager.prototype.checkUpdate = function (master_grid_id, master_cell, val) {
	if (this.workingLinks[master_grid_id] && this.workingLinks[master_grid_id][master_cell]) {
		if (val === undefined) {
			val = this.app.getGrid(master_grid_id).get(master_cell);
		}
		if (val === Firera.undef) {
			return;
		}
		var lnks = this.workingLinks[master_grid_id][master_cell];
		for (var slave_grid_id in lnks) {
			for (var slave_cellname in lnks[slave_grid_id]) {
				var cell_val = val;
				if (lnks[slave_grid_id] && lnks[slave_grid_id][slave_cellname]) {
					var link_data = lnks[slave_grid_id][slave_cellname];
					if (link_data.link_id === '**') {
						cell_val = [cell_val, link_data.path];
					} else {
						var data = this.links[link_data.link_id];
						if (data) {
							for (var i = data.path.length - 1; i > -1; i--) {
								if (data.path[i] === '*') {
									//console.log('A', i, data.path, link_data.path[i+1]);
									cell_val = [link_data.path[i + 1], cell_val];
								}
							}
						}
					}
				}
				// the very meaning of this method
				var slave_grid = this.app.getGrid(slave_grid_id);
				if (!slave_grid) {
					var lnk = this.links[link_data.link_id];
					//log('obsolete link!', lnk);
				} else {
					//log('!set', slave_cellname, cell_val);
					slave_grid.set(slave_cellname, cell_val);
				}
			}
		}
	}
};

LinkManager.prototype.addWorkingLink = function (master_grid_id, master_cellname, slave_grid_id, slave_cellname, link_id, path) {
	utils.init_if_empty(this.workingLinks, master_grid_id, {}, master_cellname, {}, slave_grid_id, {}, slave_cellname, { link_id: link_id, path: path });
	//this.app.getGrid(slave_grid_id).set(slave_cellname, val);
	this.app.getGrid(master_grid_id).initIfSideEffectCell(master_cellname);
	this.checkUpdate(master_grid_id, master_cellname);
};

LinkManager.prototype.actualizeLink = function (link_id, first_child_id) {
	var _this = this;

	var gridname, current_pointer;
	var data = this.links[link_id];
	var curr_grid_id = data.grid_id,
	    curr_grid;

	var move_further = function move_further(curr_grid_id, i, start_pos, path) {
		if (!path) debugger;
		path = path.slice();
		var curr_grid = _this.app.getGrid(curr_grid_id);
		if (path.indexOf(curr_grid.name) !== -1) {
			//console.log('hm', path, curr_grid.name);
		} else {
			path.push(curr_grid.name);
		}
		var gridname = data.path[i];
		var next_grid_id;
		if (!data.path[i + 1]) {
			//log('~~~ success!', data.str, path);
			// its cellname
			if (!data.pointers[start_pos].fixed) {
				data.pointers.splice(start_pos, 1);
			}
			_this.addWorkingLink(curr_grid_id, gridname, data.grid_id, data.slave_cellname, link_id, path);
			return;
		}

		if (gridname === '..') {
			// looking for parent
			next_grid_id = curr_grid.parent;
		} else if (gridname === '*') {
			// all children
			if (i === current_pointer.pos) {
				if (first_child_id !== undefined) {
					//log('--- checking first child', data.str, link_id, first_child_id);
					move_further(first_child_id, i + 1, start_pos, path);
				} else {
					data.pointers[start_pos].fixed = true;
					data.pointers[start_pos].grid_id = curr_grid_id;
					//log('--- what to do then?', link_id, 1, curr_grid.linked_grids);
					for (var child_name in curr_grid.linked_grids) {
						var child_id = curr_grid.linked_grids[child_name];
						move_further(child_id, i + 1, start_pos, path);
					}
				}
			} else {
				//log('--- remove old pointer', link_id, data.str, i, data.pointers[start_pos].fixed);
				// remove old pointer
				if (!data.pointers[start_pos].fixed) {
					data.pointers.splice(start_pos, 1);
				}
				data.pointers.push({
					pos: i,
					grid_id: curr_grid_id,
					fixed: true,
					path: path
				});
				for (var child_name in curr_grid.linked_grids) {
					var child_id = curr_grid.linked_grids[child_name];
					move_further(child_id, i + 1, start_pos, path);
				}
				return;
			}
		} else {
			if (curr_grid.linked_grids && curr_grid.linked_grids[gridname] !== undefined) {
				next_grid_id = curr_grid.linked_grids[gridname];
			} else {
				//console.log('_____________ NOT FOUND');
				return;
			}
		}
		if (next_grid_id !== undefined) {
			move_further(next_grid_id, i + 1, start_pos, path);
		}
	};

	for (var pointer_index in data.pointers) {
		var current_pointer = data.pointers[pointer_index];
		move_further(current_pointer.grid_id, current_pointer.pos, pointer_index, current_pointer.path);
	}
	this.refreshPointers(link_id);
};

LinkManager.prototype.initLink = function (grid_id, link, slave_cellname) {
	var _this2 = this;

	var path = link.split('/');
	if (path.length == 2 && path[0] === '..') {
		/*var curr_grid = this.app.getGrid(grid_id);
  var parent = curr_grid.parent;
  if(parent === undefined) {
  	console.log('parent undefined! child', curr_grid);
  	return;
  }
  this.addWorkingLink(parent, path[1], curr_grid.id, link);
  //console.log('Simple!', link, parent);
  //ttimer.stop('ilc');
  return;*/
	}
	if (path[0] == '**') {
		if (path.length > 2) {
			console.error('You cannot listen to such path', path.join('/'));
			return;
		}
		var cellname = path[1];
		var grid_path = this.app.getGrid(grid_id).path;
		this.pathToId[grid_path] = grid_id;
		utils.init_if_empty(this.doubleAsterisk, grid_path, {}, cellname, true);
		// check already added grids
		this.app.eachChild(grid_id, function (child) {
			_this2.addWorkingLink(child.id, cellname, grid_id, '**/' + cellname, '**', child.path);
		});
		return;
	}
	if (path[0] == '^^') {
		if (path.length > 2) {
			console.error('You cannot listen to such path', path.join('/'));
			return;
		}
		var cellname = path[1];
		this.app.eachParent(grid_id, function (grid) {
			_this2.addWorkingLink(grid.id, cellname, grid_id, '^^/' + cellname);
		});
		return;
	}
	if (path[0] == '') {
		if (path.length > 2) {
			console.error('You cannot listen to such path', path.join('/'));
			return;
		}
		var cellname = path[1];
		var grid_path = this.app.getGrid(grid_id).path;
		this.addWorkingLink(this.app.grids[1].id, cellname, grid_id, '/' + cellname);
		return;
	}
	var obj = {
		path: path,
		target: path[path.length - 1],
		pointers: [{
			pos: 0,
			path: [],
			grid_id: grid_id,
			fixed: false
		}],
		str: link,
		slave_cellname: slave_cellname || link,
		grid_id: grid_id,
		status: null
	};
	utils.init_if_empty(this.linkStruct, grid_id, {});
	if (this.linkStruct[grid_id][link] == undefined) {
		var link_id = this.links.push(obj) - 1;
		this.linkStruct[grid_id][link] = link_id;
		this.actualizeLink(link_id);
	} else {
		this.actualizeLink(this.linkStruct[grid_id][link]);
	}
	//ttimer.stop('ilc');
};

module.exports = LinkManager;
},{"./utils":15}],4:[function(require,module,exports){
'use strict';

var utils = require('./utils');

var kcopy = function kcopy(from, to) {
	for (var i in from) {
		to[i] = from[i];
	}
};
var PackagePool = function PackagePool() {
	var proto = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	var app_id = arguments[1];

	this.app_id = app_id;
	this.cellMatchers = Object.assign({}, proto.cellMatchers);
	this.macros = Object.assign({}, proto.macros);
	this.eachGridMixin = Object.assign({}, proto.eachGridMixin);
};
PackagePool.prototype.load = function (pack) {
	if (typeof pack === 'string') {
		if (!Firera.packagesAvailable[pack]) {
			console.error('Package not found!', pack);
			return;
		}
		pack = Firera.packagesAvailable[pack];
	}
	kcopy(pack.cellMatchers, this.cellMatchers);
	kcopy(pack.macros, this.macros);
	if (pack.eachGridMixin) {
		// update the mixin for each grid created
		Object.assign(this.eachGridMixin, pack.eachGridMixin);
	}
	if (pack.onGridCreated) {
		utils.init_if_empty(Firera.onGridCreatedStack, this.app_id, []);
		Firera.onGridCreatedStack[this.app_id].push(pack.onGridCreated);
	}
	if (pack.onBranchCreated) {
		utils.init_if_empty(Firera.onBranchCreatedStack, this.app_id, []);
		Firera.onBranchCreatedStack[this.app_id].push(pack.onBranchCreated);
	}
};
module.exports = PackagePool;
},{"./utils":15}],5:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var utils = require('./utils');
var Obj = utils.Obj;
var Arr = utils.Arr;

var system_macros = new Set(['is', 'async', 'closure', 'funnel', 'dynamic', 'nested']);

var get_random_name = function () {
	// temp solution for Symbol
	var c = 1;
	return function () {
		return '@@@_' + ++c;
	};
}();

var err = function err(text) {
	console.error(text);
};

var predefined_functions = {
	'=': {
		type: 'func',
		func: function func(a, b) {
			return a == b;
		}
	},
	'==': {
		type: 'func',
		func: function func(a, b) {
			return a === b;
		}
	},
	'!=': {
		type: 'func',
		func: function func(a, b) {
			return a != b;
		}
	},
	'!==': {
		type: 'func',
		func: function func(a, b) {
			return a !== b;
		}
	},
	'+': {
		type: 'func',
		func: function func(a, b) {
			return (a ? Number(a) : 0) + (b ? Number(b) : 0);
		}
	},
	'-': {
		type: 'func',
		func: function func(a, b) {
			return Number(a) - Number(b);
		}
	},
	'*': {
		type: 'func',
		func: function func(a, b) {
			return a * b;
		}
	},
	'/': {
		type: 'func',
		func: function func(a, b) {
			return a / b;
		}
	},
	'%': {
		type: 'func',
		func: function func(a, b) {
			return a % b;
		}
	},
	'$': {
		type: 'func',
		func: function func(a, b) {
			console.log('Searching selector', b, 'in', a);
			return a.find(b);
		}
	}
};

var real_cell_name = function real_cell_name(str) {
	return str.replace(/^(\:|\-|\=|\~)/, '');
};

var findMatcher = function findMatcher(cellname, packages) {
	for (var n in packages.cellMatchers) {
		var m = packages.cellMatchers[n];
		var matches = cellname.match(m.regexp);
		if (matches) {
			return [m, matches];
		}
	}
};

var cell_listening_type = function cell_listening_type(str) {
	if (!str.match) debugger;
	var m = str.match(/^(\:|\-|\=)/);
	return [{
		//':': 'change', 
		'=': 'skip_same',
		'-': 'passive',
		'val': 'normal'
	}[m ? m[1] : 'val'], str.replace(/^(\:|\-|\=)/, '')];
};

var get_cell_type = function get_cell_type(cellname, type, func, parents, additional_type) {
	//console.log('getting cell type', arguments);
	var real_cell_types = utils.split_camelcase(type) || [];

	var closure = real_cell_types.indexOf('closure') !== -1;
	var async = real_cell_types.indexOf('async') !== -1;
	var nested = real_cell_types.indexOf('nested') !== -1;
	var funnel = real_cell_types.indexOf('funnel') !== -1;
	var dynamic = real_cell_types.indexOf('dynamic') !== -1;
	if (async && nested || dynamic && nested) {
		err('Incompatible cell types: ' + real_cell_types.join(', '));
	}
	return {
		type: type,
		additional_type: additional_type,
		func: func,
		props: { closure: closure, async: async, nested: nested, funnel: funnel, dynamic: dynamic },
		real_cell_name: cellname.replace(/^(\:|\-)/, ''),
		parents: parents || [],
		arg_num: parents ? parents.length : 0,
		children: []
	};
};

var parse_cell_type = function parse_cell_type(i, row, pool, children) {
	var additional_type;
	if (i !== get_real_cell_name(i)) {
		additional_type = i[0];
		i = get_real_cell_name(i);
	}
	var cell_types = pool;
	var type = 'free';
	if (i === '$children') {
		return;
	}
	if (i === '$init') {
		for (var j in row) {
			cell_types[j] = get_cell_type(i, type);
		}
		//console.log('now cell_types j looks like', cell_types);
		return;
	}
	if (!(row instanceof Array)) {
		cell_types[i] = get_cell_type(i, type);
		return;
	}
	var func = row[0];
	var parents = row.slice(1);
	if (func instanceof Function) {
		// regular sync cell
		type = 'is';
	} else {
		// may be 'async', 'changes' or something else
		type = func;
		func = parents.shift();
	}
	cell_types[i] = get_cell_type(i, type, func, parents, additional_type);
	for (var j in parents) {
		var _cell_listening_type = cell_listening_type(parents[j]),
		    _cell_listening_type2 = _slicedToArray(_cell_listening_type, 2),
		    listening_type = _cell_listening_type2[0],
		    parent_cell_name = _cell_listening_type2[1];

		if (listening_type !== 'passive') {
			utils.init_if_empty(children, parent_cell_name, {});
			children[parent_cell_name][i] = true;
		} else {
			//console.info('Omit setting', i, 'as child for', parent_cell_name, ' - its passive!');
		}
	}
};

var parse_cell_types = function parse_cell_types(pbs) {
	var cell_types = {};
	var children = {};
	//console.log('PBS', pbs);
	var already = {};
	for (var i in pbs) {
		var rc = get_real_cell_name(i);
		if (already[rc]) continue;
		parse_cell_type(i, pbs[i], cell_types, children);
		already[rc] = true;
	}
	for (var cellname in children) {
		if (!cell_types[cellname]) {
			var r_type = utils.is_special(cellname) ? 'free' : 'fake';
			cell_types[cellname] = get_cell_type(cellname, r_type);
		}
		cell_types[cellname].children = children[cellname];
	}
	//console.log('Parsed cell types', cell_types);
	return cell_types;
};

var parse_arr_funcstring = function parse_arr_funcstring(a, key, pool, packages) {
	var funcstring;
	a = a.slice();
	var funcname = a[0];
	if (packages.macros.hasOwnProperty(funcname)) {
		a = packages.macros[funcname](a.slice(1));
		funcname = a[0];
		a = a.slice();
	}
	if (!funcname) {
		console.error('wrong func:', funcname);
	}
	var cc = utils.split_camelcase(funcname);
	if (a.length === 1 && typeof a[0] === 'string') {
		funcstring = ['is', utils.id, a[0]];
	} else {
		if (funcname instanceof Function) {
			// it's "is" be default
			funcstring = ['is'].concat(a);
		} else if (system_macros.has(cc[0])) {
			switch (funcname) {
				case 'nested':
					var dependent_cells = a[2].map(function (cellname) {
						return key + '.' + cellname;
					});
					utils.init_if_empty(pool.plain_base, '$init', {});
					Obj.each(dependent_cells, function (name) {
						pool.plain_base.$init[name] = null;
					});
					a.splice(2, 1);
					funcstring = a;
					break;
				default:
					funcstring = a;
					break;
			}
		} else {
			if (funcname === 'just') {
				utils.init_if_empty(pool.plain_base, '$init', {});
				pool.plain_base.$init[key] = a[1];
				return;
			} else {
				if (predefined_functions[funcname]) {
					var fnc = predefined_functions[funcname];
					switch (fnc.type) {
						case 'func':
							funcstring = ['is', fnc.func].concat(a.slice(1));
							break;
					}
				} else {
					throw new Error('Cannot find predicate: ' + funcname, a);
				}
			}
		}
	}
	return funcstring;
};

var side_effects = {
	'child': {
		func: function func(cellname, val, type) {
			if (val) {
				this.linkGrid(cellname, val);
			}
			if (val === false) {
				var link_as = cellname.replace('$child_', '');
				this.unlinkChild(link_as);
			}
		},
		regexp: /^\$child\_/
	},
	children: {
		regexp: /^\$all\_children$/,
		func: function func(__, deltas) {
			var _this = this;

			if (!deltas || !(deltas instanceof Object)) {
				return;
			}
			Obj.eachKey(deltas, function (k) {
				if (!deltas[k]) return;

				var _deltas$k = _slicedToArray(deltas[k], 4),
				    type = _deltas$k[0],
				    key = _deltas$k[1],
				    gridname = _deltas$k[2],
				    free_vals = _deltas$k[3];

				switch (type) {
					case 'remove':
						_this.unlinkChild(key);
						break;
					case 'add':
						_this.linkGrid(key, [gridname, null, null, free_vals]);
						break;
					case 'change':
						_this.updateChildFreeValues(key, free_vals, true);
						break;
					default:
						throw new Error('Unknown action: ' + type);
						break;
				}
			});
		}
	}
};

var get_real_cell_name = function get_real_cell_name(str) {
	return str[0] === '-' ? str.slice(1) : str[0] === '=' ? str.slice(1) : str[0] === '~' ? str.slice(1) : str;
};

var parse_cellname = function parse_cellname(cellname, pool, context, packages, isDynamic) {
	if (cellname.indexOf('/') !== -1) {
		//console.log('Found cellname', cellname);
		// it's a path - link to other grids
		var path = cellname.split('/');
		//console.log('Found', cellname, 'in', pool);
		if (!pool.initLinkChain) {
			utils.init_if_empty(pool, 'link_chains', {}, cellname, path);
		} else {
			pool.initLinkChain(cellname);
		}
		return;
	}
	var real_cellname = get_real_cell_name(cellname);
	for (var n in side_effects) {
		var m = side_effects[n];
		var matches = real_cellname.match(m.regexp);
		if (matches) {
			utils.init_if_empty(pool, 'side_effects', {}, cellname, []);
			if (pool.side_effects[cellname].indexOf(n) === -1) {
				pool.side_effects[cellname].push(n);
			}
		}
	}
	var matched = findMatcher(real_cellname, packages);
	if (matched) {
		matched[0].func(matched[1], pool, context, packages);
	}
};

var parse_pb = function parse_pb(res, packages) {
	for (var key in res.plain_base) {
		if (key === '$init') {
			continue;
		}
		if (key === '$children') {
			var value = res.plain_base.$children;
			if (value instanceof Array || typeof value === 'string') {
				// its dynamic children
				parse_fexpr(value, res, '$all_children', packages);
			} else {
				Obj.each(value, function (grid_type, link_as) {
					if (grid_type instanceof Array) {
						key = '$child_' + link_as;
						//console.log('Child', grid_type, link_as, key);
						parse_fexpr(grid_type, res, key, packages);
					} else {
						if (typeof grid_type === 'string') {
							res.grids_to_link[link_as] = grid_type;
						} else if (!grid_type.add && !grid_type.remove) {
							res.grids_to_link[link_as] = grid_type.type;
						} else {
							// console.log('Adding cells for managing dynamic grid', grid_type);
							var obj = {};
							if (grid_type.add) {
								obj[grid_type.add] = function () {
									return { type: grid_type.type, action: 'add' };
								};
							}
							if (grid_type.remove) {
								obj[grid_type.remove] = function () {
									return { action: 'remove' };
								};
							}
							parse_fexpr(['map', obj], res, '$child_' + link_as, packages);
						}
					}
				});
			}
			continue;
		}
		parse_fexpr(res.plain_base[key], res, key, packages);
	}
	return res;
};

var parse_fexpr = function parse_fexpr(a, pool, key, packages) {
	var funcstring;
	key = get_real_cell_name(key);
	if (a instanceof Array) {
		funcstring = parse_arr_funcstring(a, key, pool, packages);
		if (funcstring === undefined) return;
	} else {
		// it's primitive value
		utils.init_if_empty(pool.plain_base, '$init', {});
		parse_cellname(key, pool, 'setter', packages);
		pool.plain_base.$init[key] = a;
		return;
	}
	if (!funcstring[2]) {
		// function with no dependancy
		utils.init_if_empty(pool, 'no_args_cells', {}, key, true);
	}
	for (var k = 2; k < funcstring.length; ++k) {
		var cellname = funcstring[k];
		switch (typeof cellname === 'undefined' ? 'undefined' : _typeof(cellname)) {
			case 'string':
				parse_cellname(cellname, pool, null, packages);
				break;
			case 'object':
				if (cellname instanceof Array) {
					var some_key = get_random_name();
					//console.log('Random name is', some_key);
					parse_fexpr(cellname, pool, some_key, packages);
					funcstring[k] = some_key;
				}
				break;
			default:
				throw new Error('Not know how to handle this ' + (typeof cellname === 'undefined' ? 'undefined' : _typeof(cellname)));
				break;
		}
	}
	parse_cellname(key, pool, 'setter', packages);
	//console.log('Got funcstring', funcstring);
	pool.plain_base[key] = funcstring;
};
var parse_fexpr2 = function parse_fexpr2(pool, packages, key, a) {
	return parse_fexpr(a, pool, key, packages);
};

var App = {};
App.parse_cell_types = parse_cell_types;
App.parse_pb = parse_pb;
App.parse_fexpr = parse_fexpr;
App.parse_cellname = parse_cellname;
App.real_cell_name = real_cell_name;
App.get_real_cell_name = get_real_cell_name;
App.get_random_name = get_random_name;
App.side_effects = side_effects;
App.parse_arr_funcstring = parse_arr_funcstring;
App.parse_cell_type = parse_cell_type;
App.findMatcher = findMatcher;
App.system_macros = system_macros;
module.exports = App;
},{"./utils":15}],6:[function(require,module,exports){
'use strict';

var _ozenfant = require('../ozenfant/ozenfant');

var _ozenfant2 = _interopRequireDefault(_ozenfant);

var _Parser = require('./Parser');

var _Parser2 = _interopRequireDefault(_Parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var App = require('./App');
var PackagePool = require('./PackagePool');
var utils = require('./utils');
var Obj = utils.Obj;
var Grid = require("./Grid");
var simpleHtmlTemplates = require("./packages/SimpleHtmlTemplates");
var che_package = require("./packages/Che");
var ozenfant = require('./packages/OzenfantOld');
var ozenfant_new = require('./packages/OzenfantNew');
var htmlCells = require('./packages/HtmlCells');
var core = require('./packages/Core');
var neu_ozenfant = require('./packages/NeuOzenfant');

var is_def = function is_def(a) {
	return a !== undefined && a !== Firera.undef;
};

var show_performance = function show_performance() {
	var res = [];
	for (var i = 1; i < arguments.length; ++i) {
		res.push(i + ': ' + (arguments[i] - arguments[i - 1]).toFixed(3));
	}
	res.push('Total: ' + (arguments[i - 1] - arguments[0]).toFixed(3));
	return res.join(', ');
};

var get_app = function get_app(packages) {
	var app = new App(packages, root_package_pool);
	App.apps.push(app);
	return app;
};

window.Firera = function (config) {
	if (arguments.length > 1) {
		// it's a set of grids we should join
		config = Firera.join.apply(null, arguments);
	}
	var start = performance.now();
	var app = get_app(config.$packages);
	// getting real pbs
	app.cbs = Obj.map(config, app.parse_cbs.bind(app), { except: ['$packages'] });
	// now we should instantiate each pb
	if (!app.cbs.__root) {
		// no root grid
		throw new Error('Cant find root app!');
	}
	//console.log(app);
	//var compilation_finished = performance.now();
	++app.grid_create_counter;
	app.root = new Grid(app, '__root', false, { $app_id: app.id }, null, null, '/');
	Firera.gridCreated(app, app.root.id, app.root.path, null);
	--app.grid_create_counter;
	if (app.grid_create_counter === 0) {
		app.branchCreated(1);
	}
	//var init_finished = performance.now();
	//if(1 > 0){
	//	console.info('App run, it took ' + (init_finished - compilation_finished).toFixed(3) + ' milliseconds.'
	//	);
	//}
	return app;
};

Firera.onGridCreatedStack = {};
Firera.onBranchCreatedStack = {};
Firera.gridCreated = function (app, grid_id, path, parent) {
	if (Firera.onGridCreatedStack[app.id]) {
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = Firera.onGridCreatedStack[app.id][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var cb = _step.value;

				cb(app, grid_id, path, parent);
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}
	}
};

var get_vals = function get_vals(grid) {
	var res = Object.assign({}, grid.cell_values);
	for (var child_name in grid.linked_grids) {
		if (child_name === '..') continue;
		var child_id = grid.linked_grids[child_name];
		var child = grid.app.getGrid(child_id);
		res[child_name] = get_vals(child);
	}
	return res;
};

var root_package_pool = new PackagePool();

Firera.undef = new function () {}();
Firera.noop = new function () {}();
Firera.apps = App.apps;
Firera.run = Firera;
Firera.Ozenfant = _ozenfant2.default;
Firera.is_def = is_def;

Firera.getAppStruct = function () {
	return Firera.apps.map(App.get_app_struct);
};
Firera.loadPackage = function (pack) {
	root_package_pool.load(pack);
};
Firera.join = function () {
	var join = function join(a, b) {
		for (var i in b) {
			a[i] = b[i];
		}
	};

	for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
		args[_key] = arguments[_key];
	}

	var res = Object.assign({}, args[0]);
	for (var key in args) {
		var grid = args[key];
		if (key === 0) continue;
		for (var k in grid) {
			if (k === '$packages') {
				utils.init_if_empty(res, k, []);
				res.$packages = res.$packages.concat(grid[k]);
				continue;
			}
			utils.init_if_empty(res, k, {});
			join(res[k], grid[k]);
		}
	}
	return res;
};
Firera.loadPackage(core);
Firera.loadPackage(che_package);
Firera.packagesAvailable = { simpleHtmlTemplates: simpleHtmlTemplates, htmlCells: htmlCells, ozenfant: ozenfant, ozenfant_new: ozenfant_new, neu_ozenfant: neu_ozenfant, che: che_package };
Firera.func_test_export = { parse_pb: _Parser2.default.parse_pb, parse_fexpr: _Parser2.default.parse_fexpr };
Firera._ = utils;

module.exports = Firera;
},{"../ozenfant/ozenfant":18,"./App":1,"./Grid":2,"./PackagePool":4,"./Parser":5,"./packages/Che":8,"./packages/Core":9,"./packages/HtmlCells":10,"./packages/NeuOzenfant":11,"./packages/OzenfantNew":12,"./packages/OzenfantOld":13,"./packages/SimpleHtmlTemplates":14,"./utils":15}],7:[function(require,module,exports){
/*!
 * jQuery JavaScript Library v3.1.1
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2016-09-22T22:30Z
 */
( function( global, factory ) {

	"use strict";

	if ( typeof module === "object" && typeof module.exports === "object" ) {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
} )( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
// enough that all such attempts are guarded in a try block.
"use strict";

var arr = [];

var document = window.document;

var getProto = Object.getPrototypeOf;

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call( Object );

var support = {};



	function DOMEval( code, doc ) {
		doc = doc || document;

		var script = doc.createElement( "script" );

		script.text = code;
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}
/* global Symbol */
// Defining this global in .eslintrc.json would create a danger of using the global
// unguarded in another place, it seems safer to define global only for this module



var
	version = "3.1.1",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android <=4.0 only
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {

	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {

		// Return all the elements in a clean array
		if ( num == null ) {
			return slice.call( this );
		}

		// Return just the one element from the set
		return num < 0 ? this[ num + this.length ] : this[ num ];
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map( this, function( elem, i ) {
			return callback.call( elem, i, elem );
		} ) );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor();
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[ 0 ] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction( target ) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {

		// Only deal with non-null/undefined values
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
					( copyIsArray = jQuery.isArray( copy ) ) ) ) {

					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray( src ) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject( src ) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend( {

	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isFunction: function( obj ) {
		return jQuery.type( obj ) === "function";
	},

	isArray: Array.isArray,

	isWindow: function( obj ) {
		return obj != null && obj === obj.window;
	},

	isNumeric: function( obj ) {

		// As of jQuery 3.0, isNumeric is limited to
		// strings and numbers (primitives or objects)
		// that can be coerced to finite numbers (gh-2662)
		var type = jQuery.type( obj );
		return ( type === "number" || type === "string" ) &&

			// parseFloat NaNs numeric-cast false positives ("")
			// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
			// subtraction forces infinities to NaN
			!isNaN( obj - parseFloat( obj ) );
	},

	isPlainObject: function( obj ) {
		var proto, Ctor;

		// Detect obvious negatives
		// Use toString instead of jQuery.type to catch host objects
		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
			return false;
		}

		proto = getProto( obj );

		// Objects with no prototype (e.g., `Object.create( null )`) are plain
		if ( !proto ) {
			return true;
		}

		// Objects with prototype are plain iff they were constructed by a global Object function
		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
	},

	isEmptyObject: function( obj ) {

		/* eslint-disable no-unused-vars */
		// See https://github.com/eslint/eslint/issues/6125
		var name;

		for ( name in obj ) {
			return false;
		}
		return true;
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}

		// Support: Android <=2.3 only (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call( obj ) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	globalEval: function( code ) {
		DOMEval( code );
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Support: IE <=9 - 11, Edge 12 - 13
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	each: function( obj, callback ) {
		var length, i = 0;

		if ( isArrayLike( obj ) ) {
			length = obj.length;
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// Support: Android <=4.0 only
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArrayLike( Object( arr ) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android <=4.0 only, PhantomJS 1 only
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var length, value,
			i = 0,
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArrayLike( elems ) ) {
			length = elems.length;
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: Date.now,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
} );

if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
function( i, name ) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
} );

function isArrayLike( obj ) {

	// Support: real iOS 8.2 only (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = !!obj && "length" in obj && obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.3.3
 * https://sizzlejs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2016-08-08
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" + ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	disabledAncestor = addCombinator(
		function( elem ) {
			return elem.disabled === true && ("form" in elem || "label" in elem);
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {

		if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
			setDocument( context );
		}
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {

				// ID selector
				if ( (m = match[1]) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( (elem = context.getElementById( m )) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && (elem = newContext.getElementById( m )) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[2] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( (m = match[3]) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!compilerCache[ selector + " " ] &&
				(!rbuggyQSA || !rbuggyQSA.test( selector )) ) {

				if ( nodeType !== 1 ) {
					newContext = context;
					newSelector = selector;

				// qSA looks outside Element context, which is not what we want
				// Thanks to Andrew Dupont for this workaround technique
				// Support: IE <=8
				// Exclude object elements
				} else if ( context.nodeName.toLowerCase() !== "object" ) {

					// Capture the context ID, setting it first if necessary
					if ( (nid = context.getAttribute( "id" )) ) {
						nid = nid.replace( rcssescape, fcssescape );
					} else {
						context.setAttribute( "id", (nid = expando) );
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[i] = "#" + nid + " " + toSelector( groups[i] );
					}
					newSelector = groups.join( "," );

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;
				}

				if ( newSelector ) {
					try {
						push.apply( results,
							newContext.querySelectorAll( newSelector )
						);
						return results;
					} catch ( qsaError ) {
					} finally {
						if ( nid === expando ) {
							context.removeAttribute( "id" );
						}
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement("fieldset");

	try {
		return !!fn( el );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}
		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {

	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Only certain elements can match :enabled or :disabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
		if ( "form" in elem ) {

			// Check for inherited disabledness on relevant non-disabled elements:
			// * listed form-associated elements in a disabled fieldset
			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
			// * option elements in a disabled optgroup
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
			// All such elements have a "form" property.
			if ( elem.parentNode && elem.disabled === false ) {

				// Option elements defer to a parent optgroup if present
				if ( "label" in elem ) {
					if ( "label" in elem.parentNode ) {
						return elem.parentNode.disabled === disabled;
					} else {
						return elem.disabled === disabled;
					}
				}

				// Support: IE 6 - 11
				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
				return elem.isDisabled === disabled ||

					// Where there is no isDisabled, check manually
					/* jshint -W018 */
					elem.isDisabled !== !disabled &&
						disabledAncestor( elem ) === disabled;
			}

			return elem.disabled === disabled;

		// Try to winnow out elements that can't be disabled before trusting the disabled property.
		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
		// even exist on them, let alone have a boolean value.
		} else if ( "label" in elem ) {
			return elem.disabled === disabled;
		}

		// Remaining elements are neither :enabled nor :disabled
		return false;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9-11, Edge
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	if ( preferredDoc !== document &&
		(subWindow = document.defaultView) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert(function( el ) {
		el.className = "i";
		return !el.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( el ) {
		el.appendChild( document.createComment("") );
		return !el.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	});

	// ID filter and find
	if ( support.getById ) {
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var elem = context.getElementById( id );
				return elem ? [ elem ] : [];
			}
		};
	} else {
		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};

		// Support: IE 6 - 7 only
		// getElementById is not reliable as a find shortcut
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var node, i, elems,
					elem = context.getElementById( id );

				if ( elem ) {

					// Verify the id attribute
					node = elem.getAttributeNode("id");
					if ( node && node.value === id ) {
						return [ elem ];
					}

					// Fall back on getElementsByName
					elems = context.getElementsByName( id );
					i = 0;
					while ( (elem = elems[i++]) ) {
						node = elem.getAttributeNode("id");
						if ( node && node.value === id ) {
							return [ elem ];
						}
					}
				}

				return [];
			}
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( document.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( el ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push("~=");
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push(".#.+[+~]");
			}
		});

		assert(function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement("input");
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll(":enabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll(":disabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( el ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === document ? -1 :
				b === document ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		!compilerCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch (e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return (sel + "").replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || (node[ expando ] = {});

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								(outerCache[ node.uniqueID ] = {});

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {
							// Use previously-cached element index if available
							if ( useCache ) {
								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || (node[ expando ] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									(outerCache[ node.uniqueID ] = {});

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {
								// Use the same loop as above to seek `elem` from the start
								while ( (node = ++nodeIndex && node && node[ dir ] ||
									(diff = nodeIndex = 0) || start.pop()) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] || (node[ expando ] = {});

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												(outerCache[ node.uniqueID ] = {});

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					// Don't keep the element (issue #299)
					input[0] = null;
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
			return false;
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] || (outerCache[ elem.uniqueID ] = {});

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( (oldCache = uniqueCache[ key ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
			return false;
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context === document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					if ( !context && elem.ownerDocument !== document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context || document, xml) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( el ) {
	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement("fieldset") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( el ) {
	return el.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;




var dir = function( elem, dir, until ) {
	var matched = [],
		truncate = until !== undefined;

	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
		if ( elem.nodeType === 1 ) {
			if ( truncate && jQuery( elem ).is( until ) ) {
				break;
			}
			matched.push( elem );
		}
	}
	return matched;
};


var siblings = function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};


var rneedsContext = jQuery.expr.match.needsContext;

var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			return !!qualifier.call( elem, i, elem ) !== not;
		} );
	}

	// Single element
	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		} );
	}

	// Arraylike of elements (jQuery, arguments, Array)
	if ( typeof qualifier !== "string" ) {
		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	// Simple selector that can be filtered directly, removing non-Elements
	if ( risSimple.test( qualifier ) ) {
		return jQuery.filter( qualifier, elements, not );
	}

	// Complex selector, compare the two sets, removing non-Elements
	qualifier = jQuery.filter( qualifier, elements );
	return jQuery.grep( elements, function( elem ) {
		return ( indexOf.call( qualifier, elem ) > -1 ) !== not && elem.nodeType === 1;
	} );
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	if ( elems.length === 1 && elem.nodeType === 1 ) {
		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
	}

	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
		return elem.nodeType === 1;
	} ) );
};

jQuery.fn.extend( {
	find: function( selector ) {
		var i, ret,
			len = this.length,
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter( function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			} ) );
		}

		ret = this.pushStack( [] );

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow( this, selector || [], false ) );
	},
	not: function( selector ) {
		return this.pushStack( winnow( this, selector || [], true ) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
} );


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[ 0 ] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && ( match[ 1 ] || !context ) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[ 1 ] ) {
					context = context instanceof jQuery ? context[ 0 ] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[ 1 ],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {

							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[ 2 ] );

					if ( elem ) {

						// Inject the element directly into the jQuery object
						this[ 0 ] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[ 0 ] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :

				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,

	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend( {
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter( function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[ i ] ) ) {
					return true;
				}
			}
		} );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			targets = typeof selectors !== "string" && jQuery( selectors );

		// Positional selectors never match, since there's no _selection_ context
		if ( !rneedsContext.test( selectors ) ) {
			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( targets ?
						targets.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	}
} );

function sibling( cur, dir ) {
	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each( {
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return siblings( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return siblings( elem.firstChild );
	},
	contents: function( elem ) {
		return elem.contentDocument || jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {

			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
} );
var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	} );
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,

		// Last fire value for non-forgettable lists
		memory,

		// Flag to know if list was already fired
		fired,

		// Flag to prevent firing
		locked,

		// Actual callback list
		list = [],

		// Queue of execution data for repeatable lists
		queue = [],

		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,

		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					( function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( jQuery.isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && jQuery.type( arg ) !== "string" ) {

								// Inspect recursively
								add( arg );
							}
						} );
					} )( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				} );
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

function adoptValue( value, resolve, reject ) {
	var method;

	try {

		// Check for promise aspect first to privilege synchronous behavior
		if ( value && jQuery.isFunction( ( method = value.promise ) ) ) {
			method.call( value ).done( resolve ).fail( reject );

		// Other thenables
		} else if ( value && jQuery.isFunction( ( method = value.then ) ) ) {
			method.call( value, resolve, reject );

		// Other non-thenables
		} else {

			// Support: Android 4.0 only
			// Strict mode functions invoked without .call/.apply get global-object context
			resolve.call( undefined, value );
		}

	// For Promises/A+, convert exceptions into rejections
	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
	// Deferred#then to conditionally suppress rejection.
	} catch ( value ) {

		// Support: Android 4.0 only
		// Strict mode functions invoked without .call/.apply get global-object context
		reject.call( undefined, value );
	}
}

jQuery.extend( {

	Deferred: function( func ) {
		var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks( "memory" ),
					jQuery.Callbacks( "memory" ), 2 ],
				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},

				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred( function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = jQuery.isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[ 1 ] ]( function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this,
										fn ? [ returned ] : arguments
									);
								}
							} );
						} );
						fns = null;
					} ).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( jQuery.isFunction( then ) ) {

										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notifyWith )
											);
										}

									// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )( that, args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											if ( jQuery.Deferred.exceptionHook ) {
												jQuery.Deferred.exceptionHook( e,
													process.stackTrace );
											}

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {

												// Only substitute handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that, args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if ( jQuery.Deferred.getStackHook ) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred( function( newDefer ) {

						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					} ).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[ 1 ] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[ 0 ] ] = function() {
				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
		} );

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( singleValue ) {
		var

			// count of uncompleted subordinates
			remaining = arguments.length,

			// count of unprocessed arguments
			i = remaining,

			// subordinate fulfillment data
			resolveContexts = Array( i ),
			resolveValues = slice.call( arguments ),

			// the master Deferred
			master = jQuery.Deferred(),

			// subordinate callback factory
			updateFunc = function( i ) {
				return function( value ) {
					resolveContexts[ i ] = this;
					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( !( --remaining ) ) {
						master.resolveWith( resolveContexts, resolveValues );
					}
				};
			};

		// Single- and empty arguments are adopted like Promise.resolve
		if ( remaining <= 1 ) {
			adoptValue( singleValue, master.done( updateFunc( i ) ).resolve, master.reject );

			// Use .then() to unwrap secondary thenables (cf. gh-3000)
			if ( master.state() === "pending" ||
				jQuery.isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

				return master.then();
			}
		}

		// Multiple arguments are aggregated like Promise.all array elements
		while ( i-- ) {
			adoptValue( resolveValues[ i ], updateFunc( i ), master.reject );
		}

		return master.promise();
	}
} );


// These usually indicate a programmer mistake during development,
// warn about them ASAP rather than swallowing them by default.
var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

jQuery.Deferred.exceptionHook = function( error, stack ) {

	// Support: IE 8 - 9 only
	// Console exists when dev tools are open, which can happen at any time
	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
	}
};




jQuery.readyException = function( error ) {
	window.setTimeout( function() {
		throw error;
	} );
};




// The deferred used on DOM ready
var readyList = jQuery.Deferred();

jQuery.fn.ready = function( fn ) {

	readyList
		.then( fn )

		// Wrap jQuery.readyException in a function so that the lookup
		// happens at the time of error handling instead of callback
		// registration.
		.catch( function( error ) {
			jQuery.readyException( error );
		} );

	return this;
};

jQuery.extend( {

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
} );

jQuery.ready.then = readyList.then;

// The ready event handler and self cleanup method
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

// Catch cases where $(document).ready() is called
// after the browser event has already occurred.
// Support: IE <=9 - 10 only
// Older IE sometimes signals "interactive" too soon
if ( document.readyState === "complete" ||
	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

	// Handle it asynchronously to allow scripts the opportunity to delay ready
	window.setTimeout( jQuery.ready );

} else {

	// Use the handy event callback
	document.addEventListener( "DOMContentLoaded", completed );

	// A fallback to window.onload, that will always work
	window.addEventListener( "load", completed );
}




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[ i ], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {

			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn(
					elems[ i ], key, raw ?
					value :
					value.call( elems[ i ], i, fn( elems[ i ], key ) )
				);
			}
		}
	}

	if ( chainable ) {
		return elems;
	}

	// Gets
	if ( bulk ) {
		return fn.call( elems );
	}

	return len ? fn( elems[ 0 ], key ) : emptyGet;
};
var acceptData = function( owner ) {

	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};




function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {

	cache: function( owner ) {

		// Check if the owner object already has a cache
		var value = owner[ this.expando ];

		// If not, create one
		if ( !value ) {
			value = {};

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( acceptData( owner ) ) {

				// If it is a node unlikely to be stringify-ed or looped over
				// use plain assignment
				if ( owner.nodeType ) {
					owner[ this.expando ] = value;

				// Otherwise secure it in a non-enumerable property
				// configurable must be true to allow the property to be
				// deleted when data is removed
				} else {
					Object.defineProperty( owner, this.expando, {
						value: value,
						configurable: true
					} );
				}
			}
		}

		return value;
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ jQuery.camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ jQuery.camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		return key === undefined ?
			this.cache( owner ) :

			// Always use camelCase key (gh-2257)
			owner[ this.expando ] && owner[ this.expando ][ jQuery.camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( jQuery.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( jQuery.camelCase );
			} else {
				key = jQuery.camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnothtmlwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

			// Support: Chrome <=35 - 45
			// Webkit & Blink performance suffers when deleting properties
			// from DOM nodes, so set to undefined instead
			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
			if ( owner.nodeType ) {
				owner[ this.expando ] = undefined;
			} else {
				delete owner[ this.expando ];
			}
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function getData( data ) {
	if ( data === "true" ) {
		return true;
	}

	if ( data === "false" ) {
		return false;
	}

	if ( data === "null" ) {
		return null;
	}

	// Only convert to a number if it doesn't change the string
	if ( data === +data + "" ) {
		return +data;
	}

	if ( rbrace.test( data ) ) {
		return JSON.parse( data );
	}

	return data;
}

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = getData( data );
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend( {
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
} );

jQuery.fn.extend( {
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE 11 only
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = jQuery.camelCase( name.slice( 5 ) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each( function() {
				dataUser.set( this, key );
			} );
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each( function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			} );
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each( function() {
			dataUser.remove( this, key );
		} );
	}
} );


jQuery.extend( {
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks( "once memory" ).add( function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			} )
		} );
	}
} );

jQuery.fn.extend( {
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[ 0 ], type );
		}

		return data === undefined ?
			this :
			this.each( function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			} );
	},
	dequeue: function( type ) {
		return this.each( function() {
			jQuery.dequeue( this, type );
		} );
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},

	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
} );
var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var isHiddenWithinTree = function( elem, el ) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;

		// Inline style trumps all
		return elem.style.display === "none" ||
			elem.style.display === "" &&

			// Otherwise, check computed style
			// Support: Firefox <=43 - 45
			// Disconnected elements can have computed display: none, so first confirm that elem is
			// in the document.
			jQuery.contains( elem.ownerDocument, elem ) &&

			jQuery.css( elem, "display" ) === "none";
	};

var swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};




function adjustCSS( elem, prop, valueParts, tween ) {
	var adjusted,
		scale = 1,
		maxIterations = 20,
		currentValue = tween ?
			function() {
				return tween.cur();
			} :
			function() {
				return jQuery.css( elem, prop, "" );
			},
		initial = currentValue(),
		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

		// Starting value computation is required for potential unit mismatches
		initialInUnit = ( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
			rcssNum.exec( jQuery.css( elem, prop ) );

	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

		// Trust units reported by jQuery.css
		unit = unit || initialInUnit[ 3 ];

		// Make sure we update the tween properties later on
		valueParts = valueParts || [];

		// Iteratively approximate from a nonzero starting point
		initialInUnit = +initial || 1;

		do {

			// If previous iteration zeroed out, double until we get *something*.
			// Use string for doubling so we don't accidentally see scale as unchanged below
			scale = scale || ".5";

			// Adjust and apply
			initialInUnit = initialInUnit / scale;
			jQuery.style( elem, prop, initialInUnit + unit );

		// Update scale, tolerating zero or NaN from tween.cur()
		// Break the loop if scale is unchanged or perfect, or if we've just had enough.
		} while (
			scale !== ( scale = currentValue() / initial ) && scale !== 1 && --maxIterations
		);
	}

	if ( valueParts ) {
		initialInUnit = +initialInUnit || +initial || 0;

		// Apply relative offset (+=/-=) if specified
		adjusted = valueParts[ 1 ] ?
			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
			+valueParts[ 2 ];
		if ( tween ) {
			tween.unit = unit;
			tween.start = initialInUnit;
			tween.end = adjusted;
		}
	}
	return adjusted;
}


var defaultDisplayMap = {};

function getDefaultDisplay( elem ) {
	var temp,
		doc = elem.ownerDocument,
		nodeName = elem.nodeName,
		display = defaultDisplayMap[ nodeName ];

	if ( display ) {
		return display;
	}

	temp = doc.body.appendChild( doc.createElement( nodeName ) );
	display = jQuery.css( temp, "display" );

	temp.parentNode.removeChild( temp );

	if ( display === "none" ) {
		display = "block";
	}
	defaultDisplayMap[ nodeName ] = display;

	return display;
}

function showHide( elements, show ) {
	var display, elem,
		values = [],
		index = 0,
		length = elements.length;

	// Determine new display value for elements that need to change
	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		display = elem.style.display;
		if ( show ) {

			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
			// check is required in this first loop unless we have a nonempty display value (either
			// inline or about-to-be-restored)
			if ( display === "none" ) {
				values[ index ] = dataPriv.get( elem, "display" ) || null;
				if ( !values[ index ] ) {
					elem.style.display = "";
				}
			}
			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
				values[ index ] = getDefaultDisplay( elem );
			}
		} else {
			if ( display !== "none" ) {
				values[ index ] = "none";

				// Remember what we're overwriting
				dataPriv.set( elem, "display", display );
			}
		}
	}

	// Set the display of the elements in a second loop to avoid constant reflow
	for ( index = 0; index < length; index++ ) {
		if ( values[ index ] != null ) {
			elements[ index ].style.display = values[ index ];
		}
	}

	return elements;
}

jQuery.fn.extend( {
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each( function() {
			if ( isHiddenWithinTree( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		} );
	}
} );
var rcheckableType = ( /^(?:checkbox|radio)$/i );

var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]+)/i );

var rscriptType = ( /^$|\/(?:java|ecma)script/i );



// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// Support: IE <=9 only
	option: [ 1, "<select multiple='multiple'>", "</select>" ],

	// XHTML parsers do not magically insert elements in the
	// same way that tag soup parsers do. So we cannot shorten
	// this by omitting <tbody> or other required elements.
	thead: [ 1, "<table>", "</table>" ],
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

	_default: [ 0, "", "" ]
};

// Support: IE <=9 only
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;


function getAll( context, tag ) {

	// Support: IE <=9 - 11 only
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret;

	if ( typeof context.getElementsByTagName !== "undefined" ) {
		ret = context.getElementsByTagName( tag || "*" );

	} else if ( typeof context.querySelectorAll !== "undefined" ) {
		ret = context.querySelectorAll( tag || "*" );

	} else {
		ret = [];
	}

	if ( tag === undefined || tag && jQuery.nodeName( context, tag ) ) {
		return jQuery.merge( [ context ], ret );
	}

	return ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, contains, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( jQuery.type( elem ) === "object" ) {

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		contains = jQuery.contains( elem.ownerDocument, elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( contains ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


( function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0 - 4.3 only
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android <=4.1 only
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE <=11 only
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
} )();
var documentElement = document.documentElement;



var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE <=9 only
// See #13393 for more info
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {

		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {

			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {

		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {

			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {

			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	} else if ( !fn ) {
		return elem;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {

			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};

		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	} );
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Ensure that invalid selectors throw exceptions at attach time
		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
		if ( selector ) {
			jQuery.find.matchesSelector( documentElement, selector );
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !( events = elemData.events ) ) {
			events = elemData.events = {};
		}
		if ( !( eventHandle = elemData.handle ) ) {
			eventHandle = elemData.handle = function( e ) {

				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend( {
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join( "." )
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !( handlers = events[ type ] ) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !( events = elemData.events ) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[ 2 ] &&
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	dispatch: function( nativeEvent ) {

		// Make a writable jQuery.Event from the native event object
		var event = jQuery.event.fix( nativeEvent );

		var i, j, ret, matched, handleObj, handlerQueue,
			args = new Array( arguments.length ),
			handlers = ( dataPriv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[ 0 ] = event;

		for ( i = 1; i < arguments.length; i++ ) {
			args[ i ] = arguments[ i ];
		}

		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( ( handleObj = matched.handlers[ j++ ] ) &&
				!event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or 2) have namespace(s)
				// a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.rnamespace || event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( ( event.result = ret ) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, handleObj, sel, matchedHandlers, matchedSelectors,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		if ( delegateCount &&

			// Support: IE <=9
			// Black-hole SVG <use> instance trees (trac-13180)
			cur.nodeType &&

			// Support: Firefox <=42
			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
			// Support: IE 11 only
			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
			!( event.type === "click" && event.button >= 1 ) ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
					matchedHandlers = [];
					matchedSelectors = {};
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matchedSelectors[ sel ] === undefined ) {
							matchedSelectors[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matchedSelectors[ sel ] ) {
							matchedHandlers.push( handleObj );
						}
					}
					if ( matchedHandlers.length ) {
						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		cur = this;
		if ( delegateCount < handlers.length ) {
			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
		}

		return handlerQueue;
	},

	addProp: function( name, hook ) {
		Object.defineProperty( jQuery.Event.prototype, name, {
			enumerable: true,
			configurable: true,

			get: jQuery.isFunction( hook ) ?
				function() {
					if ( this.originalEvent ) {
							return hook( this.originalEvent );
					}
				} :
				function() {
					if ( this.originalEvent ) {
							return this.originalEvent[ name ];
					}
				},

			set: function( value ) {
				Object.defineProperty( this, name, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: value
				} );
			}
		} );
	},

	fix: function( originalEvent ) {
		return originalEvent[ jQuery.expando ] ?
			originalEvent :
			new jQuery.Event( originalEvent );
	},

	special: {
		load: {

			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {

			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					this.focus();
					return false;
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {

			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	}
};

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {

	// Allow instantiation without the 'new' keyword
	if ( !( this instanceof jQuery.Event ) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&

				// Support: Android <=2.3 only
				src.returnValue === false ?
			returnTrue :
			returnFalse;

		// Create target properties
		// Support: Safari <=6 - 7 only
		// Target should not be a text node (#504, #13143)
		this.target = ( src.target && src.target.nodeType === 3 ) ?
			src.target.parentNode :
			src.target;

		this.currentTarget = src.currentTarget;
		this.relatedTarget = src.relatedTarget;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,
	isSimulated: false,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && !this.isSimulated ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Includes all common event props including KeyEvent and MouseEvent specific props
jQuery.each( {
	altKey: true,
	bubbles: true,
	cancelable: true,
	changedTouches: true,
	ctrlKey: true,
	detail: true,
	eventPhase: true,
	metaKey: true,
	pageX: true,
	pageY: true,
	shiftKey: true,
	view: true,
	"char": true,
	charCode: true,
	key: true,
	keyCode: true,
	button: true,
	buttons: true,
	clientX: true,
	clientY: true,
	offsetX: true,
	offsetY: true,
	pointerId: true,
	pointerType: true,
	screenX: true,
	screenY: true,
	targetTouches: true,
	toElement: true,
	touches: true,

	which: function( event ) {
		var button = event.button;

		// Add which for key events
		if ( event.which == null && rkeyEvent.test( event.type ) ) {
			return event.charCode != null ? event.charCode : event.keyCode;
		}

		// Add which for click: 1 === left; 2 === middle; 3 === right
		if ( !event.which && button !== undefined && rmouseEvent.test( event.type ) ) {
			if ( button & 1 ) {
				return 1;
			}

			if ( button & 2 ) {
				return 3;
			}

			if ( button & 4 ) {
				return 2;
			}

			return 0;
		}

		return event.which;
	}
}, jQuery.event.addProp );

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari 7 only
// Safari sends mouseenter too often; see:
// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
// for the description of the bug (it existed in older Chrome versions as well).
jQuery.each( {
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mouseenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
} );

jQuery.fn.extend( {

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {

			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {

			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {

			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each( function() {
			jQuery.event.remove( this, types, fn, selector );
		} );
	}
} );


var

	/* eslint-disable max-len */

	// See https://github.com/eslint/eslint/issues/3229
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,

	/* eslint-enable */

	// Support: IE <=10 - 11, Edge 12 - 13
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,

	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

function manipulationTarget( elem, content ) {
	if ( jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

		return elem.getElementsByTagName( "tbody" )[ 0 ] || elem;
	}

	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );

	if ( match ) {
		elem.type = match[ 1 ];
	} else {
		elem.removeAttribute( "type" );
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.access( src );
		pdataCur = dataPriv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = concat.apply( [], args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		isFunction = jQuery.isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( isFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each( function( index ) {
			var self = collection.eq( index );
			if ( isFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		} );
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl ) {
								jQuery._evalUrl( node.src );
							}
						} else {
							DOMEval( node.textContent.replace( rcleanScript, "" ), doc );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && jQuery.contains( node.ownerDocument, node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend( {
	htmlPrefilter: function( html ) {
		return html.replace( rxhtmlTag, "<$1></$2>" );
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = jQuery.contains( elem.ownerDocument, elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
			if ( acceptData( elem ) ) {
				if ( ( data = elem[ dataPriv.expando ] ) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataPriv.expando ] = undefined;
				}
				if ( elem[ dataUser.expando ] ) {

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataUser.expando ] = undefined;
				}
			}
		}
	}
} );

jQuery.fn.extend( {
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each( function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				} );
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		} );
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		} );
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		} );
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		} );
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; ( elem = this[ i ] ) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		} );
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
} );

jQuery.each( {
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android <=4.0 only, PhantomJS 1 only
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
} );
var rmargin = ( /^margin/ );

var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {

		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if ( !view || !view.opener ) {
			view = window;
		}

		return view.getComputedStyle( elem );
	};



( function() {

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computeStyleTests() {

		// This is a singleton, we need to execute it only once
		if ( !div ) {
			return;
		}

		div.style.cssText =
			"box-sizing:border-box;" +
			"position:relative;display:block;" +
			"margin:auto;border:1px;padding:1px;" +
			"top:1%;width:50%";
		div.innerHTML = "";
		documentElement.appendChild( container );

		var divStyle = window.getComputedStyle( div );
		pixelPositionVal = divStyle.top !== "1%";

		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
		reliableMarginLeftVal = divStyle.marginLeft === "2px";
		boxSizingReliableVal = divStyle.width === "4px";

		// Support: Android 4.0 - 4.3 only
		// Some styles come back with percentage values, even though they shouldn't
		div.style.marginRight = "50%";
		pixelMarginRightVal = divStyle.marginRight === "4px";

		documentElement.removeChild( container );

		// Nullify the div so it wouldn't be stored in the memory and
		// it will also be a sign that checks already performed
		div = null;
	}

	var pixelPositionVal, boxSizingReliableVal, pixelMarginRightVal, reliableMarginLeftVal,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	// Finish early in limited (non-browser) environments
	if ( !div.style ) {
		return;
	}

	// Support: IE <=9 - 11 only
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	container.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;" +
		"padding:0;margin-top:1px;position:absolute";
	container.appendChild( div );

	jQuery.extend( support, {
		pixelPosition: function() {
			computeStyleTests();
			return pixelPositionVal;
		},
		boxSizingReliable: function() {
			computeStyleTests();
			return boxSizingReliableVal;
		},
		pixelMarginRight: function() {
			computeStyleTests();
			return pixelMarginRightVal;
		},
		reliableMarginLeft: function() {
			computeStyleTests();
			return reliableMarginLeftVal;
		}
	} );
} )();


function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,
		style = elem.style;

	computed = computed || getStyles( elem );

	// Support: IE <=9 only
	// getPropertyValue is only needed for .css('filter') (#12537)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];

		if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// Android Browser returns percentage for some values,
		// but width seems to be reliably pixels.
		// This is against the CSSOM draft spec:
		// https://drafts.csswg.org/cssom/#resolved-values
		if ( !support.pixelMarginRight() && rnumnonpx.test( ret ) && rmargin.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?

		// Support: IE <=9 - 11 only
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {

	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {

				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return ( this.get = hookFn ).apply( this, arguments );
		}
	};
}


var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	},

	cssPrefixes = [ "Webkit", "Moz", "ms" ],
	emptyStyle = document.createElement( "div" ).style;

// Return a css property mapped to a potentially vendor prefixed property
function vendorPropName( name ) {

	// Shortcut for names that are not vendor prefixed
	if ( name in emptyStyle ) {
		return name;
	}

	// Check for vendor prefixed names
	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in emptyStyle ) {
			return name;
		}
	}
}

function setPositiveNumber( elem, value, subtract ) {

	// Any relative (+/-) values have already been
	// normalized at this point
	var matches = rcssNum.exec( value );
	return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i,
		val = 0;

	// If we already have the right measurement, avoid augmentation
	if ( extra === ( isBorderBox ? "border" : "content" ) ) {
		i = 4;

	// Otherwise initialize for horizontal or vertical properties
	} else {
		i = name === "width" ? 1 : 0;
	}

	for ( ; i < 4; i += 2 ) {

		// Both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {

			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// At this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {

			// At this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// At this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var val,
		valueIsBorderBox = true,
		styles = getStyles( elem ),
		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// Support: IE <=11 only
	// Running getBoundingClientRect on a disconnected node
	// in IE throws an error.
	if ( elem.getClientRects().length ) {
		val = elem.getBoundingClientRect()[ name ];
	}

	// Some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {

		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name, styles );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test( val ) ) {
			return val;
		}

		// Check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox &&
			( support.boxSizingReliable() || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// Use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

jQuery.extend( {

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"animationIterationCount": true,
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		"float": "cssFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] ||
			( jQuery.cssProps[ origName ] = vendorPropName( origName ) || origName );

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
				value = adjustCSS( elem, name, ret );

				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add the unit (except for certain CSS properties)
			if ( type === "number" ) {
				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
			}

			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !( "set" in hooks ) ||
				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

				style[ name ] = value;
			}

		} else {

			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks &&
				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] ||
			( jQuery.cssProps[ origName ] = vendorPropName( origName ) || origName );

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || isFinite( num ) ? num || 0 : val;
		}
		return val;
	}
} );

jQuery.each( [ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <=11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
						swap( elem, cssShow, function() {
							return getWidthOrHeight( elem, name, extra );
						} ) :
						getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var matches,
				styles = extra && getStyles( elem ),
				subtract = extra && augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				);

			// Convert to pixels if value adjustment is needed
			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
				( matches[ 3 ] || "px" ) !== "px" ) {

				elem.style[ name ] = value;
				value = jQuery.css( elem, name );
			}

			return setPositiveNumber( elem, value, subtract );
		}
	};
} );

jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
	function( elem, computed ) {
		if ( computed ) {
			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
				elem.getBoundingClientRect().left -
					swap( elem, { marginLeft: 0 }, function() {
						return elem.getBoundingClientRect().left;
					} )
				) + "px";
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each( {
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split( " " ) : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
} );

jQuery.fn.extend( {
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( jQuery.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	}
} );


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || jQuery.easing._default;
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			// Use a property on the element directly when it is not a DOM element,
			// or when there is no matching style property that exists.
			if ( tween.elem.nodeType !== 1 ||
				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );

			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {

			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.nodeType === 1 &&
				( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null ||
					jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9 only
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	},
	_default: "swing"
};

jQuery.fx = Tween.prototype.init;

// Back compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rrun = /queueHooks$/;

function raf() {
	if ( timerId ) {
		window.requestAnimationFrame( raf );
		jQuery.fx.tick();
	}
}

// Animations created synchronously will run synchronously
function createFxNow() {
	window.setTimeout( function() {
		fxNow = undefined;
	} );
	return ( fxNow = jQuery.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
		isBox = "width" in props || "height" in props,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHiddenWithinTree( elem ),
		dataShow = dataPriv.get( elem, "fxshow" );

	// Queue-skipping animations hijack the fx hooks
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always( function() {

			// Ensure the complete handler is called before this completes
			anim.always( function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			} );
		} );
	}

	// Detect show/hide animations
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.test( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// Pretend to be hidden if this is a "show" and
				// there is still data from a stopped show/hide
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;

				// Ignore all other no-op show/hide data
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	// Bail out if this is a no-op like .hide().hide()
	propTween = !jQuery.isEmptyObject( props );
	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
		return;
	}

	// Restrict "overflow" and "display" styles during box animations
	if ( isBox && elem.nodeType === 1 ) {

		// Support: IE <=9 - 11, Edge 12 - 13
		// Record all 3 overflow attributes because IE does not infer the shorthand
		// from identically-valued overflowX and overflowY
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Identify a display type, preferring old show/hide data over the CSS cascade
		restoreDisplay = dataShow && dataShow.display;
		if ( restoreDisplay == null ) {
			restoreDisplay = dataPriv.get( elem, "display" );
		}
		display = jQuery.css( elem, "display" );
		if ( display === "none" ) {
			if ( restoreDisplay ) {
				display = restoreDisplay;
			} else {

				// Get nonempty value(s) by temporarily forcing visibility
				showHide( [ elem ], true );
				restoreDisplay = elem.style.display || restoreDisplay;
				display = jQuery.css( elem, "display" );
				showHide( [ elem ] );
			}
		}

		// Animate inline elements as inline-block
		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
			if ( jQuery.css( elem, "float" ) === "none" ) {

				// Restore the original display value at the end of pure show/hide animations
				if ( !propTween ) {
					anim.done( function() {
						style.display = restoreDisplay;
					} );
					if ( restoreDisplay == null ) {
						display = style.display;
						restoreDisplay = display === "none" ? "" : display;
					}
				}
				style.display = "inline-block";
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always( function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		} );
	}

	// Implement show/hide animations
	propTween = false;
	for ( prop in orig ) {

		// General show/hide setup for this element animation
		if ( !propTween ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
			}

			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}

			// Show elements before animating them
			if ( hidden ) {
				showHide( [ elem ], true );
			}

			/* eslint-disable no-loop-func */

			anim.done( function() {

			/* eslint-enable no-loop-func */

				// The final step of a "hide" animation is actually hiding the element
				if ( !hidden ) {
					showHide( [ elem ] );
				}
				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
		}

		// Per-property setup
		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
		if ( !( prop in dataShow ) ) {
			dataShow[ prop ] = propTween.start;
			if ( hidden ) {
				propTween.end = propTween.start;
				propTween.start = 0;
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = Animation.prefilters.length,
		deferred = jQuery.Deferred().always( function() {

			// Don't match elem in the :animated selector
			delete tick.elem;
		} ),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

				// Support: Android 2.3 only
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ] );

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise( {
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,

					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.notifyWith( elem, [ animation, 1, 0 ] );
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		} ),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length; index++ ) {
		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			if ( jQuery.isFunction( result.stop ) ) {
				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
					jQuery.proxy( result.stop, result );
			}
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		} )
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

jQuery.Animation = jQuery.extend( Animation, {

	tweeners: {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value );
			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
			return tween;
		} ]
	},

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.match( rnothtmlwhite );
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length; index++ ) {
			prop = props[ index ];
			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
			Animation.tweeners[ prop ].unshift( callback );
		}
	},

	prefilters: [ defaultPrefilter ],

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			Animation.prefilters.unshift( callback );
		} else {
			Animation.prefilters.push( callback );
		}
	}
} );

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	// Go to the end state if fx are off or if document is hidden
	if ( jQuery.fx.off || document.hidden ) {
		opt.duration = 0;

	} else {
		if ( typeof opt.duration !== "number" ) {
			if ( opt.duration in jQuery.fx.speeds ) {
				opt.duration = jQuery.fx.speeds[ opt.duration ];

			} else {
				opt.duration = jQuery.fx.speeds._default;
			}
		}
	}

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend( {
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate( { opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || dataPriv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each( function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = dataPriv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this &&
					( type == null || timers[ index ].queue === type ) ) {

					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		} );
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each( function() {
			var index,
				data = dataPriv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		} );
	}
} );

jQuery.each( [ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
} );

// Generate shortcuts for custom animations
jQuery.each( {
	slideDown: genFx( "show" ),
	slideUp: genFx( "hide" ),
	slideToggle: genFx( "toggle" ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
} );

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];

		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	if ( timer() ) {
		jQuery.fx.start();
	} else {
		jQuery.timers.pop();
	}
};

jQuery.fx.interval = 13;
jQuery.fx.start = function() {
	if ( !timerId ) {
		timerId = window.requestAnimationFrame ?
			window.requestAnimationFrame( raf ) :
			window.setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.stop = function() {
	if ( window.cancelAnimationFrame ) {
		window.cancelAnimationFrame( timerId );
	} else {
		window.clearInterval( timerId );
	}

	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,

	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	} );
};


( function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android <=4.3 only
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE <=11 only
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: IE <=11 only
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
} )();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend( {
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each( function() {
			jQuery.removeAttr( this, name );
		} );
	}
} );

jQuery.extend( {
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// Attribute hooks are determined by the lowercase version
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					jQuery.nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	removeAttr: function( elem, value ) {
		var name,
			i = 0,

			// Attribute names can contain non-HTML whitespace characters
			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
			attrNames = value && value.match( rnothtmlwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[ i++ ] ) ) {
				elem.removeAttribute( name );
			}
		}
	}
} );

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {

			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};

jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle,
			lowercaseName = name.toLowerCase();

		if ( !isXML ) {

			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ lowercaseName ];
			attrHandle[ lowercaseName ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				lowercaseName :
				null;
			attrHandle[ lowercaseName ] = handle;
		}
		return ret;
	};
} );




var rfocusable = /^(?:input|select|textarea|button)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend( {
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each( function() {
			delete this[ jQuery.propFix[ name ] || name ];
		} );
	}
} );

jQuery.extend( {
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {

				// Support: IE <=9 - 11 only
				// elem.tabIndex doesn't always return the
				// correct value when it hasn't been explicitly set
				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				if ( tabindex ) {
					return parseInt( tabindex, 10 );
				}

				if (
					rfocusable.test( elem.nodeName ) ||
					rclickable.test( elem.nodeName ) &&
					elem.href
				) {
					return 0;
				}

				return -1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
} );

// Support: IE <=11 only
// Accessing the selectedIndex property
// forces the browser to respect setting selected
// on the option
// The getter ensures a default option is selected
// when in an optgroup
// eslint rule "no-unused-expressions" is disabled for this code
// since it considers such accessions noop
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		},
		set: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent ) {
				parent.selectedIndex;

				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
		}
	};
}

jQuery.each( [
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
} );




	// Strip and collapse whitespace according to HTML spec
	// https://html.spec.whatwg.org/multipage/infrastructure.html#strip-and-collapse-whitespace
	function stripAndCollapse( value ) {
		var tokens = value.match( rnothtmlwhite ) || [];
		return tokens.join( " " );
	}


function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

jQuery.fn.extend( {
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( typeof value === "string" && value ) {
			classes = value.match( rnothtmlwhite ) || [];

			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( !arguments.length ) {
			return this.attr( "class", "" );
		}

		if ( typeof value === "string" && value ) {
			classes = value.match( rnothtmlwhite ) || [];

			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {

						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			} );
		}

		return this.each( function() {
			var className, i, self, classNames;

			if ( type === "string" ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = value.match( rnothtmlwhite ) || [];

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// Store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
						"" :
						dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		} );
	},

	hasClass: function( selector ) {
		var className, elem,
			i = 0;

		className = " " + selector + " ";
		while ( ( elem = this[ i++ ] ) ) {
			if ( elem.nodeType === 1 &&
				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
					return true;
			}
		}

		return false;
	}
} );




var rreturn = /\r/g;

jQuery.fn.extend( {
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[ 0 ];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks &&
					"get" in hooks &&
					( ret = hooks.get( elem, "value" ) ) !== undefined
				) {
					return ret;
				}

				ret = elem.value;

				// Handle most common string cases
				if ( typeof ret === "string" ) {
					return ret.replace( rreturn, "" );
				}

				// Handle cases where value is null/undef or number
				return ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each( function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				} );
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		} );
	}
} );

jQuery.extend( {
	valHooks: {
		option: {
			get: function( elem ) {

				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :

					// Support: IE <=10 - 11 only
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					stripAndCollapse( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option, i,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one",
					values = one ? null : [],
					max = one ? index + 1 : options.length;

				if ( index < 0 ) {
					i = max;

				} else {
					i = one ? index : 0;
				}

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Support: IE <=9 only
					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled &&
							( !option.parentNode.disabled ||
								!jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					/* eslint-disable no-cond-assign */

					if ( option.selected =
						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
					) {
						optionSet = true;
					}

					/* eslint-enable no-cond-assign */
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
} );

// Radios and checkboxes getter/setter
jQuery.each( [ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
		};
	}
} );




// Return jQuery for attributes-only inclusion


var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/;

jQuery.extend( jQuery.event, {

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "." ) > -1 ) {

			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split( "." );
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf( ":" ) < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join( "." );
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === ( elem.ownerDocument || document ) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || {} )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( ( !special._default ||
				special._default.apply( eventPath.pop(), data ) === false ) &&
				acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	// Piggyback on a donor event to simulate a different one
	// Used only for `focus(in | out)` events
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true
			}
		);

		jQuery.event.trigger( e, null, elem );
	}

} );

jQuery.fn.extend( {

	trigger: function( type, data ) {
		return this.each( function() {
			jQuery.event.trigger( type, data, this );
		} );
	},
	triggerHandler: function( type, data ) {
		var elem = this[ 0 ];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
} );


jQuery.each( ( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
} );

jQuery.fn.extend( {
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
} );




support.focusin = "onfocusin" in window;


// Support: Firefox <=44
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
if ( !support.focusin ) {
	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
		};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					dataPriv.remove( doc, fix );

				} else {
					dataPriv.access( doc, fix, attaches );
				}
			}
		};
	} );
}
var location = window.location;

var nonce = jQuery.now();

var rquery = ( /\?/ );



// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE 9 - 11 only
	// IE throws on parseFromString with invalid input.
	try {
		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {

		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		} );

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, valueOrFunction ) {

			// If value is a function, invoke it and use its return value
			var value = jQuery.isFunction( valueOrFunction ) ?
				valueOrFunction() :
				valueOrFunction;

			s[ s.length ] = encodeURIComponent( key ) + "=" +
				encodeURIComponent( value == null ? "" : value );
		};

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		} );

	} else {

		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" );
};

jQuery.fn.extend( {
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map( function() {

			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		} )
		.filter( function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} )
		.map( function( i, elem ) {
			var val = jQuery( this ).val();

			if ( val == null ) {
				return null;
			}

			if ( jQuery.isArray( val ) ) {
				return jQuery.map( val, function( val ) {
					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
				} );
			}

			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} ).get();
	}
} );


var
	r20 = /%20/g,
	rhash = /#.*$/,
	rantiCache = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Anchor tag for parsing the document origin
	originAnchor = document.createElement( "a" );
	originAnchor.href = location.href;

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

		if ( jQuery.isFunction( func ) ) {

			// For each dataType in the dataTypeExpression
			while ( ( dataType = dataTypes[ i++ ] ) ) {

				// Prepend if requested
				if ( dataType[ 0 ] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

				// Otherwise append
				} else {
					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" &&
				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		} );
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {

		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}

		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},

		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {

								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s.throws ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return {
								state: "parsererror",
								error: conv ? e : "No conversion from " + prev + " to " + current
							};
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend( {

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: location.href,
		type: "GET",
		isLocal: rlocalProtocol.test( location.protocol ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /\bxml\b/,
			html: /\bhtml/,
			json: /\bjson\b/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": JSON.parse,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,

			// URL without anti-cache param
			cacheURL,

			// Response headers
			responseHeadersString,
			responseHeaders,

			// timeout handle
			timeoutTimer,

			// Url cleanup var
			urlAnchor,

			// Request state (becomes false upon send and true upon completion)
			completed,

			// To know if global events are to be dispatched
			fireGlobals,

			// Loop variable
			i,

			// uncached part of the url
			uncached,

			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),

			// Callbacks context
			callbackContext = s.context || s,

			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context &&
				( callbackContext.nodeType || callbackContext.jquery ) ?
					jQuery( callbackContext ) :
					jQuery.event,

			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),

			// Status-dependent callbacks
			statusCode = s.statusCode || {},

			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},

			// Default abort message
			strAbort = "canceled",

			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( completed ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[ 1 ].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( completed == null ) {
						name = requestHeadersNames[ name.toLowerCase() ] =
							requestHeadersNames[ name.toLowerCase() ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( completed == null ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( completed ) {

							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for ( code in map ) {
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR );

		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || location.href ) + "" )
			.replace( rprotocol, location.protocol + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

		// A cross-domain request is in order when the origin doesn't match the current origin.
		if ( s.crossDomain == null ) {
			urlAnchor = document.createElement( "a" );

			// Support: IE <=8 - 11, Edge 12 - 13
			// IE throws exception on accessing the href property if url is malformed,
			// e.g. http://example.com:80x/
			try {
				urlAnchor.href = s.url;

				// Support: IE <=8 - 11 only
				// Anchor's host property isn't correctly set when s.url is relative
				urlAnchor.href = urlAnchor.href;
				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
					urlAnchor.protocol + "//" + urlAnchor.host;
			} catch ( e ) {

				// If there is an error parsing the URL, assume it is crossDomain,
				// it can be rejected by the transport if it is invalid
				s.crossDomain = true;
			}
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( completed ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		// Remove hash to simplify url manipulation
		cacheURL = s.url.replace( rhash, "" );

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// Remember the hash so we can put it back
			uncached = s.url.slice( cacheURL.length );

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add or update anti-cache param if needed
			if ( s.cache === false ) {
				cacheURL = cacheURL.replace( rantiCache, "$1" );
				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce++ ) + uncached;
			}

			// Put hash and anti-cache on the URL that will be requested (gh-1732)
			s.url = cacheURL + uncached;

		// Change '%20' to '+' if this is encoded form body content (gh-2658)
		} else if ( s.data && s.processData &&
			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
			s.data = s.data.replace( r20, "+" );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
				s.accepts[ s.dataTypes[ 0 ] ] +
					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend &&
			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		completeDeferred.add( s.complete );
		jqXHR.done( s.success );
		jqXHR.fail( s.error );

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}

			// If request was aborted inside ajaxSend, stop there
			if ( completed ) {
				return jqXHR;
			}

			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = window.setTimeout( function() {
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				completed = false;
				transport.send( requestHeaders, done );
			} catch ( e ) {

				// Rethrow post-completion exceptions
				if ( completed ) {
					throw e;
				}

				// Propagate others as results
				done( -1, e );
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Ignore repeat invocations
			if ( completed ) {
				return;
			}

			completed = true;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				window.clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader( "Last-Modified" );
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader( "etag" );
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {

				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
} );

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

		// Shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );


jQuery._evalUrl = function( url ) {
	return jQuery.ajax( {
		url: url,

		// Make this explicit, since user can override this through ajaxSetup (#11264)
		type: "GET",
		dataType: "script",
		cache: true,
		async: false,
		global: false,
		"throws": true
	} );
};


jQuery.fn.extend( {
	wrapAll: function( html ) {
		var wrap;

		if ( this[ 0 ] ) {
			if ( jQuery.isFunction( html ) ) {
				html = html.call( this[ 0 ] );
			}

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map( function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			} ).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each( function( i ) {
				jQuery( this ).wrapInner( html.call( this, i ) );
			} );
		}

		return this.each( function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		} );
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each( function( i ) {
			jQuery( this ).wrapAll( isFunction ? html.call( this, i ) : html );
		} );
	},

	unwrap: function( selector ) {
		this.parent( selector ).not( "body" ).each( function() {
			jQuery( this ).replaceWith( this.childNodes );
		} );
		return this;
	}
} );


jQuery.expr.pseudos.hidden = function( elem ) {
	return !jQuery.expr.pseudos.visible( elem );
};
jQuery.expr.pseudos.visible = function( elem ) {
	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
};




jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE <=9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport( function( options ) {
	var callback, errorCallback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr();

				xhr.open(
					options.type,
					options.url,
					options.async,
					options.username,
					options.password
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
					headers[ "X-Requested-With" ] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							callback = errorCallback = xhr.onload =
								xhr.onerror = xhr.onabort = xhr.onreadystatechange = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {

								// Support: IE <=9 only
								// On a manual native abort, IE9 throws
								// errors on any property access that is not readyState
								if ( typeof xhr.status !== "number" ) {
									complete( 0, "error" );
								} else {
									complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status,
										xhr.statusText
									);
								}
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,

									// Support: IE <=9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									( xhr.responseType || "text" ) !== "text"  ||
									typeof xhr.responseText !== "string" ?
										{ binary: xhr.response } :
										{ text: xhr.responseText },
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				errorCallback = xhr.onerror = callback( "error" );

				// Support: IE 9 only
				// Use onreadystatechange to replace onabort
				// to handle uncaught aborts
				if ( xhr.onabort !== undefined ) {
					xhr.onabort = errorCallback;
				} else {
					xhr.onreadystatechange = function() {

						// Check readyState before timeout as it changes
						if ( xhr.readyState === 4 ) {

							// Allow onerror to be called first,
							// but that will not handle a native abort
							// Also, save errorCallback to a variable
							// as xhr.onerror cannot be accessed
							window.setTimeout( function() {
								if ( callback ) {
									errorCallback();
								}
							} );
						}
					};
				}

				// Create the abort callback
				callback = callback( "abort" );

				try {

					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {

					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
jQuery.ajaxPrefilter( function( s ) {
	if ( s.crossDomain ) {
		s.contents.script = false;
	}
} );

// Install script dataType
jQuery.ajaxSetup( {
	accepts: {
		script: "text/javascript, application/javascript, " +
			"application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /\b(?:java|ecma)script\b/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
} );

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
} );

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery( "<script>" ).prop( {
					charset: s.scriptCharset,
					src: s.url
				} ).on(
					"load error",
					callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					}
				);

				// Use native DOM manipulation to avoid our domManip AJAX trickery
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup( {
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
} );

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" &&
				( s.contentType || "" )
					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
				rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters[ "script json" ] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// Force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always( function() {

			// If previous value didn't exist - remove it
			if ( overwritten === undefined ) {
				jQuery( window ).removeProp( callbackName );

			// Otherwise restore preexisting value
			} else {
				window[ callbackName ] = overwritten;
			}

			// Save back as free
			if ( s[ callbackName ] ) {

				// Make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// Save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		} );

		// Delegate to script
		return "script";
	}
} );




// Support: Safari 8 only
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in Safari 8.
// https://bugs.webkit.org/show_bug.cgi?id=137337
support.createHTMLDocument = ( function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
} )();


// Argument "data" should be string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}

	var base, parsed, scripts;

	if ( !context ) {

		// Stop scripts or inline event handlers from being executed immediately
		// by using document.implementation
		if ( support.createHTMLDocument ) {
			context = document.implementation.createHTMLDocument( "" );

			// Set the base href for the created document
			// so any parsed elements with URLs
			// are based on the document's URL (gh-2965)
			base = context.createElement( "base" );
			base.href = document.location.href;
			context.head.appendChild( base );
		} else {
			context = document;
		}
	}

	parsed = rsingleTag.exec( data );
	scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[ 1 ] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	var selector, type, response,
		self = this,
		off = url.indexOf( " " );

	if ( off > -1 ) {
		selector = stripAndCollapse( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax( {
			url: url,

			// If "type" variable is undefined, then "GET" method will be used.
			// Make value of this field explicit since
			// user can override it through ajaxSetup method
			type: type || "GET",
			dataType: "html",
			data: params
		} ).done( function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		// If the request succeeds, this function gets "data", "status", "jqXHR"
		// but they are ignored because response was set above.
		// If it fails, this function gets "jqXHR", "status", "error"
		} ).always( callback && function( jqXHR, status ) {
			self.each( function() {
				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
			} );
		} );
	}

	return this;
};




// Attach a bunch of functions for handling common AJAX events
jQuery.each( [
	"ajaxStart",
	"ajaxStop",
	"ajaxComplete",
	"ajaxError",
	"ajaxSuccess",
	"ajaxSend"
], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
} );




jQuery.expr.pseudos.animated = function( elem ) {
	return jQuery.grep( jQuery.timers, function( fn ) {
		return elem === fn.elem;
	} ).length;
};




/**
 * Gets a window from an element
 */
function getWindow( elem ) {
	return jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;
}

jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {

			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend( {
	offset: function( options ) {

		// Preserve chaining for setter
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each( function( i ) {
					jQuery.offset.setOffset( this, options, i );
				} );
		}

		var docElem, win, rect, doc,
			elem = this[ 0 ];

		if ( !elem ) {
			return;
		}

		// Support: IE <=11 only
		// Running getBoundingClientRect on a
		// disconnected node in IE throws an error
		if ( !elem.getClientRects().length ) {
			return { top: 0, left: 0 };
		}

		rect = elem.getBoundingClientRect();

		// Make sure element is not hidden (display: none)
		if ( rect.width || rect.height ) {
			doc = elem.ownerDocument;
			win = getWindow( doc );
			docElem = doc.documentElement;

			return {
				top: rect.top + win.pageYOffset - docElem.clientTop,
				left: rect.left + win.pageXOffset - docElem.clientLeft
			};
		}

		// Return zeros for disconnected and hidden elements (gh-2310)
		return rect;
	},

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// Fixed elements are offset from window (parentOffset = {top:0, left: 0},
		// because it is its only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {

			// Assume getBoundingClientRect is there when computed position is fixed
			offset = elem.getBoundingClientRect();

		} else {

			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset = {
				top: parentOffset.top + jQuery.css( offsetParent[ 0 ], "borderTopWidth", true ),
				left: parentOffset.left + jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true )
			};
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	// This method will return documentElement in the following cases:
	// 1) For the element inside the iframe without offsetParent, this method will return
	//    documentElement of the parent window
	// 2) For the hidden or detached element
	// 3) For body or html element, i.e. in case of the html node - it will return itself
	//
	// but those exceptions were never presented as a real life use-cases
	// and might be considered as more preferable results.
	//
	// This logic, however, is not guaranteed and can change at any point in the future
	offsetParent: function() {
		return this.map( function() {
			var offsetParent = this.offsetParent;

			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || documentElement;
		} );
	}
} );

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : win.pageXOffset,
					top ? val : win.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length );
	};
} );

// Support: Safari <=7 - 9.1, Chrome <=37 - 49
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
} );


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name },
		function( defaultExtra, funcName ) {

		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {

					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
					return funcName.indexOf( "outer" ) === 0 ?
						elem[ "inner" + name ] :
						elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable );
		};
	} );
} );


jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {

		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	}
} );

jQuery.parseJSON = JSON.parse;




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	} );
}




var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( !noGlobal ) {
	window.jQuery = window.$ = jQuery;
}





return jQuery;
} );

},{}],8:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var _che = require('../../shche/shche');

module.exports = {
	macros: {
		che: function che(expr) {
			var _expr = _slicedToArray(expr, 2),
			    expr = _expr[0],
			    cbs = _expr[1];

			cbs = cbs || [];
			var succ_cb;
			var obj = _che.create.apply(_che, [expr, {
				onOutput: function onOutput(key, val) {
					//console.log('outputting from che', key, val);
				},
				onSuccess: function onSuccess() {
					//console.log('che scenario successfully finished', succ_cb, obj.state);
					succ_cb(obj.state);
				}
			}].concat(_toConsumableArray(cbs)));
			var str = ['asyncClosureFunnel', function () {
				return function (cb, cell, val) {
					//console.log('something dripped', cb, cell, val);
					succ_cb = cb;
					obj.drip(cell, val);
					return 'a';
				};
			}].concat(_toConsumableArray(obj.needed_events));
			//console.log('getting che expr', str);
			return str;
		}
	}
};
},{"../../shche/shche":20}],9:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

var Parser = require('../Parser');
var utils = require('../utils');
var Obj = utils.Obj;
var Arr = utils.Arr;

var get_by_selector = function get_by_selector(name, $el) {
	var children = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

	if (name === null) return null;
	if (name === '__root') return $('body');
	var method = children ? 'children' : 'find';
	var res = $el ? $el[method]('[data-fr=' + name + ']') : null;
	//console.info("GBS", '[data-fr=' + name + ']', res ? res.length : null, $el ? $el.html() : '');
	return res;'';
};

var arr_changes_to_child_changes = function arr_changes_to_child_changes(item_hash, arr_change) {
	//console.log('beyond the reals of death', item_hash, arr_change);
	if (!arr_change) {
		return;
	}
	return arr_change.map(function (val, key) {
		var new_val = val.slice();
		new_val[3] = new_val[2];
		new_val[2] = item_hash;
		return new_val;
	});
};

var get_arr_changes = function get_arr_changes() {
	var arr = [];
	var id = -1;
	var map = {};
	return function (new_arr) {
		var changes = [];
		utils.arr_different(new_arr, arr, function (key) {
			// create new element
			map[key] = ++id;
			changes.push(['add', id, new_arr[key]]);
		});
		//console.log('Computing changes between new an old arrays', new_arr, arr);
		utils.arr_different(arr, new_arr, function (key) {
			// create new element
			changes.push(['remove', map[key]]);
			delete map[key];
		});
		utils.arr_common(arr, new_arr, function (key) {
			changes.push(['change', map[key], new_arr[key]]);
		});
		arr = utils.sh_copy(new_arr);
		return changes;
	};
};

module.exports = {
	cellMatchers: {
		prevValue: {
			// ^foo -> previous values of 'foo'
			name: 'PrevValue',
			regexp: new RegExp('^(\-|\:)?\\^(.*)', 'i'),
			func: function func(matches, pool, context, packages) {
				if (context == 'setter') return;
				var cellname = matches[2];
				Parser.parse_fexpr(['closure', function () {
					var val;
					//console.log('Returning closure func!');
					return function (a) {
						//console.log('getting prev val');
						var old_val = val;
						val = a;
						return [old_val, a];
					};
				}, cellname], pool, '^' + cellname, packages);
			}
		}
	},
	macros: {
		interval: function interval(fs) {
			var _fs = _slicedToArray(fs, 2),
			    interval_ms = _fs[0],
			    flag = _fs[1];

			if (flag) {
				return ['asyncClosure', function () {
					var intervalId;
					var prev = false;
					return function (cb, start_stop) {
						if (start_stop === prev) {
							return;
						}
						if (Firera.is_def(start_stop) && start_stop) {
							intervalId = setInterval(cb, interval_ms);
						} else {
							clearInterval(intervalId);
						}
						prev = start_stop;
					};
				}, flag];
			} else {
				return ['asyncClosure', function () {
					return function (cb) {
						setInterval(cb, interval_ms);
					};
				}];
			}
		},
		toggle: function toggle(fs) {
			var _fs2 = _slicedToArray(fs, 2),
			    cell = _fs2[0],
			    def = _fs2[1];

			return ['closure', function () {
				var now = def !== undefined ? def : true;
				return function (cb) {
					if (now) {
						now = false;
					} else {
						now = true;
					}
					return now;
				};
			}, cell];
		},
		skipIf: function skipIf(fs) {
			var _fs3 = _toArray(fs),
			    compare_func = _fs3[0],
			    func = _fs3[1],
			    args = _fs3.slice(2);

			return ['asyncClosure', function () {
				var prev = [];
				return function (cb) {
					for (var _len = arguments.length, inner_args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
						inner_args[_key - 1] = arguments[_key];
					}

					if (compare_func(prev, inner_args)) {
						var res = func.apply(null, inner_args);
						prev = inner_args;
						cb(res);
					}
				};
			}].concat(_toConsumableArray(args));
		},
		transist: function transist(fs) {
			var func;
			if (fs[0] instanceof Function) {
				func = fs.shift();
			}
			return [function (cellA, cellB) {
				if (cellA) {
					return func ? func(cellB) : cellB;
				} else {
					return Firera.noop;
				}
			}].concat(fs);
		},
		map: function map(fs) {
			var _fs4 = _slicedToArray(fs, 1),
			    map = _fs4[0];

			var cells = Object.keys(map);
			var func = function func(cellname, val) {
				if (!(map[cellname] instanceof Function)) {
					return map[cellname];
				}
				return map[cellname](val);
			};
			return ['funnel', func].concat(_toConsumableArray(cells));
		},
		transistAll: function transistAll(fs) {
			var _fs5 = _toArray(fs),
			    func = _fs5[0],
			    rest = _fs5.slice(1);

			return [function (cellA) {
				for (var _len2 = arguments.length, restArgs = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
					restArgs[_key2 - 1] = arguments[_key2];
				}

				if (cellA) {
					return func.apply(restArgs);
				} else {
					return Firera.noop;
				}
			}].concat(rest);
		},
		'&&': function _(fs) {
			return [function (cellA, cellB) {
				return cellA && cellB;
			}].concat(fs);
		},
		'==': function _(fs) {
			return [function (cellA, cellB) {
				return cellA == cellB;
			}].concat(fs);
		},
		'!': function _(fs) {
			return [function (a) {
				return !a;
			}].concat(fs);
		},
		equal: function equal(fs) {
			return [function (a, b) {
				return a === b;
			}].concat(fs);
		},
		'+': function _(fs) {
			return [function (a, b) {
				return Number(a) + Number(b);
			}].concat(fs);
		},
		'-': function _(fs) {
			return [function (a, b) {
				return a - b;
			}].concat(fs);
		},
		'*': function _(fs) {
			return [function (a, b) {
				return a * b;
			}].concat(fs);
		},
		'/': function _(fs) {
			return [function (a, b) {
				return a / b;
			}].concat(fs);
		},
		'%': function _(fs) {
			return [function (a, b) {
				return a % b;
			}].concat(fs);
		},
		accum: function accum(funcstring) {
			return ['closure', function () {
				var arr = [];
				return function (a) {
					arr.push(a);
					return arr;
				};
			}, funcstring[0]];
		},
		first: function first(funcstring) {
			return [function (a) {
				return a;
			}].concat(_toConsumableArray(funcstring));
		},
		second: function second(funcstring) {
			return [function (a, b) {
				return b;
			}].concat(_toConsumableArray(funcstring));
		},
		firstDefined: function firstDefined(funcstring) {
			return [function () {
				for (var i in arguments) {
					if (arguments[i] !== undefined) return arguments[i];
				}
			}].concat(_toConsumableArray(funcstring));
		},
		firstTrue: function firstTrue(funcstring) {
			return [function () {
				//console.log('Looking for firstTrue', arguments);
				for (var i in arguments) {
					if (arguments[i]) return arguments[i];
				}
			}].concat(_toConsumableArray(funcstring));
		},
		valMap: function valMap(funcstring) {
			var valMap;
			if (funcstring[0] instanceof Object && !(funcstring[0] instanceof Array)) {
				valMap = funstring.shift();
			} else {
				// true/false by default
				valMap = {};
				valMap[funcstring[0]] = true;
				valMap[funcstring[1]] = false;
			}
			var func = function func(cell, val) {
				return valMap[cell];
			};
			return ['funnel', func].concat(_toConsumableArray(funcstring));
		},
		firstTrueCb: function firstTrueCb(funcstring) {
			var cb = funcstring[0];
			var fncstr = funcstring.slice(1);
			return [function () {
				//console.log('Looking for firstTrue', arguments);
				for (var i in arguments) {
					if (cb(arguments[i])) return arguments[i];
				}
			}].concat(_toConsumableArray(fncstr));
		},
		asArray: function asArray(funcstring) {
			var subscribe_to = '*/*';
			if (funcstring[0] instanceof Array) {
				// its an array of fields
				var fields = funcstring[0].map(function (a) {
					return '*/' + a;
				});
				subscribe_to = ['funnel', utils.ids].concat(_toConsumableArray(fields));
			}
			return ['closureFunnel', function () {
				var arr = [];
				//console.log('Returning closure');
				return function (cell, values) {
					if (cell === '$arr_data.changes') {
						for (var i in values) {
							var _values$i = _slicedToArray(values[i], 4),
							    type = _values$i[0],
							    index = _values$i[1],
							    _ = _values$i[2],
							    val = _values$i[3];

							if (type === 'add') {
								var added_obj = {};
								var _iteratorNormalCompletion = true;
								var _didIteratorError = false;
								var _iteratorError = undefined;

								try {
									for (var _iterator = fields[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
										var fieldname = _step.value;

										fieldname = fieldname.replace("*/", "");
										added_obj[fieldname] = val[fieldname];
									}
								} catch (err) {
									_didIteratorError = true;
									_iteratorError = err;
								} finally {
									try {
										if (!_iteratorNormalCompletion && _iterator.return) {
											_iterator.return();
										}
									} finally {
										if (_didIteratorError) {
											throw _iteratorError;
										}
									}
								}

								arr[index] = added_obj;
							} else if (type === 'remove') {
								delete arr[index];
								//arr.splice(index, 1);
							}
						}
					} else {
						if (values) {
							var _values = _slicedToArray(values, 2),
							    _fieldname = _values[0],
							    _val = _values[1];

							_fieldname = _fieldname.replace("*/", "");
							if (_val) {
								//console.log('?', val, arr, fieldname, arr[val[0]]);
								arr[_val[0]][_fieldname] = _val[1];
							}
						}
					}
					return utils.arr_fix_keys(arr);
				};
			}, subscribe_to, '$arr_data.changes'];
		},
		indices: function indices(funcstring) {
			var func = funcstring[0];
			var field = '*/' + funcstring[1];
			if (!funcstring[1]) {
				field = '*/' + func;
				func = utils.id;
			}
			return ['closureFunnel', function () {
				var indices = new Set();
				return function (fieldname, vl) {
					if (field === fieldname) {
						var _vl = _slicedToArray(vl, 2),
						    index = _vl[0],
						    val = _vl[1];

						var res = func(val);
						if (res) {
							indices.add(index);
						} else {
							indices.delete(index);
						}
					} else {
						if (!vl) return indices;
						var _iteratorNormalCompletion2 = true;
						var _didIteratorError2 = false;
						var _iteratorError2 = undefined;

						try {
							for (var _iterator2 = vl[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
								var _step2$value = _slicedToArray(_step2.value, 2),
								    change_type = _step2$value[0],
								    _index = _step2$value[1];

								if (change_type === 'remove') {
									indices.delete(_index);
								}
							}
						} catch (err) {
							_didIteratorError2 = true;
							_iteratorError2 = err;
						} finally {
							try {
								if (!_iteratorNormalCompletion2 && _iterator2.return) {
									_iterator2.return();
								}
							} finally {
								if (_didIteratorError2) {
									throw _iteratorError2;
								}
							}
						}
					}
					return indices;
				};
			}, field, '$arr_data.changes'];
		},
		reduce: function reduce(funcstring) {
			var field = '*/' + funcstring[0];
			var config = funcstring[1];
			var res = config.def;
			var vals = {};
			return ['closureFunnel', function () {
				return function (cell, chng) {
					var key, val;
					if (cell === '$arr_data.changes') {
						if (chng instanceof Array) {
							for (var i in chng) {
								if (!chng[i] instanceof Array) return;
								var type = chng[i][0];
								key = chng[i][1];
								val = chng[i][3] ? chng[i][3][funcstring[0]] : undefined;
								if (type === 'add') {
									res = config.add(val, res);
									vals[key] = val;
								}
								if (type === 'remove') {
									res = config.add(vals[key], res);
									delete vals[key];
								}
							}
						}
					} else {
						if (chng) {
							var _chng = _slicedToArray(chng, 2);

							key = _chng[0];
							val = _chng[1];

							res = config.change(val, vals[key], res);
							vals[key] = val;
						}
					}
					return res;
				};
			}, field, '$arr_data.changes'];
		},
		count: function count(funcstring) {
			var fieldname = funcstring[0];
			var pieces = fieldname.split('/');
			fieldname = pieces.pop();
			var prefix = pieces.length ? pieces.join('/') + '/' : '';
			if (fieldname === '*') {
				// just count all
				return [prefix + '$arr_data.length'];
			}
			return ['closureFunnel', function () {
				var count = 0;
				var vals = {};
				return function (cell, chng) {
					if (utils.path_cellname(cell) == '$arr_data.changes') {
						// finding deletion
						Obj.each(chng.filter(function (a) {
							return a[0] === 'remove';
						}), function (a) {
							if (vals[a[1]]) {
								//console.log('Removing one');
								count--;
							}
							delete vals[a[1]];
						});
						return count;
					}
					if (!chng) return count;

					var _chng2 = _slicedToArray(chng, 2),
					    key = _chng2[0],
					    val = _chng2[1];

					var prev_val = vals[key];
					if (prev_val === undefined) {
						if (val) count++;
					} else {
						if (prev_val !== val) {
							if (val) {
								count++;
							} else {
								count--;
							}
						}
					}
					vals[key] = val;
					//console.log('Now count', count);
					return count;
				};
			}, prefix + '*/' + fieldname, prefix + '$arr_data.changes'];
		},
		join: function join(funcstring) {
			return ['funnel', utils.second].concat(funcstring);
		},
		list: function list(funcstring) {
			var props = funcstring[0];
			if (!props instanceof Object) {
				console.error('List properties should be an object!');
			}
			var item_type = props.type;
			if (!props.push && !props.datasource && !props.deltas && !props.data && !funcstring[1]) {
				console.warn('No item source provided for list', funcstring);
			}
			//console.log('List properties', props);
			var deltas_func;
			if (props.push) {
				deltas_func = ['map', {
					$push: function $push(val) {
						if (val) {
							return [['add', null, val]];
						}
					},
					$pop: function $pop(key) {
						if (key || key === 0 || key === '0') {
							if (key instanceof Array || key instanceof Set) {
								var arr = [];
								var _iteratorNormalCompletion3 = true;
								var _didIteratorError3 = false;
								var _iteratorError3 = undefined;

								try {
									for (var _iterator3 = key[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
										var k = _step3.value;

										arr.push(['remove', k]);
									}
								} catch (err) {
									_didIteratorError3 = true;
									_iteratorError3 = err;
								} finally {
									try {
										if (!_iteratorNormalCompletion3 && _iterator3.return) {
											_iterator3.return();
										}
									} finally {
										if (_didIteratorError3) {
											throw _iteratorError3;
										}
									}
								}

								return arr;
							}
							return [['remove', key]];
						}
					}
				}];
			} else if (props.deltas) {
				deltas_func = [id, props.deltas];
			} else if (props.data) {
				deltas_func = ['closure', get_arr_changes, ['just', props.data]];
			} else {
				deltas_func = ['closure', get_arr_changes, '$datasource'];
			}
			var all_lists_mixin = {
				$no_auto_template: true,
				$deltas: deltas_func,
				/*$init: {
    	$template: "<div>Ololo</div>"
    },*/
				'$arr_data': ['nestedClosure', function () {
					var id = -1;
					var length = 0;
					return function (cb, changes) {
						if (!changes || !changes.length) return;
						var chngs = arr_changes_to_child_changes(item_type, changes);
						//console.log('Got changes:', frozen(chngs), 'from', changes);
						chngs.forEach(function (one) {
							switch (one[0]) {
								case 'add':
									one[1] = String(id < 1000000 ? ++id : -1);
									++length;
									break;
								case 'remove':
									--length;
									break;
							}
						});
						cb('changes', chngs);
						cb('length', length);
					};
				}, '$deltas'],
				$list_template_writer: ['nestedClosure', function () {
					var index_c = 3;
					var index_map = {};
					return function (cb, deltas, $el) {
						if ($el === Firera.undef) return;
						if (!$el) return;
						for (var i in deltas) {
							var type = deltas[i][0];
							var key = deltas[i][1];
							switch (type) {
								case 'add':
									$el.append('<div data-fr="' + ++index_c + '" data-fr-name="' + key + '"></div>');
									index_map[key] = index_c;
									// I domt know...
									break;
								case 'remove':
									$el.children('[data-fr=' + index_map[key] + ']').remove();
									break;
							}
						}
						cb('dummy', true);
						cb('index_map', index_map);
						return true;
					};
				}, '$arr_data.changes', '$real_el'],
				$htmlbindings: ['closure', function () {
					return function ($el, map) {
						if (!$el || !map) return;
						var res = Obj.map(map, function (n, i) {
							return get_by_selector(map[i], $el);
						});
						return res;
					};
				}, '$real_el', '$list_template_writer.index_map'],
				$children: ['$arr_data.changes']
			};
			if (props.push) {
				all_lists_mixin.$push = props.push;
				if (!props.push instanceof Array) {
					console.error('List\'s PUSH property should be a F-expression(array), given', props.push);
				}
			}
			if (props.pop) {
				all_lists_mixin.$pop = props.pop;
				if (!props.pop instanceof Array) {
					console.error('List\'s POP property should be a F-expression(array), given', props.pop);
				}
			}
			if (props.datasource) {
				all_lists_mixin.$datasource = props.datasource;
			}
			var fnc;
			var list_own_type = Object.assign(all_lists_mixin, props.self || {});
			if (props.create_destroy) {
				fnc = [function (a) {
					if (a) {
						return list_own_type;
					} else {
						return false;
					}
				}, props.create_destroy];
			} else {
				fnc = [utils.always(list_own_type)];
			}
			return fnc;
		},
		arr_deltas: function arr_deltas(funcstring) {
			var cell = funcstring[0];
			return ['closure', function () {
				var val = [];
				return function (new_arr) {
					var deltas = utils.arr_deltas(val, new_arr);
					val = new_arr;
					//console.info('deltas are', deltas);
					return deltas;
				};
			}, cell];
		}
	}
};
},{"../Parser":5,"../utils":15}],10:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Parser = require('../Parser');
var $ = require('jquery');

var filter_attr_in_path = function filter_attr_in_path(e) {
	if (e) {
		var el = e.target;
		while (el) {
			if (el.getAttribute('data-fr-grid-root')) {
				return false;
			}
			el = el.parentNode;
			if (el === e.delegateTarget) {
				break;
			}
		}
	}
	return true;
};
var filter_attr_in_parents = function filter_attr_in_parents(parent_node, index, el) {
	for (;;) {
		el = el.parentElement;
		if (!el) return true;
		if (el.hasAttribute('data-fr')) {
			return el.children[0] === parent_node;
		}
	}
};
var htmlPipeAspects = {
	attr: function attr(el, _attr) {
		if (!el) return;
		return $(el).attr(_attr);
	}
};

module.exports = {
	cellMatchers: {
		HTMLAspects: {
			// ^foo -> previous values of 'foo'
			name: 'HTMLAspects',
			regexp: new RegExp('^(\-|\:)?([^\|]*)?\\|(.*)', 'i'),
			func: function func(matches, pool, context, packages) {
				var get_params = function get_params(aspect) {
					var params = aspect.match(/([^\(]*)\(([^\)]*)\)/);
					if (params && params[1]) {
						aspect = params[1];
						params = params[2].split(',');
					}
					return [aspect, params || []];
				};
				var cellname = matches[0];
				var aspects = matches[3].split('|');
				//console.log('Got following aspects', aspects);
				var aspect = aspects[0];
				var pipe = aspects.slice(1);
				if (pipe.length) {
					pipe = pipe.map(get_params);
				}

				var make_resp = !pipe.length ? function (cb, val) {
					return cb(val);
				} : function (cb, e) {
					var res = e.target;
					var _iteratorNormalCompletion = true;
					var _didIteratorError = false;
					var _iteratorError = undefined;

					try {
						for (var _iterator = pipe[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
							var _step$value = _slicedToArray(_step.value, 2),
							    asp = _step$value[0],
							    pars = _step$value[1];

							if (!htmlPipeAspects[asp]) {
								console.error('Unknown pipe aspect:', asp);
								continue;
							}
							res = htmlPipeAspects[asp].apply(htmlPipeAspects, [res].concat(_toConsumableArray(pars)));
						}
					} catch (err) {
						_didIteratorError = true;
						_iteratorError = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion && _iterator.return) {
								_iterator.return();
							}
						} finally {
							if (_didIteratorError) {
								throw _iteratorError;
							}
						}
					}

					return cb(res);
				};
				var selector = matches[2];
				var all_subtree = false;
				var func, params;
				var setters = new Set(['visibility', 'display', 'setval', 'hasClass', 'css']);

				var _get_params = get_params(aspect);

				var _get_params2 = _slicedToArray(_get_params, 2);

				aspect = _get_params2[0];
				params = _get_params2[1];

				if (aspect[0] === '>') {
					all_subtree = true;
					aspect = aspect.substr(1);
				}
				//console.info('Aspect:', aspect, context, params, matches[2]);
				//if(context === null && setters.has(aspect)) context = 'setter';
				if (context === 'setter' && !setters.has(aspect) || context !== 'setter' && setters.has(aspect)) {
					return;
				}
				switch (aspect) {
					case 'getval':
						func = function func(cb, vals) {
							var onch = function onch(el) {
								var type = el.attr('type');
								var val;
								if (type == 'checkbox') {
									val = el.prop('checked');
								} else {
									val = el.val();
								}
								//console.log('CHange', el, val, selector);
								make_resp(cb, val);
							};
							var onChange = function onChange(e) {
								if (!all_subtree && !filter_attr_in_path(e)) {
									return;
								}
								onch($(this));
							};
							var onKeyup = function onKeyup(e) {
								if (!all_subtree && !filter_attr_in_path(e)) {
									return;
								}
								var el = $(this);
								var type = el.attr('type');
								var val;
								if (type == 'checkbox') {
									return;
								} else {
									val = el.val();
								}
								make_resp(cb, val);
							};

							var _vals = _slicedToArray(vals, 2),
							    $prev_el = _vals[0],
							    $now_el = _vals[1];
							//console.log('Assigning handlers for ', cellname, arguments, $now_el.find(selector));


							if (Firera.is_def($prev_el)) {
								$prev_el.off('keyup', selector);
								$prev_el.off('change', selector);
							}
							if (Firera.is_def($now_el)) {
								$now_el.on({ keyup: onKeyup, change: onChange }, selector);
							}
						};
						break;
					case 'click':
						if (selector === 'other') {
							func = function func(cb, vals) {
								if (!vals) return;

								var _vals2 = _slicedToArray(vals, 2),
								    $prev_el = _vals2[0],
								    $now_el = _vals2[1];

								if (!Firera.is_def($now_el)) return;
								if ($now_el === Firera.undef) return;
								$(document).click(function (e, originalTarget) {
									var is_other = !$.contains($now_el.get()[0], originalTarget);
									if (is_other) {
										make_resp(cb, true);
									}
								});
							};
						} else {
							func = function func(cb, vals) {
								if (!vals) return;

								var _vals3 = _slicedToArray(vals, 2),
								    $prev_el = _vals3[0],
								    $now_el = _vals3[1];

								if (!Firera.is_def($now_el)) return;
								if ($now_el === Firera.undef) return;
								//console.log('Assigning handlers for ', cellname, arguments, $now_el);
								if ($prev_el && $prev_el !== Firera.undef) {
									$prev_el.off('click', selector);
								}
								if ($now_el.length === 0) {
									console.warn('Assigning handlers to nothing', $now_el);
								}
								$now_el.on('click', selector, function (e) {
									if (!all_subtree && !filter_attr_in_path(e)) {
										return;
									}
									make_resp(cb, e);
									if (e.originalEvent && e.originalEvent.target) {
										$(document).trigger('click', e.originalEvent.target);
									}
									return false;
								});
							};
						}
						break;
					case 'focus':
						func = function func(cb, vals) {
							if (!vals) return;

							var _vals4 = _slicedToArray(vals, 2),
							    $prev_el = _vals4[0],
							    $now_el = _vals4[1];

							if (!Firera.is_def($now_el)) return;
							if ($prev_el) {
								$prev_el.off('focus', selector);
							}
							if ($now_el.length === 0) {
								console.log('Assigning handlers to nothing', $now_el);
							}
							$now_el.on('focus', selector, function (e) {
								if (!all_subtree && !filter_attr_in_path(e)) {
									return;
								}
								make_resp(cb, e);
								return false;
							});
						};
						break;
					case 'press':
						func = function func(cb, vals) {
							var _vals5 = _slicedToArray(vals, 2),
							    $prev_el = _vals5[0],
							    $now_el = _vals5[1];

							if (!Firera.is_def($now_el)) return;
							//console.log('Assigning handlers for ', cellname, arguments, $now_el);
							if ($prev_el) {
								$prev_el.off('keyup', selector);
							}
							$now_el.on('keyup', selector, function (e) {
								if (!all_subtree && !filter_attr_in_path(e)) {
									return;
								}
								var btn_map = {
									'13': 'Enter',
									'27': 'Esc'
								};
								if (params.indexOf(btn_map[e.keyCode]) !== -1) {
									make_resp(cb, e);
								}
							});
						};
						break;
					case 'hasClass':
						func = function func($el, val) {
							if (!Firera.is_def($el)) return;
							if (!Firera.is_def(val)) {
								val = false;
							}

							var _params = params,
							    _params2 = _slicedToArray(_params, 1),
							    classname = _params2[0];

							$el.toggleClass(classname, val);
						};
						break;
					case 'enterText':
						func = function func(cb, vals) {
							var _vals6 = _slicedToArray(vals, 2),
							    $prev_el = _vals6[0],
							    $now_el = _vals6[1];

							if (!$now_el) return;
							if ($prev_el) {
								$prev_el.off('keyup', selector);
							}
							//$now_el.on('keyup', selector, function(e){
							//});
							var el = $now_el[0];
							el.onkeyup = function (e) {
								if (e.target === $now_el.find(selector)[0]) {
									if (!all_subtree && !filter_attr_in_path(e)) {
										return;
									}
									if (e.keyCode == 13) {
										make_resp(cb, e.target.value);
									}
								}
							};
						};
						break;
					case 'visibility':
						func = function func($el, val) {
							if (!Firera.is_def($el)) {
								return;
							}
							if (val === undefined) {
								return;
							}
							if (val) {
								$el.css('visibility', 'visible');
							} else {
								$el.css('visibility', 'hidden');
							}
						};
						break;
					case 'css':
						var _params3 = params,
						    _params4 = _slicedToArray(_params3, 1),
						    property = _params4[0];

						func = function func($el, val) {
							//console.log('running css setter', $el);
							$el.css(property, val);
						};
						break;
					case 'display':
						func = function func($el, val) {
							if (!Firera.is_def($el) || val === undefined) {
								return;
							}
							if (val) {
								$el.css('display', 'block');
							} else {
								$el.css('display', 'none');
							}
						};
						break;
					case 'setval':
						func = function func($el, val) {
							$el.val(val);
						};
						break;
					default:
						throw new Error('unknown HTML aspect: ' + aspect);
						break;
				}
				if (context === 'setter') {
					Parser.parse_fexpr([func, [function (a) {
						if (!Firera.is_def(a)) return $();
						if (!selector) return a;
						if (selector === 'other') return a;
						var node = a.find(selector).filter(filter_attr_in_parents.bind(null, a.get()[0]));
						return node;
					}, '-$real_el', '$html_skeleton_changes'], cellname], pool, Parser.get_random_name(), packages);
					//console.log('OLOLO2', Object.keys(pool.cell_types.$real_el.children), packages);
				} else {
					Parser.parse_fexpr(['asyncClosure', function () {
						var el;
						return function (cb, val) {
							func(cb, [el, val]);
							el = val;
						};
					}, '-$real_el', '$html_skeleton_changes'], pool, cellname, packages);
				}
			}
		}
	}
};
},{"../Parser":5,"jquery":7}],11:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var rendered = {};
var templates = {};
var closest_templates = {};
var utils = require('../utils');
var $ = require('jquery');

var parse_rec = function parse_rec(app, grid_id, cell) {
	var grid = app.getGrid(grid_id);
	var res = {
		val: grid.cell_values[cell],
		grid_id: grid_id,
		children: {}
	};
	for (var gridname in grid.linked_grids) {
		var gr_id = grid.linked_grids[gridname];
		res.children[gridname] = parse_rec(app, gr_id, cell);
	}
	return res;
};
var is_list_without_templates = function is_list_without_templates(struct) {
	return struct.children.length && !struct.children[0].val;
};

var get_arr_val = function get_arr_val(app, grid_id) {
	var vals = app.getGrid(grid_id).getChildrenValues();
	return vals;
};

var render_rec = function render_rec(app, struct, closest_existing_template_path, skip) {
	var grid = app.getGrid(struct.grid_id);
	utils.init_if_empty(rendered, app.id, {}, grid.id, true);
	if (struct.val) {
		var context = Object.assign({}, grid.cell_values);
		utils.init_if_empty(templates, app.id, {});
		templates[app.id][grid.path] = struct.tmpl = new Firera.Ozenfant(struct.val);

		for (var key in struct.children) {
			if (is_list_without_templates(struct.children[key])) {
				context[key] = get_arr_val(app, struct.children[key].grid_id);
				render_rec(app, struct.children[key], grid.path, true);
			} else {
				context[key] = render_rec(app, struct.children[key], grid.path);
			}
		}
		return struct.tmpl.getHTML(context);
	} else {

		if (!skip) {
			var res = [];
			for (var _key in struct.children) {
				res.push(render_rec(app, struct.children[_key]));
			}
			return res.join('');
		} else {
			utils.init_if_empty(closest_templates, app.id, {});
			var path0 = grid.path.replace(closest_existing_template_path, '/');
			var p0 = path0.split('/');
			var res = '';
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = p0[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var p = _step.value;

					if (p === '') continue;
					if (Number(p) == p) {
						res += '[' + p + ']';
					} else {
						res += '/' + p;
					}
				}
				//console.log('R', res);
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}

			closest_templates[app.id][grid.path] = {
				template: templates[app.id][closest_existing_template_path],
				path: res
			};
			for (var _key2 in struct.children) {
				render_rec(app, struct.children[_key2], closest_existing_template_path, true);
			}
		}
	}
};
var set_bindings_rec = function set_bindings_rec(app, struct, el, is_root, skip) {
	if (!struct) debugger;
	var grid = app.getGrid(struct.grid_id);
	if (struct.tmpl) {
		$(el).attr('data-fr-grid-root', 1);
		if (is_root) {
			struct.tmpl.setFirstNode(el).updateBindings();
		} else {
			struct.tmpl.setRoot(el).updateBindings();
		}
		grid.set('$real_el', $(el));
		for (var key in struct.children) {
			var _el = struct.tmpl.bindings[key];
			if (_el) {
				set_bindings_rec(app, struct.children[key], _el, false, true);
			}
		}
	} else {
		if (el) {
			grid.set('$real_el', $(el));
		}
		for (var _key3 in el.children) {
			if (el.children.hasOwnProperty(_key3) && struct.children[_key3]) {
				set_bindings_rec(app, struct.children[_key3], el.children[_key3], true, !skip);
			}
		}
	}
};
var render = function render(app, start, node) {
	var struct = parse_rec(app, start.id, '$template');
	var html = render_rec(app, struct);
	if (!node) debugger;
	node.innerHTML = html;
	set_bindings_rec(app, struct, node);
	//console.log('html', html);
};

var get_parent_grid = function get_parent_grid(app, grid_id) {
	return app.getGrid(app.getGrid(grid_id).parent);
};

var get_template = function get_template(app, path) {
	return templates[app.id][path];
};

var get_binding = function get_binding(template, name) {
	return template.bindings[name];
};

var container;

var get_root_node_from_html = function get_root_node_from_html(html) {
	var children = container.html(html).children();
	if (children[1]) {
		console.error('Template should have only one root node,', children.length - 1, 'given in', html);
	}
	return children[0];
};

/*var get_path_binding = (app_id, path) => {
	var pieces = path.split('/');
	var last = pieces[pieces.length - 1];
	if(Number(last) == last){
		// it's list item
		var parent_name = pieces[pieces.length - 2];
		var parpar_path = pieces.slice(0, pieces.length - 2).join('/');
		parpar_path = parpar_path === '' ? '/' : parpar_path;
		return templates[app_id][parpar_path].bindings[parent_name].childNodes[Number(last) + 1];
	} else {
		console.log('should be implemented!');
	}
}*/

module.exports = {
	eachGridMixin: {
		'$ozenfant.writer': [function (_ref, template_path, app_id) {
			var _ref2 = _slicedToArray(_ref, 2),
			    cell = _ref2[0],
			    val = _ref2[1];

			if (cell[0] === '$') return;
			if (!template_path || !app_id || !templates[app_id] || cell.indexOf('/') !== -1) return;
			var template = templates[app_id] ? templates[app_id][template_path] : false;
			if (!template) {
				if (!closest_templates[app_id]) return;
				var dt = closest_templates[app_id][template_path];
				var path = dt.path + '/' + cell;
				dt.template.set(path, val);
				return;
			}
			//console.log('Set', cell, val, template.state[cell]);
			template.set(cell, val);
		}, '*', '-$path', '-$app_id'],
		'$html_skeleton_changes': ['$real_el'],
		'$ozenfant.remover': [function (_, path, app_id) {
			var template = templates[app_id][path];
			if (template && template.root) {
				template.root.remove();
			} else {
				//debugger;
			}
			delete templates[app_id][path];
		}, '$remove', '-$path', '-$app_id']
	},
	onBranchCreated: function onBranchCreated(app, grid_id, path, parent) {
		var self = app.getGrid(grid_id);
		if (!parent) {
			var node = self.cell_values.$el.get()[0];
			container = $('<div/>').appendTo('body').css('display', 'none').attr('id', 'ozenfant-container-hidden');
			render(app, self, node);
		}
		if (rendered[app.id] && rendered[app.id][parent]) {
			var parent_path = app.getGrid(parent).path;
			var parent_tmpl = templates[app.id][parent_path];
			if (parent_tmpl) {
				var node = parent_tmpl.bindings[self.name];
				if (!node) {
					console.error('No binding found for', self.name, 'in path', parent_path);
					return;
				}
				render(app, self, node);
			} else {
				// it's a list
				var parpar_template = get_template(app, get_parent_grid(app, parent).path);
				var parpar_binding = get_binding(parpar_template, app.getGrid(parent).name);
				if (!parpar_binding) {
					console.log('parent binding is absent!', get_parent_grid(app, parent).path);
					return;
				}
				var struct = parse_rec(app, grid_id, '$template');
				var html = render_rec(app, struct);
				var node = get_root_node_from_html(html);
				//parpar_binding.insertAdjacentHTML("beforeend", html);
				$(node).appendTo(parpar_binding);
				set_bindings_rec(app, struct, node, true);
			}
		}
	}
};
},{"../utils":15,"jquery":7}],12:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var Ozenfant = require('../../ozenfant/ozenfant');
var $ = require('jquery');

var is_def = function is_def(a) {
	return a !== undefined && a !== Firera.undef;
};
var init_from_path = function init_from_path(obj, path, val) {
	if (!(path instanceof Array)) {
		path = path.split('/');
	}
	for (var k in path) {
		var key = path[k];
		if (key === '') continue;
		if (obj[key] === undefined) {
			if (path[Number(k) + 1]) {
				obj[key] = {};
			} else {
				obj[key] = val;
			}
		}
		if (!(obj[key] instanceof Object)) {
			obj[key] = {};
		}
		obj = obj[key];
	}
};

var Tree = function Tree() {
	this.template_grid = {};
	this.template_tree = {};
	this.bindings = {};
	this.onUpdateBindingsCbs = {};
};
Tree.prototype.getHTML = function (path, node) {
	if (!node) return;
	if (node instanceof Ozenfant) {
		// its final template
		return this.template_grid[path].getHTML();
	} else {
		var template;
		if (template = this.template_grid[path]) {
			// its object
			for (var key in node) {
				var new_path = path == '/' ? path + key : path + '/' + key;
				template.set(key, this.getHTML(new_path, node[key]));
			}
			return template.getHTML();
		} else {
			// its array
			var res = [];
			for (var _key in node) {
				var new_path = path == '/' ? path + _key : path + '/' + _key;
				res.push('<div data-fr="' + _key + '" data-fr-name="' + _key + '">' + this.getHTML(new_path, node[_key]) + '</div>');
			}
			return res.join(' ');
		}
	}
};

Tree.prototype.onUpdateBinding = function (path, cb) {
	this.onUpdateBindingsCbs[path] = cb;
};

Tree.prototype.updateBindings = function (path, struct) {
	var el = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

	var template = this.template_grid[path];
	if (el) {
		this.bindings[path] = el;
	}
	if (!template) {
		// its list
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = el.children[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var child = _step.value;

				var num = child.getAttribute('data-fr-name');
				if (struct[num]) {
					var new_path = path == '/' ? path + num : path + '/' + num;
					this.updateBindings(new_path, struct[num], child);
				}
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}

		return;
	}
	if (el) {
		template.setRoot(el);
	}
	template.updateBindings();
	if (this.onUpdateBindingsCbs[path]) {
		this.onUpdateBindingsCbs[path]($(this.template_grid[path].root));
	}
	if (!(struct instanceof Object) || struct instanceof Ozenfant) {
		return;
	}
	for (var key in struct) {
		var new_path = path == '/' ? path + key : path + '/' + key;
		if (template.bindings[key]) {
			this.updateBindings(new_path, struct[key], template.bindings[key]);
		} else {
			//console.log('bindings not found!', template.bindings, key);
		}
	}
};

Tree.prototype.getBindingsRec = function (path) {
	//console.log('Look for bindings!', path);
	var parent = path.split('/');
	var key = parent.pop();
	var parent = parent.join('/');
	if (parent === '') {
		parent = '/';
	}
	var template = this.template_grid[parent];
	if (template) {
		return template.bindings[key];
	} else {
		var bnd = this.bindings[parent];
		if (!bnd) {
			if (parent) {
				bnd = this.getBindingsRec(parent);
			}
		}
		var bv = $(bnd).children('[data-fr=' + key + ']');
		if (!bv.length) {
			bv = $("<div/>").attr('data-fr', key).appendTo(bnd);
		}
		return bv.get()[0];
	}
};

Tree.prototype.render = function (root_path) {
	//timer('render', root_path);
	var branch = get_branch(this.template_tree, root_path);
	var res = this.getHTML(root_path, branch);
	var root_el = this.template_grid[root_path] ? this.template_grid[root_path].root : false;
	if (!root_el) {
		root_el = this.bindings[root_path];
	}
	if (!root_el) {
		root_el = this.getBindingsRec(root_path);
	}
	if (!root_el) {
		console.warn('Root DOM node($el) is undefined');
		return;
		// oh god...
	}
	root_el.innerHTML = res;
	//timer('update Bindings', root_path);
	this.updateBindings(root_path, branch, root_el);
	//timer('--- render finished', root_path);
};

Tree.prototype.refresh = function () {
	var root_path;
	if (this.refreshPrefixPath) {
		root_path = this.refreshPrefixPath.join('/');
		this.refreshPrefixPath = false;
		root_path = root_path == '' ? '/' : root_path;
		if (root_path[0] !== '/') {
			root_path = '/' + root_path;
		}
	} else {
		root_path = '/';
	}
	this.render(root_path);
};

Tree.prototype.addToRefreshPool = function (path, pth) {
	if (!this.refreshPrefixPath) {
		this.refreshPrefixPath = pth;
	} else {
		for (var key in pth) {
			if (this.refreshPrefixPath[key] !== pth[key]) {
				break;
			}
		}
		this.refreshPrefixPath = this.refreshPrefixPath.slice(0, key);
	}
};

Tree.prototype.removeLeaf = function (path, skip_remove_node) {
	var skip_further = true;
	if (!skip_remove_node) {
		if (this.template_grid[path] && this.template_grid[path].root) {
			this.template_grid[path].root.remove();
		} else {
			skip_further = false;
		}
	}
	delete this.template_grid[path];
	delete this.bindings[path];
	var struct = get_branch(this.template_tree, path);
	for (var key in struct) {
		var new_path = path + '/' + key;
		this.removeLeaf(new_path, skip_further);
	}
};

var get_parent_path = function get_parent_path(path) {
	var p = path.split('/');
	var name = p.pop();
	if (Number(name) == name) {
		p.pop();
	}
	var parent = p.join('/');
	if (parent == '') {
		parent = '/';
	}
	return [name, parent];
};

Tree.prototype.setTemplate = function (path, template, context, el) {
	var pth = path.split('/');
	if (pth[0] === '') {
		pth = pth.slice(1);
	}
	if (pth[0] === '') {
		pth = pth.slice(1);
	}
	var tmpl = new Ozenfant(template);
	tmpl.state = context;
	if (el) {
		tmpl.root = el;
	}
	this.template_grid[path] = tmpl;
	init_from_path(this.template_tree, path, {});
	this.addToRefreshPool(path, pth);

	var _get_parent_path = get_parent_path(path),
	    _get_parent_path2 = _slicedToArray(_get_parent_path, 2),
	    name = _get_parent_path2[0],
	    parent = _get_parent_path2[1];

	if (this.template_grid[parent] && !(Number(name) == name && name.length)) {
		this.refresh();
	}
};

var ozenfant_trees = {};

var get_branch = function get_branch(tree, path) {
	var pth = path.split('/');
	var _iteratorNormalCompletion2 = true;
	var _didIteratorError2 = false;
	var _iteratorError2 = undefined;

	try {
		for (var _iterator2 = pth[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
			var k = _step2.value;

			if (k === '') continue;
			if (!tree[k]) {
				break;
			}
			tree = tree[k];
		}
	} catch (err) {
		_didIteratorError2 = true;
		_iteratorError2 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion2 && _iterator2.return) {
				_iterator2.return();
			}
		} finally {
			if (_didIteratorError2) {
				throw _iteratorError2;
			}
		}
	}

	return tree;
};

var get_tree = function get_tree(app_id) {
	var tree;
	if (!ozenfant_trees[app_id]) {
		ozenfant_trees[app_id] = tree = new Tree();
	} else {
		tree = ozenfant_trees[app_id];
	}
	return tree;
};

var ozenfant_new = {
	eachGridMixin: {
		'$real_el': ['asyncClosure', function () {
			var gridname, template;
			return function (cb, template, path, app_id, context, el) {
				if (!app_id) return;
				var pth = path === '/' ? '' : path;
				var tree = get_tree(app_id);
				tree.onUpdateBinding(path, cb);
				tree.setTemplate(path, template, context, is_def(el) ? el.get()[0] : false);
			};
		}, '$template', '-$path', '-$app_id', '-$real_values', '-$el'],
		'$ozenfant.list_render': [function (new_children, path, app_id) {
			var skip = true;
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = new_children[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var c = _step3.value;

					if (c[0] === 'add' || c[0] === 'remove') {
						skip = false;
						break;
					}
				}
			} catch (err) {
				_didIteratorError3 = true;
				_iteratorError3 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion3 && _iterator3.return) {
						_iterator3.return();
					}
				} finally {
					if (_didIteratorError3) {
						throw _iteratorError3;
					}
				}
			}

			if (skip) {
				//console.log('SKIP LIST RENDER', children);
				return;
			}
			var parent = get_parent_path(path)[1];
			var tree = get_tree(app_id);
			if (tree.bindings[parent]) {
				tree.render(parent);
			}
		}, '$all_children', '-$path', '-$app_id'],
		'$ozenfant.writer': [function (_ref, template_path, app_id) {
			var _ref2 = _slicedToArray(_ref, 2),
			    cell = _ref2[0],
			    val = _ref2[1];

			if (!template_path || !app_id || !ozenfant_trees[app_id] || cell.indexOf('/') !== -1) return;
			var pth = template_path;
			var template = get_tree(app_id).template_grid[pth];
			if (!template) {
				return;
			}
			template.set(cell, val);
		}, '*', '-$path', '-$app_id'],
		'$html_skeleton_changes': ['$real_el'],
		'$ozenfant.remover': [function (_, path, app_id) {
			ozenfant_trees[app_id].removeLeaf(path);
		}, '$remove', '-$path', '-$app_id']
	}
};

module.exports = ozenfant_new;
},{"../../ozenfant/ozenfant":18,"jquery":7}],13:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var get_ozenfant_template = function get_ozenfant_template(str, context) {
	if (str) {
		var template = new Ozenfant(str);
		var filtered_context = {};
		for (var k in context) {
			if (context[k] instanceof Object) {
				// dont write objects to html!
			} else {
				filtered_context[k] = context[k];
			}
		}
		//template.state = filtered_context;
		return template;
	}
};

var get_fields_map = function get_fields_map() {
	var map = {};
	return function (_ref) {
		var _ref2 = _slicedToArray(_ref, 2),
		    key = _ref2[0],
		    val = _ref2[1];

		map[key] = val;
		return val;
	};
};

var write_ozenfant_changes = function write_ozenfant_changes(change, template) {
	if (!template) return;

	var _change = _slicedToArray(change, 2),
	    k = _change[0],
	    v = _change[1];

	if (unusual_cell(k)) return;
	if (v instanceof Object) {
		// lol dont write objects to html!
		return;
	}
	template.set.apply(template, _toConsumableArray(change));
};

var collect_map = function collect_map() {
	var map = {};
	return function (_ref3) {
		var _ref4 = _slicedToArray(_ref3, 2),
		    key = _ref4[0],
		    val = _ref4[1];

		map[key] = val;
		return map;
	};
};

module.exports = {
	eachHashMixin: {
		'$ozenfant_el': [function (searcher, name) {
			var res;
			if (searcher instanceof Function) {
				res = searcher(name);
			}
			return res ? $(res) : false;
		}, '../$ozenfant.bindings_search', '$name'],
		'$list_el': [function (name, $el, map) {
			//console.log('search list', name, $el, map);
			if (name === null || name === undefined || !map) return;
			var num = map[name];
			return get_by_selector(num, $el, true);
		}, '$name', '../$real_el', '../$list_template_writer.index_map'],
		'$real_el': ['firstTrueCb', function ($el) {
			return $el && $el.length;
		}, '$el', '$list_el', '$ozenfant_el'],
		'$ozenfant_template2': [get_ozenfant_template, '$template', '-$real_values'],
		'$ozenfant': ['nested', function (cb, template, $el, context) {
			if (!template || !is_def($el)) return;
			var filtered_context = {};
			for (var k in context) {
				if (context[k] instanceof Object) {
					// dont write objects to html!
				} else {
					filtered_context[k] = context[k];
				}
			}
			if ($el) {
				template.render($el.get(0), filtered_context);
			}
			cb('bindings_search', function (str) {
				return template.bindings ? template.bindings[str] : false;
			});
			cb('html', template);
		}, ['html', 'bindings_search'], '$ozenfant_template2', '$real_el', '-$real_values'],
		//'$ozenfant_nested_templates': ['closure', get_fields_map, '*/$ozenfant.template'],
		'$ozenfant_writer': [write_ozenfant_changes, '*', '-$ozenfant_template2'],
		/*'$ozenfant_something': [(a, b) => {
  	return {
  		template: a,
  		children: b,
  	}
  }, '$ozenfant_template2', '$templates_map'],*/
		'$ozenfant_first_render': [function (_, struct, $el) {
			//var html = ozenfant_to_html_rec(struct);
			//console.log('First render!', struct, $el, html);
			//$el.html(html);				
		}, '$inited', '-$ozenfant_something', '-$real_el'],
		//'$templates_map': ['closure', collect_map, '*/$ozenfant_something'],
		'$html_skeleton_changes': ['$ozenfant.html'],
		'$ozenfant_remove': [function (_, $el) {
			if ($el) {
				$el.html('');
			}
		}, '$remove', '-$real_el']
	}
};
},{}],14:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var utils = require('../utils');
var $ = require('jquery');

var search_fr_bindings = function search_fr_bindings($el) {
	var res = {};
	if (!Firera.is_def($el)) return res;
	$el.find('[data-fr]').each(function () {
		var name = $(this).attr('data-fr-name');
		if (!name) {
			name = $(this).attr('data-fr');
		}
		res[name] = $(this);
	});
	return res;
};

var write_changes = function write_changes() {
	var pool = {};
	return function (cell, val) {
		if (cell === '*') {
			pool[val[0]] = val[1];
		} else {
			// htmlbindings, obviously
			for (var i in pool) {
				if (val && val[i]) {
					val[i].html(pool[i]);
				}
			}
		}
	};
};

module.exports = {
	eachGridMixin: {
		$el: ['closure', function () {
			var prev_el;
			return function (name, map) {
				return map ? map[name] : null;
			};
		}, '$name', '../$htmlbindings'],
		'$real_el': ['firstDefined', '$el'],
		'$html_template': ['skipIf', function (_ref, _ref2) {
			var _ref4 = _slicedToArray(_ref, 1),
			    $prev_el = _ref4[0];

			var _ref3 = _slicedToArray(_ref2, 1),
			    $el = _ref3[0];

			if (Firera.is_def($prev_el) && Firera.is_def($el) && $prev_el[0] && $el[0] && $prev_el[0] === $el[0]) {
				return false;
			} else {
				return true;
			}
		}, function ($el) {
			var str = '';
			if (Firera.is_def($el)) {
				str = $el.html();
				if (str) str = str.trim();
			}
			return str;
		}, '$real_el'],
		'$template_writer': [function (real_templ, $html_template, no_auto, keys, $el) {
			if (Firera.is_def(real_templ) && Firera.is_def($el)) {
				$el.html(real_templ);
				return true;
			}
			if (!$html_template && Firera.is_def($el) && keys && !no_auto) {
				var auto_template = keys.map(function (k) {
					return '<div>' + k + ':<div data-fr="' + k + '"></div></div>';
				}).join(' ');
				$el.html(auto_template);
			}
		}, '$template', '$html_template', '$no_auto_template', '-$real_keys', '-$real_el'],
		'$html_skeleton_changes': [utils.id, '$template_writer'],
		'$htmlbindings': [search_fr_bindings, '-$real_el', '$template_writer'],
		'$writer': ['closureFunnel', write_changes, '$htmlbindings', '*']
	}
};
},{"../utils":15,"jquery":7}],15:[function(require,module,exports){
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var _F = {};

var always = _F.always = function (a) {
	return function () {
		return a;
	};
};

var init_if_empty = _F.init_if_empty = function (obj /*key, val, key1, val1, ... */) {
	for (var i = 1;; i = i + 2) {
		var key = arguments[i];
		var val = arguments[i + 1];
		if (!key) break;

		if (obj[key] === undefined) {
			obj[key] = val;
		}
		obj = obj[key];
	}
	return obj;
};

var throttle = _F.throttle = function (thunk, time) {
	var is_throttled = false;
	var pending = false;
	return function () {
		if (!is_throttled) {
			//console.log('run!');
			thunk();
			is_throttled = true;
			setTimeout(function () {
				is_throttled = false;
				if (pending) {
					//console.log('run pending!');
					thunk();
					pending = false;
				}
			}, time);
		} else {
			//console.log('skip!');
			pending = true;
		}
	};
};

var log = _F.log = function () {}; // console.log.bind(console);

var decorate = function decorate(fnc, msg) {
	return function () {
		console.log("@", msg, arguments);
		return fnc.apply(null, arguments);
	};
};

var mk_logger = function mk_logger(a) {
	return function (b) {
		console.log(a, b);
		return b;
	};
};

var group_by = _F.group_by = function (arr, prop_or_func) {
	var res = {};
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = arr[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var obj = _step.value;

			init_if_empty(res, prop_or_func instanceof Function ? prop_or_func(obj) : obj[prop_or_func], []).push(obj);
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}

	return res;
};

var frozen = _F.frozen = function (a) {
	return JSON.parse(JSON.stringify(a));
};

var id = _F.id = function (a) {
	return a;
};
var ids = _F.ids = function () {
	return arguments;
};

var arr_remove = _F.arr_remove = function (arr, el) {
	var pos = arr.indexOf(el);
	if (pos !== -1) {
		arr.splice(pos, 1);
	}
};

var sh_copy = _F.sh_copy = function (obj) {
	var res = obj instanceof Array ? [] : {};
	for (var i in obj) {
		if (obj.hasOwnProperty(i)) {
			res[i] = obj[i];
		}
	}
	return res;
};

var arr_different = _F.arr_different = function (arr1, arr2, cb) {
	for (var i in arr1) {
		if (arr2[i] === undefined) {
			cb(i);
		}
	}
};
var arr_common = _F.arr_common = function (arr1, arr2, cb) {
	for (var i in arr1) {
		if (arr2[i] !== undefined) {
			cb(i);
		}
	}
};

var arr_deltas = _F.arr_deltas = function (old_arr, new_arr) {
	var new_ones = arr_diff(new_arr, old_arr);
	var remove_ones = arr_diff(old_arr, new_arr);
	var changed_ones = Arr.mapFilter(new_arr, function (v, k) {
		if (old_arr[k] !== v && old_arr[k] !== undefined) {
			return k;
		}
	});
	//console.log('CHANGED ONES', changed_ones);
	var deltas = [].concat(new_ones.map(function (key) {
		return ['add', key, new_arr[key]];
	}), remove_ones.map(function (key) {
		return ['remove', key];
	}), changed_ones.map(function (key) {
		return ['change', key, new_arr[key]];
	}));
	return deltas;
};

var arr_fix_keys = _F.arr_fix_keys = function (a) {
	var fixed_arr = [];
	var _iteratorNormalCompletion2 = true;
	var _didIteratorError2 = false;
	var _iteratorError2 = undefined;

	try {
		for (var _iterator2 = a[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
			var i = _step2.value;

			if (i !== undefined) {
				fixed_arr.push(i);
			}
		}
	} catch (err) {
		_didIteratorError2 = true;
		_iteratorError2 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion2 && _iterator2.return) {
				_iterator2.return();
			}
		} finally {
			if (_didIteratorError2) {
				throw _iteratorError2;
			}
		}
	}

	return fixed_arr;
};

var arr_diff = _F.arr_diff = function (a, b) {
	var diff = [];
	for (var i in a) {
		if (!b[i]) diff.push(i);
	}
	return diff;
};

var second = _F.second = function (__, a) {
	return a;
};

var path_cellname = _F.path_cellname = function (a) {
	return a.split('/').pop();
};

var is_special = _F.is_special = function (a) {
	return a.indexOf('/') !== -1 || a.indexOf('|') !== -1 || a === '*' || a[0] === '$';
};
var bms = {};
window.bm = {
	start: function start(branch, tag, id) {
		init_if_empty(bms, branch, {}, tag, { sum: 0 }, 'ids', {}, id, performance.now());
	},
	stop: function stop(branch, tag, id) {
		bms[branch][tag].ids[id] = performance.now() - bms[branch][tag].ids[id];
	},
	report: function report() {
		var logger = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

		if (!logger) {
			logger = console.log.bind(console);
		}
		for (var b in bms) {
			var branch = bms[b];
			var branch_sum = 0;
			for (var t in branch) {
				var tag = branch[t];
				for (var tt in tag.ids) {
					var time = tag.ids[tt];
					tag.sum += time;
				}
				branch_sum += tag.sum;
			}
			for (var _t in branch) {
				var tag = branch[_t];
				tag.perc = 100 * (tag.sum / branch_sum);
				console.log(_t, 'tag sum', tag.sum, 'branch sum', branch_sum, '%', tag.perc);
			}
		}
		console.log(bms);
	}
};

var Obj = _F.Obj = {
	map: function map(obj, func, conf) {
		var res = {};
		var exceptions = conf ? conf.except : false;
		for (var key in obj) {
			if (exceptions && exceptions.indexOf(key) !== -1) {
				continue;
			}
			res[key] = func(obj[key], key);
		}
		return res;
	},
	each: function each(obj, func) {
		for (var key in obj) {
			if (func(obj[key], key) === false) {
				break;
			}
		}
	},
	join: function join(obj, glue) {
		var res = [];
		for (var key in obj) {
			res.push(obj[key]);
		}
		return res.join(glue);
	},
	eachKey: function eachKey(obj, func) {
		for (var key in obj) {
			if (func(key) === false) {
				break;
			}
		}
	}
};

var Arr = _F.Arr = {
	mapFilter: function mapFilter(obj, func) {
		var res = [];
		for (var key in obj) {
			var a;
			if ((a = func(obj[key], key)) !== undefined) {
				res.push(a);
			}
		}
		return res;
	},
	unique: function unique(arr) {
		var a = arr.concat();
		for (var i = 0; i < a.length; ++i) {
			for (var j = i + 1; j < a.length; ++j) {
				if (a[i] === a[j]) a.splice(j--, 1);
			}
		}
		return a;
	},
	realLength: function realLength(a) {
		return Object.keys(a).length;
	}
};

var toLowerCase = function toLowerCase(a) {
	return a.toLowerCase();
};

_F.split_camelcase = function (str) {
	if (!str.match) return false;
	var first = str.match(/^([a-z0-9]*)/);
	var others = (str.match(/[A-Z][a-z0-9]*/g) || []).map(toLowerCase);
	return [first[1]].concat(_toConsumableArray(others));
};

var copy = _F.copy = function (from, to) {
	for (var i in from) {
		to.push(from[i]);
	}
};
var kcopy = _F.kcopy = function (from, to) {
	for (var i in from) {
		to[i] = from[i];
	}
};
module.exports = _F;
},{}],16:[function(require,module,exports){
'use strict';

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var get_token = function get_token(type) {
	return {
		type: type,
		children: []
	};
};
var match_start = function match_start() {};

var empty_chars_default = [' ', '	', '\n'];
var head = function head(a) {
	return a[0];
};
var tail = function tail(a) {
	return a.slice(1);
};

var parse_semantics = function parse_semantics(config, struct) {
	if (struct instanceof Array) {
		if (struct.length === 1) {
			struct = struct[0];
		} else {
			var r = [];
			for (var i in struct) {
				r.push(parse_semantics(config, struct[i]));
			}
			return r;
		}
	}
	if (!struct) {
		console.warn('oops', config, struct);
		return;
	}
	var type = struct.type;
	var children = struct.children;
	var sem = config[type];
	if (!sem) {
		console.error('No token semantic description', type, struct);
		return;
	}
	if (sem.type) {
		switch (sem.type) {
			case 'door':
				var to_parse = sem.ret ? children[sem.ret - 1] : children;
				return parse_semantics(config, to_parse);
				break;
			case 'chars':
				return { chars: struct.chars };
				break;
		}
	}
	if (sem.func) {
		return sem.func(struct, parse_semantics.bind(null, config));
	}
};

var flatten = function flatten(struct, arr) {
	var get_children = function get_children(struct, arr) {
		if (struct.children) {
			for (var i in struct.children) {
				if (struct.children[i].type) {
					var child = {
						type: struct.children[i].type,
						children: []
					};
					if (struct.children[i].chars) {
						child.chars = struct.children[i].chars;
					}
					arr.push(child);
					get_children(struct.children[i], child.children);
				} else {
					get_children(struct.children[i], arr);
				}
			}
		}
	};
	var res = [];
	get_children({ children: [struct] }, res);
	return res[0];
};

var parse = function parse(config, str, debug) {
	var is_empty_char = function is_empty_char(char) {
		var empty_chars = config.empty_chars || empty_chars_default;
		return empty_chars.indexOf(char) !== -1;
	};
	var parse_rec = function parse_rec(tt, str, pos) {
		var original_pos = pos;
		var showpos = function showpos() {
			return str.substr(0, pos) + '@@@' + str.substr(pos);
		};
		//console.log('Parsing', '___' + tt + '___', 'token from', pos, showpos());
		var children;
		var res = {
			children: []
		};
		if (typeof tt === 'string') {
			res.type = tt;
			if (!config.syntax[tt]) {
				console.error('Token not found:', tt);
			}
			var tk = config.syntax[tt];
			//console.log('Token props:', tk);
			if (tk.start !== undefined) {
				var started = false;
				var start_pos = pos;
				while (++pos) {
					var char = str[pos - 1];
					if (is_empty_char(char)) {
						continue;
					}
					if (char !== tk.start) {
						//console.log('parsing', tt, 'failed:', pos, 
						//str[pos], 'instead of', tk.start);
						return [false, start_pos];
					} else {
						break;
					}
				}
			}
			if (tk.children) {
				children = tk.children;
			} else {
				if (tk.free_chars) {
					//console.log('Parsing free chars');
					var start_pos = pos;
					if (tk.end || tk.regex) {
						var started = false;
						var lag = 0;
						while (++pos) {
							var char = str[pos - 1];
							//console.log('parsing free chars', '"' + char + '"', 'as', tt);
							if (char === undefined) {
								// we reached the end!
								if (pos - start_pos > 1) {
									//console.log('we reached the end!');
									res.chars = str.substr(start_pos, pos - start_pos - 1);
									return [res, pos - 1];
								} else {
									return false;
								}
								//return [res, pos + 1];
							}
							if (is_empty_char(char) && !started) {
								++lag;
								continue;
							}
							if (tk.end && char === tk.end) {
								res.chars = str.substr(start_pos, pos - start_pos - 1 + lag);
								return [res, pos];
							} else {
								if (tk.regex) {
									var string_to_compare = str.substr(start_pos + lag, pos - start_pos - lag);
									var a1 = !!char.match(tk.regex);
									var a2 = !!string_to_compare.match(tk.regex);
									//console.log('matching regex', tt, tk.regex, 'against', char, a1, string_to_compare, a2);
									//if(a1 !== a2){
									//console.log('Comparing', start_pos, a1, a2, tt, '"' + char + '"', 'vs.', '"' + string_to_compare + '".match(' + tk.regex + ')');
									//}
									if (!char || !string_to_compare.match(tk.regex)) {
										if (started) {
											res.chars = str.substr(start_pos + lag, pos - start_pos - 1 - lag);
											//console.log('______________ success', res.chars);
											return [res, pos - 1];
										} else {
											//console.log('DED END!', char, tt);
											return [false, pos - 1 - lag];
										}
									}
								}
							}
							started = true;
						}
					} else {
						console.warn('Could not parse free chars without end!');
						return [false, pos];
					}
				} else if (tk.str) {
					// just exact string
					var test_str = str.substr(pos, tk.str.length);
					//console.log('test str', test_str, tt)
					if (test_str === tk.str) {
						return [res, pos + tk.str.length];
					} else {
						return [false, pos];
					}
				} else {
					debugger;
					console.warn('No chars and no tokens - what to do?', tk);
				}
			}
		} else {
			children = tt;
		}
		if (!children) return res;
		var children_type = head(children);
		var rest_children = tail(children);
		//console.log('chtype', children_type, rest_children);
		switch (children_type) {
			case '>':
				//console.log('parsing > children', tt);
				var p = pos;
				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = rest_children[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var b = _step.value;

						if (typeof b === 'string') continue;
						var r;
						var struct_to_parse = b instanceof Array ? b : b.type;
						var optional = b.optional;
						var multiple = b.multiple;
						if (struct_to_parse instanceof Array && typeof struct_to_parse[struct_to_parse.length - 1] === 'string') {
							optional = true;
							multiple = true;
						}
						while (true) {
							//console.log('parsing multiple', struct_to_parse, 'as', tt, b);
							var rz = parse_rec(struct_to_parse, str, p);
							r = rz[0];
							p = rz[1];
							if (!r) {
								if (optional) {
									break;
								}
								return [false, p];
							}
							pos = p;
							res.children.push(r);
							if (multiple) {
								if (str[p] === undefined) {
									break;
								}
							} else {
								break;
							}
						}
					}
				} catch (err) {
					_didIteratorError = true;
					_iteratorError = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion && _iterator.return) {
							_iterator.return();
						}
					} finally {
						if (_didIteratorError) {
							throw _iteratorError;
						}
					}
				}

				break;
			case '|':
				//console.log('parsing | children', children);
				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {
					for (var _iterator2 = rest_children[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						var b = _step2.value;

						if (typeof b === 'string') continue;
						var r;
						var struct_to_parse = b instanceof Array ? b : b.type;
						var rz = parse_rec(struct_to_parse, str, pos);
						r = rz[0];
						p = rz[1];
						if (!r) {
							continue;
						} else {
							res.children.push(r);
							pos = p;
							break;
						}
						return [false, pos];
					}
				} catch (err) {
					_didIteratorError2 = true;
					_iteratorError2 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion2 && _iterator2.return) {
							_iterator2.return();
						}
					} finally {
						if (_didIteratorError2) {
							throw _iteratorError2;
						}
					}
				}

				if (!res.children.length) {
					//console.log('Nothing found', tt);
					return [false, pos];
				}
				break;
			default:
				console.error('Unknown children type:', children_type);
				break;
		}
		if (tk && tk.end) {
			var pp = pos;
			while (++pp) {
				var char = str[pp - 1];
				if (is_empty_char(char)) {
					continue;
				}
				if (char === tk.end) {
					pos = pp;
				}
				break;
			}
		}
		return [res, pos];
	};
	var struct = parse_rec('root_token', str, 0);
	struct = flatten(struct[0]);
	// sematic parsing
	var semantics = parse_semantics(config.semantics, struct);
	return { syntax: struct, semantics: semantics };
};
module.exports = {
	get_parser: function get_parser(config) {
		return parse.bind(null, config);
	},
	dump: function dump(struct) {
		var rec = function rec(struct, level) {
			if (!struct) return;
			var res = [];
			if (struct.type) {
				res.push('Type: ' + struct.type);
			}
			if (struct.chars) {
				res.push('Str: ' + struct.chars);
			}
			if (struct.children) {
				var r = [];
				for (var i in struct.children) {
					r.push(rec(struct.children[i], level + 1));
				}
				res.push('<div>' + r.join('	') + '</div>');
			}
			return '<div>' + res.join('<br>') + '</div>';
		};
		return rec(struct, 0);
	}
};
},{}],17:[function(require,module,exports){
'use strict';

var fields = ['classnames', 'tagname', 'str', 'quoted_str'];
var init_if_empty = function init_if_empty(obj /*key, val, key1, val1, ... */) {
	for (var i = 1;; i = i + 2) {
		var key = arguments[i];
		var val = arguments[i + 1];
		if (!key) break;

		if (obj[key] === undefined) {
			obj[key] = val;
		}
		obj = obj[key];
	}
	return obj;
};
module.exports = {
	empty_chars: [' '],
	syntax: {
		root_token: {
			children: ['>', {
				type: 'item',
				multiple: true,
				optional: true
			}]
		},
		item: {
			children: ['>', {
				type: 'indent',
				optional: true
			}, ['|', {
				type: 'new_if',
				optional: true
			}, {
				type: 'new_elseif',
				optional: true
			}, {
				type: 'new_else',
				optional: true
			}, {
				type: 'ternary_else'
			}, ['>', {
				type: 'tagname',
				optional: true
			}, {
				type: 'classnames',
				optional: true
			}, ['|', {
				type: 'quoted_str',
				optional: true
			}, {
				type: 'variable',
				optional: true
			}, 'optional'], {
				type: 'bracket',
				optional: true
			}, {
				type: 'loop',
				optional: true
			}, {
				type: 'str',
				optional: true
			}]], {
				type: 'lineend'
			}]
		},
		comma: {
			regex: /^\,\s?$/,
			free_chars: true
		},
		bracket: {
			start: '(',
			children: ['>', {
				type: 'assign',
				optional: true
			}, ['>', {
				type: 'comma'
			}, {
				type: 'assign'
			}, 'optional']],
			end: ')'
		},
		assign: {
			free_chars: true,
			regex: /^[^\)^\,]*$/
		},
		quoted_str: {
			start: '"',
			end: '"',
			free_chars: true
		},
		variable: {
			children: ['>', {
				type: 'varname'
			}, {
				type: 'ternary_if',
				optional: true
			}]
		},
		ternary_if: {
			regex: /^\?$/,
			free_chars: true
		},
		ternary_else: {
			regex: /^\:$/,
			free_chars: true
		},
		new_if: {
			regex: /^\?\s?(.*)?$/,
			free_chars: true
		},
		new_elseif: {
			regex: /^\*\s?(.*)?$/,
			free_chars: true
		},
		new_else: {
			regex: /^\:$/,
			free_chars: true
		},
		varname: {
			regex: /^\$[a-zA-Z0-9\-\_\.]*$/,
			free_chars: true
		},
		indent: {
			regex: /^\t+$/,
			free_chars: true
		},
		classnames: {
			regex: /^\.[\\.a-zA-Z0-9\-\_]*$/,
			free_chars: true
		},
		tagname: {
			regex: /^[a-zA-Z0-9]+$/,
			free_chars: true
		},
		loop: {
			regex: /\{([^\n]*)?$/,
			free_chars: true
		},
		str: {
			regex: /^[^\n]+$/,
			free_chars: true
		},
		lineend: {
			regex: /\n$/,
			free_chars: true
		}
	},
	semantics: {
		root_token: {
			func: function func(struct, parser) {

				var res = { children: [] };
				var last_of_level = {
					"-1": res
				};
				var che_results = parser(struct.children);
				//console.log('Results', che_results);
				var max_level = 0;
				var last_if = [];
				for (var i in che_results) {
					var child = che_results[i];
					if (!child.tagname && !child.classnames && !child.quoted_str && !child.variable && !child.type) {
						continue;
					}
					if (child.type === 'IF') {
						last_if.push(child);
					}
					if (child.type === 'ELSE') {
						var lif = last_if.pop();
						lif.else_children = child;
					}
					var lvl = child.level || 0;
					if (lvl > max_level) {
						max_level = lvl;
					}
					var put_to = lvl - 1;
					child.children = [];
					if (!last_of_level[put_to]) {
						for (; put_to--; put_to > -2) {
							if (last_of_level[put_to]) break;
						}
						if (!last_of_level[put_to]) {
							continue;
						}
					}
					// way back
					for (var y = i; y >= 0; y--) {
						if (che_results[y].level < lvl) {
							//console.log('PUT TO', che_results[y], che_results[y].level);
							break;
						}
					}
					var parent1 = last_of_level[put_to];
					var parent2 = che_results[y];
					if (!che_results[y]) {
						parent2 = res;
					}
					if (parent1 !== parent2) {
						//console.log('o-ow', parent1, parent2, child);
					}
					parent2.children.push(child);
					last_of_level[lvl] = child;
					if (lvl + 1 < max_level) {
						//console.log('lvl', lvl+1, max_level);
						var j = lvl + 1;
						for (var j = lvl + 1; j <= max_level; j++) {
							if (!last_of_level[j]) break;
							//console.log('delete', last_of_level[j]);
							delete last_of_level[j];
						}
					}
				}
				return res.children;
			}
		},
		item: {
			func: function func(struct, parser) {
				var res = {};
				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = struct.children[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var child = _step.value;

						switch (child.type) {
							case 'variable':
								res.varname = child.children[0].chars.slice(1);
								if (child.children[1]) {
									res.type = "IF";
								}
								break;
							case 'ternary_else':
								res.type = "ELSE";
								break;
							case 'new_if':
								var chars = child.chars;
								res.varname = chars.match(/\$([A-Za-z0-9\_]*)/)[1];
								res.expr = chars.replace(/\?\s?/, '').replace('$' + res.varname, 'ctx.' + res.varname);
								res.type = child.type.toUpperCase();
								break;
							case 'new_elseif':
								var chars = child.chars;
								res.varname = chars.match(/\$([^\s]*)/)[1];
								res.expr = chars.replace(/\*\s?/, '').replace('$' + res.varname, 'ctx.' + res.varname);
								res.type = child.type.toUpperCase();
								break;
							case 'new_else':
								res.type = child.type.toUpperCase();
								break;
							case 'indent':
								res.level = child.chars.length;
								//console.log('INDEX', res.level);
								break;
							case 'loop':
								res.loop = child.chars.match(/\{\$([^\}]*)\}/)[1];
								//console.log('INDEX', res.level);
								break;
							case 'bracket':
								res.assignments = [];
								var _iteratorNormalCompletion2 = true;
								var _didIteratorError2 = false;
								var _iteratorError2 = undefined;

								try {
									for (var _iterator2 = child.children[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
										var child1 = _step2.value;

										if (child1.type === 'assign') {
											var assign = child1.chars.split(':');
											var key = assign[0].trim();
											var val = assign[1].trim();
											if (val[0] === '$') {
												// its var
												var varname = val.length === 1 ? key : val.substr(1);
												init_if_empty(res, 'attrStyleVars', []).push([varname, key]);
											}
											res.assignments.push([key, val]);
										}
									}
									//console.log('INDEX', res.level);
								} catch (err) {
									_didIteratorError2 = true;
									_iteratorError2 = err;
								} finally {
									try {
										if (!_iteratorNormalCompletion2 && _iterator2.return) {
											_iterator2.return();
										}
									} finally {
										if (_didIteratorError2) {
											throw _iteratorError2;
										}
									}
								}

								break;
						}
						if (fields.indexOf(child.type) !== -1) {
							res[child.type] = child.chars;
						}
					}
				} catch (err) {
					_didIteratorError = true;
					_iteratorError = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion && _iterator.return) {
							_iterator.return();
						}
					} finally {
						if (_didIteratorError) {
							throw _iteratorError;
						}
					}
				}

				return res;
			}
		},
		indent: {
			type: 'chars'
		}
	}
};
},{}],18:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var ozenfant_config = require('./config');
var parser = require('../ooo_oo_o/parser').get_parser(ozenfant_config);

var init_if_empty = function init_if_empty(obj /*key, val, key1, val1, ... */) {
	for (var i = 1;; i = i + 2) {
		var key = arguments[i];
		var val = arguments[i + 1];
		if (!key) break;

		if (obj[key] === undefined) {
			obj[key] = val;
		}
		obj = obj[key];
	}
	return obj;
};

var last = function last(arr) {
	return arr[arr.length - 1];
};

var html_attrs = new Set(['href', 'src', 'style', 'target', 'id', 'class', 'rel', 'type', 'value']);
var is_attr = function is_attr(str) {
	return html_attrs.has(str) || str.match(/^data\-/);
};

var text_var_regexp = /\{\{([a-zA-Z0-9]*)\}\}/g; ///\$([a-zA-Z0-9]*)/g;

var Ozenfant = function Ozenfant(str) {
	if (str instanceof Object) {
		this.struct = str; // compiled struct
		this.node_vars_paths = this.struct.node_vars_paths;
		this.text_vars_paths = this.struct.text_vars_paths;
		this.nodes_vars = this.struct.nodes_vars;
		this.var_types = this.struct.var_types;
		this.varname_pool = this.struct.varname_pool;
		this.if_else_tree = this.struct.if_else_tree;
		this.loop_pool = this.struct.loop_pool;
		this.str = this.struct.str;
	} else {
		this.str = str;
		this.struct = parser(str + '\n');
		this.node_vars_paths = {};
		this.text_vars_paths = {};
		this.nodes_vars = {};
		this.var_types = {};
		this.varname_pool = {
			vars: {},
			var_aliases: {}
		};
		this.func = create_func(toFunc({ children: this.struct.semantics }));
		this.if_else_tree = { str_to_func: {}, var_funcs: {} };
		this.loop_pool = {};
		this.get_vars({ children: this.struct.semantics, root: true }
		//, this.node_vars_paths
		//, this.text_vars_paths
		//, this.nodes_vars
		, '.', this.var_types, []
		//, this.varname_pool
		//, this.if_else_tree
		, []
		//, this.loop_pool	
		);
	}
	this.state = {};
	this.bindings = {};

	this.getIfElseVarsIndex();
};

var create_func = function create_func(str, condition, loop_level) {
	var body = "'" + str + "'";
	if (condition) {
		body = condition + ' ? ' + body + ' : false';
	}
	var args = 'ctx';
	if (loop_level) {
		for (var c = 1; c <= loop_level; c++) {
			args += ', __loopvar' + c;
		}
	}
	var fbody = 'var res = []; var res2 = []; res.push(' + body + '); return res.join("");';
	return new Function(args, fbody);
};

Ozenfant.prepare = function (str) {
	var struct = Object.assign(Object.create(Ozenfant.prototype, {}), parser(str + '\n'));
	struct.node_vars_paths = {};
	struct.text_vars_paths = {};
	struct.nodes_vars = {};
	struct.var_types = {};
	struct.varname_pool = {
		vars: {},
		var_aliases: {}
	};
	struct.func = create_func(toFunc({ children: struct.semantics }));
	//console.log('Struct func', struct);
	struct.if_else_tree = { str_to_func: {}, var_funcs: {} };
	struct.loop_pool = {};
	struct.str = str;
	struct.get_vars({ children: struct.semantics, root: true }
	//, struct.node_vars_paths
	//, struct.text_vars_paths
	//, struct.nodes_vars
	, '.', struct.var_types, []
	//, struct.varname_pool
	//, struct.if_else_tree
	, []
	//, struct.loop_pool
	);

	return struct;
};

var get_varname = function get_varname(node) {
	var key = node.varname;
	if (!key.length) {
		if (node.classnames) {
			key = node.classnames.substr(1).split('.').pop();
		} else {
			console.warn('Incorrect statement: variable without name and default class!');
		}
	}
	return key;
};

var get_dots = function get_dots(loop_level) {
	return new Array(loop_level + 2).join('.');
};
var get_level = function get_level(varname) {
	var level = 0;
	for (var i in varname) {
		if (varname[i] === '.') {
			++level;
		}
	}
	return level - 1;
};

var prefix = 'ololo@!@!#_';

var register_varname = function register_varname(varname, varname_pool, if_else_deps, if_else_tree, loops, loop_pool) {
	var original_varname = varname;
	if (varname_pool.vars[varname]) {
		// already exists!
		init_if_empty(varname_pool.var_aliases, varname, []);
		var new_name = prefix + varname + '_' + varname_pool.var_aliases[varname].length;
		varname_pool.var_aliases[varname].push(new_name);
		varname = new_name;
	} else {
		varname_pool.vars[varname] = true;
	}
	var deps = if_else_deps.length ? '(' + if_else_deps.join(') && (') + ')' : false;
	if (deps) {
		if (if_else_tree.str_to_func[deps]) {
			if_else_tree.var_funcs[varname] = if_else_tree.str_to_func[deps];
		} else {
			if_else_tree.var_funcs[varname] = if_else_tree.str_to_func[deps] = new Function('ctx', 'return ' + deps);
		}
	}
	if (loops.length) {
		var last_loop = loop_pool[loops[loops.length - 1]];
		if (original_varname.indexOf(get_dots(last_loop.level)) !== 0) {
			;
			var curr_loop = last_loop;
			var var_level = get_level(varname);
			while (true) {
				if (curr_loop === 'root') {
					init_if_empty(varname_pool, 'loop_var_links', {}, original_varname, {}, varname, last_loop);
					break;
				} else {
					if (curr_loop.level == var_level) {
						var vrkey = original_varname.indexOf('.') !== -1 ? last(original_varname.split('.')) : original_varname;
						init_if_empty(curr_loop, 'subordinary_loop_vars', {}, vrkey, last_loop);
						break;
					}
					curr_loop = curr_loop.parent_loop;
				}

				if (curr_loop === 'root') {
					break;
				}
				if (!curr_loop) {
					curr_loop = 'root';
				}
			}
		}
		init_if_empty(last_loop, 'vars', {});
		last_loop.vars[varname] = true;
	}
	return varname;
};

var add_to_if_else_pool = function add_to_if_else_pool(pools, varname, path) {
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = pools[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var pool = _step.value;

			pool[varname] = path;
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}
};

var is_new_if = function is_new_if(a) {
	return ['NEW_ELSE', 'NEW_ELSEIF', 'NEW_IF'].indexOf(a.type) !== -1;
};

var get_partial_func = function get_partial_func(node) {
	if (node.partial_func) {
		return node.partial_func;
	} else {
		if (node.root) {
			return 'USE_ROOT_FUNC';
		}
	}
};

var register_loop = function register_loop(varname, level, pool, parent_loop) {
	var lp = {
		parent_loop: parent_loop,
		name: varname,
		level: level
	};
	pool[varname] = lp;
	return lp;
};

var fix_path = function fix_path(path) {
	return path.replace('./*[1]', '.');
};

Ozenfant.prototype.register_path = function (varname, path, pool, loop) {
	if (loop) {
		init_if_empty(loop, 'paths', {});
		pool = loop.paths;
	}
	var has_loops = false;
	if (path.indexOf('_{}_') !== -1) {
		var pieces = path.split('_{}_');
		has_loops = true;
		path = pieces[pieces.length - 1];
	}
	if (path.indexOf('./*[1]') !== 0 && !has_loops && path.length) {
		console.error('Template should have only one root node! Given', path.indexOf('./*[1]'), path, this.str);
	} else {
		path = fix_path(path);
	}
	pool[varname] = path;
};

Ozenfant.prototype.get_vars = function (node, path, types, if_else_deps, loops, parent_has_loop) {
	var _this = this;

	var node_pool = this.node_vars_paths;
	var text_pool = this.text_vars_paths;
	var path_pool = this.nodes_vars;
	var last_loop;
	if (loops.length) {
		last_loop = this.loop_pool[loops[loops.length - 1]];
	}
	if (node.children) {
		var nodes_lag = 0;
		var text_lag = 0;
		var resigtered_vars = {};
		for (var i in node.children) {
			var zild = node.children[i];
			var new_path = path;
			if (!is_new_if(zild)) {
				if (!zild.tagname && !zild.classnames) {
					++nodes_lag;
				} else {
					++text_lag;
				}
				if (parent_has_loop) {
					new_path = path + '/_{}_';
				} else {
					new_path = path + '/*[' + (Number(i) + 1 - nodes_lag) + ']';
				}
			}
			if (zild.type && (zild.type === 'NEW_IF' || zild.type === 'NEW_ELSEIF' || zild.type === 'NEW_ELSE')) {
				if (zild.type === 'NEW_IF') {
					var varname = register_varname(get_varname(zild), this.varname_pool, if_else_deps, this.if_else_tree, loops, this.loop_pool);
					resigtered_vars[varname] = true;
					this.register_path(varname, new_path, node_pool, last_loop);
					types[varname] = get_partial_func(node);
					var my_if_else_deps = [].concat(_toConsumableArray(if_else_deps));
					my_if_else_deps.push(zild.expr);
					this.get_vars(zild, new_path, types, my_if_else_deps, loops);
					continue;
				}
				if (zild.type === 'NEW_ELSEIF' || zild.type === 'NEW_ELSE') {
					var varname = get_varname(zild);
					if (!resigtered_vars[varname]) {
						register_varname(varname, this.varname_pool, if_else_deps, this.if_else_tree, loops, this.loop_pool);
					}
					types[varname] = get_partial_func(node);
					this.register_path(varname, new_path, node_pool, last_loop);
					var my_if_else_deps = [].concat(_toConsumableArray(if_else_deps));
					my_if_else_deps.push(zild.real_expr);
					this.get_vars(zild, new_path, types, my_if_else_deps, loops);
					continue;
				}
				this.get_vars(zild, new_path, types, if_else_deps, loops);
			} else {
				if (zild.varname !== undefined) {
					var varname = register_varname(get_varname(zild), this.varname_pool, if_else_deps, this.if_else_tree, loops, this.loop_pool);
					this.register_path(varname, new_path, node_pool, last_loop);
				}
				if (zild.attrStyleVars) {
					var _iteratorNormalCompletion2 = true;
					var _didIteratorError2 = false;
					var _iteratorError2 = undefined;

					try {
						for (var _iterator2 = zild.attrStyleVars[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
							var _step2$value = _slicedToArray(_step2.value, 2),
							    _varname = _step2$value[0],
							    attrname = _step2$value[1];

							_varname = register_varname(_varname, this.varname_pool, if_else_deps, this.if_else_tree, loops, this.loop_pool);
							this.register_path(_varname, new_path, node_pool, last_loop);
							var as_type = is_attr(attrname) ? 'ATTR' : 'STYLE';
							types[_varname] = {
								type: as_type,
								name: attrname
							};
						}
					} catch (err) {
						_didIteratorError2 = true;
						_iteratorError2 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion2 && _iterator2.return) {
								_iterator2.return();
							}
						} finally {
							if (_didIteratorError2) {
								throw _iteratorError2;
							}
						}
					}

					this.get_vars(zild, new_path, types, [].concat(_toConsumableArray(if_else_deps)), loops);
				}
				if (zild.quoted_str) {
					//console.log('str!', node.children[i].quoted_str);
					zild.quoted_str.replace(text_var_regexp, function (_, key) {
						var text_path = fix_path(path + '/text()[' + (Number(i) + 1 - text_lag) + ']');
						varname = register_varname(key, _this.varname_pool, if_else_deps, _this.if_else_tree, loops, _this.loop_pool);
						if (!path_pool[text_path]) {
							path_pool[text_path] = zild.quoted_str;
						}
						text_pool[varname] = text_path;
						//console.log('text key found', key, text_path);
					});
				}
				var new_loops = [].concat(_toConsumableArray(loops));
				if (zild.loop) {
					var loopname = register_varname(zild.loop, this.varname_pool, if_else_deps, this.if_else_tree, loops, this.loop_pool);
					var loop = register_loop(loopname, loops.length, this.loop_pool, last_loop);
					this.register_path(loopname, new_path, node_pool, last_loop);
					types[loopname] = {
						type: 'LOOP',
						func: get_partial_func(zild),
						loop: loop
					};
					new_loops.push(loopname);
				}
				this.get_vars(zild, new_path, types, [].concat(_toConsumableArray(if_else_deps)), new_loops, !!zild.loop);
			}
		}
	}
};

var input_types = new Set(['text', 'submit', 'checkbox', 'radio']);

var toHTML = function toHTML(node, context, parent_tag) {};

var getvar = function getvar(key) {
	return "' + (ctx." + key + " || '') + '";
};
var getvar_raw = function getvar_raw(key) {
	return "' + (" + key + " || '') + '";
};

var get_children_html = function get_children_html(childs, parent_tag, if_stack, pp, loop_level) {
	var res1 = [];
	var _iteratorNormalCompletion3 = true;
	var _didIteratorError3 = false;
	var _iteratorError3 = undefined;

	try {
		for (var _iterator3 = childs[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
			var child = _step3.value;

			res1.push(toFunc(child, parent_tag, if_stack, pp, loop_level));
		}
	} catch (err) {
		_didIteratorError3 = true;
		_iteratorError3 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion3 && _iterator3.return) {
				_iterator3.return();
			}
		} finally {
			if (_didIteratorError3) {
				throw _iteratorError3;
			}
		}
	}

	return res1.join('');
};

var toFuncVarname = function toFuncVarname(a) {
	var dot_counter = 0;
	for (var cp in a) {
		if (a[cp] === '.') {
			++dot_counter;
		} else {
			break;
		}
	}
	var varname;
	if (dot_counter) {
		varname = a.substr(dot_counter);
		varname = varname.length ? '.' + varname : '';
		a = '__loopvar' + dot_counter + varname;
	} else {
		a = a.length ? '.' + a : '';
		a = 'ctx' + a;
	}
	return a;
};

var toFunc = function toFunc(node, parent_tag) {
	var if_stack = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
	var partial_pool = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
	var loop_level = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;

	if (node.loop) {
		++loop_level;
	}
	node.parent = parent;
	var childs = node.children;
	var indent = ' \' + \n\'' + new Array(node.level).join('	');
	//indent = '';// !
	var res1 = [],
	    res2 = [],
	    after = '',
	    res_final;
	var childs_html = '';
	var need_partial_func = false;
	var pp = false;
	var _iteratorNormalCompletion4 = true;
	var _didIteratorError4 = false;
	var _iteratorError4 = undefined;

	try {
		for (var _iterator4 = childs[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
			var child = _step4.value;

			if (is_new_if(child)) {
				need_partial_func = true;
				pp = [];
				break;
			}
		}
	} catch (err) {
		_didIteratorError4 = true;
		_iteratorError4 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion4 && _iterator4.return) {
				_iterator4.return();
			}
		} finally {
			if (_didIteratorError4) {
				throw _iteratorError4;
			}
		}
	}

	if (node.loop) {
		need_partial_func = true;
	}
	if (is_new_if(node)) {
		switch (node.type) {
			case 'NEW_IF':
				//console.log('IF STACK', if_stack);
				if_stack[node.level] = [toFuncVarname(node.varname), node.expr, []];
				res1.push(indent + "'); if(" + node.expr + ") { res.push('");
				childs_html = get_children_html(childs, parent_tag, if_stack, pp, loop_level);
				res1.push(childs_html);
				res1.push('\'); }\nres.push(\'');
				break;
			case 'NEW_ELSEIF':
				var _if_stack$node$level = _slicedToArray(if_stack[node.level], 3),
				    varname = _if_stack$node$level[0],
				    expr = _if_stack$node$level[1],
				    elifs = _if_stack$node$level[2];

				if_stack[node.level][2].push(node.expr);
				node.real_expr = node.expr + " && !(" + expr + ")";
				res1.push(indent + "'); if(" + node.expr + " && !(" + expr + ")) { res.push('");
				childs_html = get_children_html(childs, parent_tag, if_stack, pp, loop_level);
				res1.push(childs_html);
				res1.push(indent + '\'); }\nres.push(\'');
				break;
			case 'NEW_ELSE':
				var _if_stack$node$level2 = _slicedToArray(if_stack[node.level], 3),
				    varname = _if_stack$node$level2[0],
				    expr = _if_stack$node$level2[1],
				    elifs = _if_stack$node$level2[2];

				node.varname = varname;
				node.real_expr = "!(" + expr + "" + (elifs.length ? ' || ' + elifs.join(' || ') : '') + ")";
				res1.push(indent + "'); if(!(" + expr + "" + (elifs.length ? ' || ' + elifs.join(' || ') : '') + ')) { res.push(\'');
				childs_html = get_children_html(childs, parent_tag, if_stack, pp, loop_level);
				res1.push(childs_html);
				res1.push(indent + '\'); }\nres.push(\'');
				break;
		}
	} else if (node.tagname || node.classnames || !parent_tag) {
		// it's a node
		var tag;
		if (node.tagname) {
			if (input_types.has(node.tagname)) {
				node.assignments = node.assignments || [];
				node.assignments.push(['type', node.tagname]);
				tag = 'input';
			} else {
				tag = node.tagname;
			}
		} else {
			switch (parent_tag) {
				case 'ol':
				case 'ul':
					tag = 'li';
					break;
				case 'tr':
					tag = 'td';
					break;
				default:
					tag = 'div';
					break;
			}
		}
		childs_html = get_children_html(childs, tag, if_stack, pp, loop_level);
		res1.push(childs_html);
		if (parent_tag) {
			res2.push(indent + '<' + tag);
			if (node.classnames && node.classnames.length > 1) {
				res2.push(' class="' + node.classnames.substr(1).replace(/\./g, " ") + '"');
			}
			if (node.assignments) {
				var styles = [];
				var _iteratorNormalCompletion5 = true;
				var _didIteratorError5 = false;
				var _iteratorError5 = undefined;

				try {
					for (var _iterator5 = node.assignments[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
						var ass = _step5.value;

						var _ass = _slicedToArray(ass, 2),
						    key = _ass[0],
						    val = _ass[1];

						if (val[0] === '$') {
							// its variable, lets take its val from context
							var real_key = val.length === 1 ? key : val.substr(1);
							real_key = toFuncVarname(real_key);
							val = getvar_raw(real_key);
						}
						if (is_attr(key)) {
							res2.push(' ' + key + '="' + val + '"');
						} else {
							styles.push(key + ': ' + val + ';');
						}
					}
				} catch (err) {
					_didIteratorError5 = true;
					_iteratorError5 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion5 && _iterator5.return) {
							_iterator5.return();
						}
					} finally {
						if (_didIteratorError5) {
							throw _iteratorError5;
						}
					}
				}

				if (styles.length) {
					res2.push(' style="' + styles.join('') + '"');
				}
			}
			res2.push('>');
			if (node.varname !== undefined && !node.type) {
				var key = toFuncVarname(get_varname(node));
				if (childs.length) {
					console.error('Node should have either variable or child nodes, both given. Node: "' + node.tagname + node.classnames + '", variable: "' + key + '"');
				}
				res2.push(indent + getvar_raw(key));
			} else {
				if (node.loop) {
					var loopvar = toFuncVarname(node.loop);
					res2.push('\'); \n\t\t\t\t\tfor(var ___k' + loop_level + ' in ' + loopvar + ') { \n\t\t\t\t\t\tvar __loopvar' + loop_level + ' = ' + loopvar + '[___k' + loop_level + ']; \n\t\t\t\t\t\tres.push(\'' + childs_html + '\'); \n\t\t\t\t\t} \n\t\t\t\t\tres.push(\'');
				} else {
					res2.push(res1.join(' '));
				}
			}
			res2.push(indent + '</' + tag + '>');
			res_final = res2.join('');
		}
	} else {
		// its var of text node
		if (node.quoted_str) {
			res_final = indent + node.quoted_str.replace(text_var_regexp, function (_, key) {
				//console.log('Found!', key, context[key]);
				return "' + ctx." + key + " + '";
			});
		}
		if (node.variable) {
			res_final = indent + node.variable;
		}
	}
	res_final = res_final || res1.join('');
	if (need_partial_func) {
		if (partial_pool) {
			partial_pool.push(node);
			if (pp) {
				var _iteratorNormalCompletion6 = true;
				var _didIteratorError6 = false;
				var _iteratorError6 = undefined;

				try {
					for (var _iterator6 = pp[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
						var nd = _step6.value;

						partial_pool.push(nd);
					}
				} catch (err) {
					_didIteratorError6 = true;
					_iteratorError6 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion6 && _iterator6.return) {
							_iterator6.return();
						}
					} finally {
						if (_didIteratorError6) {
							throw _iteratorError6;
						}
					}
				}
			}
		} else {
			node.partial_func = create_func(childs_html, false, loop_level);
			if (pp) {
				var _iteratorNormalCompletion7 = true;
				var _didIteratorError7 = false;
				var _iteratorError7 = undefined;

				try {
					for (var _iterator7 = pp[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
						var _nd = _step7.value;

						_nd.partial_func = node.partial_func;
					}
				} catch (err) {
					_didIteratorError7 = true;
					_iteratorError7 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion7 && _iterator7.return) {
							_iterator7.return();
						}
					} finally {
						if (_didIteratorError7) {
							throw _iteratorError7;
						}
					}
				}
			}
		}
	}
	return res_final;
};

var trim_dots = function trim_dots(str) {
	var c = 0;
	for (var i in str) {
		if (str[i] === '.') {
			++c;
		} else {
			break;
		}
	}
	return str.substr(c);;
};

Ozenfant.prototype.toHTML = function (context) {
	if (context) {
		this.state = context;
	} else {
		context = {};
	}
	if (!this.struct.func) {
		this.struct.func = create_func(toFunc({ children: this.struct.semantics, root: true }));
	}
	var a = this.struct.func(context);
	//var a = toHTML({children: this.struct.semantics}, context = context);
	return a;
};

Ozenfant.prototype.searchByPath = function (path) {
	return Ozenfant.xpOne(path, this.root);
};

Ozenfant.prototype.getIfElseVarsIndex = function () {
	this.if_else_vars = {};
	for (var one in this.var_types) {
		if (!(this.var_types[one] instanceof Object)) continue;
		for (var varname in this.var_types[one].if_pool) {
			var path = this.var_types[one].if_pool[varname];
			init_if_empty(this.if_else_vars, varname, {}, one, true);
		}
		for (var varname in this.var_types[one].else_pool) {
			var path = this.var_types[one].if_pool[varname];
			init_if_empty(this.if_else_vars, varname, {}, one, false);
		}
		for (var varname in this.var_types[one].my_pool) {
			var path = this.var_types[one].my_pool[varname];
			var expr = this.var_types[one].struct.real_expr || this.var_types[one].struct.expr;
			init_if_empty(this.if_else_vars, varname, {}, one, expr);
		}
	}
};

Ozenfant.prototype.updateBindings = function () {
	this.bindings = {};
	for (var varname in this.node_vars_paths) {
		if (this.if_else_vars[varname]) {
			var breaker = false;
			for (var vn in this.if_else_vars[varname]) {
				var expected_val = this.if_else_vars[varname][vn];
				var real_val = this.state[vn];
				// XOR
				if (!(expected_val && real_val || !(expected_val || real_val))) {
					breaker = true;
					break;
				}
			}
			if (breaker) {
				continue;
			}
		}
		this.bindings[varname] = this.searchByPath(this.node_vars_paths[varname]);
		if (!this.bindings[varname]) {
			console.warn('No node found for var', varname, 'in path:', this.node_vars_paths[varname], 'in context', this.root, ', context', this.state);
		}
	}
	for (var _varname2 in this.text_vars_paths) {
		this.bindings[_varname2] = this.searchByPath(this.text_vars_paths[_varname2]);
		if (!this.bindings[_varname2]) {
			console.warn('No node found for path:', this.text_vars_paths[_varname2], 'in context', this.root);
		}
	}
};
Ozenfant.prototype.render = function (node) {
	var context = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

	if (context) {
		this.state = JSON.parse(JSON.stringify(context));
	}
	node.innerHTML = this.toHTML(this.state);
	this.setRoot(node);
	this.updateBindings();
};
Ozenfant.prototype.getTokenStruct = function (node) {
	var level = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

	var start = !node;
	if (!node) {
		node = this.struct.syntax;
	}
	var arr = [new Array(level).join('	') + node.type];
	if (node.children) {
		var _iteratorNormalCompletion8 = true;
		var _didIteratorError8 = false;
		var _iteratorError8 = undefined;

		try {
			for (var _iterator8 = node.children[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
				var child = _step8.value;

				arr.push(this.getTokenStruct(child, level + 1));
			}
		} catch (err) {
			_didIteratorError8 = true;
			_iteratorError8 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion8 && _iterator8.return) {
					_iterator8.return();
				}
			} finally {
				if (_didIteratorError8) {
					throw _iteratorError8;
				}
			}
		}
	}
	return (start ? '\n' : '') + arr.join('\n');
};

Ozenfant.prototype.getHTML = function () {
	var context = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

	if (context) {
		this.state = context;
	}
	return this.toHTML(this.state);
};
Ozenfant.prototype.setFirstNode = function (node) {
	this.root = node;
	return this;
};
Ozenfant.prototype.setRoot = function (node) {
	this.root = node.children[0];
	return this;
};
Ozenfant.prototype._setVarVal = function (key, val, binding) {
	if (this.if_else_vars[key]) {
		//console.log('ifelsevar', key, this.if_else_vars[key]);
		for (var varname in this.if_else_vars[key]) {
			var flag = this.if_else_vars[key][varname] ? this.state[varname] : !this.state[varname];
			if (!flag) {
				// this var is in inactive block
				return;
			}
		}
	}
	if (val instanceof Object) return;
	binding.textContent = val;
};
Ozenfant.prototype._setValByPath = function (path, val, root_node) {
	document.evaluate(path, root_node, null, XPathResult.ANY_TYPE, null).iterateNext().innerHTML = val;
};
Ozenfant.prototype.updateLoopVals = function (loopname, val, old_val, binding) {
	var loop = this.loop_pool[loopname];
	var prefix = new Array(loop.level + 2).join('.');
	for (var k in val) {
		if (val[k] === old_val[k]) {
			//console.log('skip', k);
			continue;
		}
		var varname = prefix + k;
		if (loop.paths[varname]) {
			this.set(varname, val[k], loop, binding, old_val[k]);
		}
	}
};

Ozenfant.prototype.removeLoopItem = function (binding, i) {
	binding.children[i].remove();
};
Ozenfant.prototype.addLoopItems = function (loop, from, to, val, binding) {
	var res = [];
	var func = this.var_types[loop].func;
	for (var i = from; i <= to; ++i) {
		res.push(func(this.state, val[i]));
	}
	// !!! should be rewritten!
	binding.insertAdjacentHTML("beforeend", res.join(''));
};

Ozenfant.prototype.setLoop = function (loopname, val, old_val, binding) {
	for (var i in val) {
		if (old_val[i]) {
			this.updateLoopVals(loopname, val[i], old_val[i], binding.children[i]);
		} else {
			this.addLoopItems(loopname, i, val.length - 1, val, binding);
			break;
		}
	}
	++i;
	if (old_val[i]) {
		for (; old_val[i]; i++) {
			this.removeLoopItem(binding, i);
		}
	}
};

Ozenfant.prototype.eachLoopBinding = function (loop, cb) {
	var parent = loop.parent_loop;
	var binding;
	if (parent) {
		this.eachLoopBinding(parent, function (bnd, val_arr) {
			var pth = parent.paths[loop.name];
			binding = Ozenfant.xpOne(pth, bnd);
			if (!binding) {
				console.error('Cannot find bindings', bnd, pth);
			}
			var llevel = get_level(loop.name);
			var scope = val_arr[llevel][trim_dots(loop.name)];
			for (var c in binding.children) {
				if (Number(c) != c) continue;
				var child = binding.children[c];
				cb(child, val_arr.concat(scope[c]), c);
			}
		});
		return;
	} else {
		// its root
		var val = this.state[loop.name];
		binding = this.bindings[loop.name];
		for (var c in binding.children) {
			if (Number(c) != c) continue;
			var child = binding.children[c];
			cb(child, [val[c]], c);
		}
	}
};

Ozenfant.prototype.rec_set = function (el, parent_loop, path, val, context, old_val) {
	var level = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 0;

	var pth = path.split('/');
	var first = pth[0].match(/([^\[]*)\[([^\]]*)\]/);
	if (!first) {
		var keyname = new Array(level + 1).join('.') + pth[0];
		var paths_hash = parent_loop.paths || parent_loop.node_vars_paths;
		var binding = Ozenfant.xpOne(paths_hash[keyname], el);
		old_val = old_val[trim_dots(keyname)];
		if (this.loop_pool[keyname]) {
			this.setLoop(keyname, val, old_val, binding);
		} else {
			this.__set(keyname, val, old_val, binding);
		}
		return;
	}
	var loopname = new Array(level + 1).join('.') + first[1];
	var index = first[2];
	old_val = old_val[trim_dots(loopname)][index];
	var loop = this.loop_pool[loopname];
	var path_pool = parent_loop === this ? this.node_vars_paths : parent_loop.paths;
	var loop_binding = Ozenfant.xpOne(path_pool[loopname], el);
	var bnd = loop_binding.children[index];
	var rest = pth.slice(1);
	if (rest.length) {
		var new_context = last(context)[loopname][index];
		this.rec_set(bnd, loop, rest.join('/'), val, context.concat(new_context), old_val, ++level);
	} else {
		var new_context = last(context)[first[1]][index];
		if (new_context) {
			// already exists
			this.updateLoopVals(loopname, val, new_context, bnd);
		} else {}
		// @todO!
		//this.addLoopItems(loopname, index, index, val, binding);

		//console.log('FINAL', bnd, val, new_context);
	}
};

Ozenfant.prototype.__set = function (key, val, old_val, binding, loop, loop_context) {
	var _this2 = this;

	if (this.nodes_vars[this.text_vars_paths[key]]) {
		var template = this.nodes_vars[this.text_vars_paths[key]];
		//console.log('template!', template);
		var new_str = template.replace(text_var_regexp, function (_, key) {
			return _this2.state[key];
		});
		this._setVarVal(key, new_str, binding);
		binding.innerHTML = new_str;
	} else {
		if (this.var_types[key]) {
			switch (this.var_types[key].type) {
				case 'ATTR':
					binding.setAttribute(this.var_types[key].name, val);
					break;
				case 'STYLE':
					binding.style[this.var_types[key].name] = val;
					break;
				case 'LOOP':
					this.setLoop(key, val, old_val, binding);
					break;
				default:
					var func;
					if (this.var_types[key] === 'USE_ROOT_FUNC') {
						func = this.struct.func;
					}
					if (this.var_types[key] instanceof Function) {
						func = this.var_types[key];
					}
					var ctx = [this.state];
					if (loop) {
						ctx = [this.state].concat(_toConsumableArray(loop_context));
					}
					var html = func.apply(null, ctx);
					binding.innerHTML = html;
					this.updateBindings();
					break;
			}
		} else {
			this._setVarVal(key, val, binding);
		}
	}
};

Ozenfant.prototype.set = function (key, val, loop, loop_binding, old_data, force, loop_context) {
	var _this3 = this;

	var binding;
	if (key.indexOf('/') !== -1) {
		// @todo
		if (key[0] === '/') {
			key = key.substr(1);
		}
		this.rec_set(this.root, this, key, val, [this.state], this.state);
		return;
	}
	if (this.state[key] === val && !force) {
		return;
	}
	if (val instanceof Object) {
		// we need to make deep copy
		try {
			val = JSON.parse(JSON.stringify(val));
		} catch (e) {
			//let it be ;)
		}
	}
	var old_val = loop ? old_data : this.state[key];
	if (!force && key[0] !== '.') {
		this.state[key] = val;
	}
	if (this.varname_pool.loop_var_links && this.varname_pool.loop_var_links[key] && !loop) {
		for (var cn in this.varname_pool.loop_var_links[key]) {
			var l_loop = this.varname_pool.loop_var_links[key][cn];
			this.eachLoopBinding(l_loop, function (node, val, i) {
				_this3.set(cn, val, l_loop, node, old_val, true, val);
			});
		}
	}
	if (this.varname_pool.var_aliases[key]) {
		var _iteratorNormalCompletion9 = true;
		var _didIteratorError9 = false;
		var _iteratorError9 = undefined;

		try {
			for (var _iterator9 = this.varname_pool.var_aliases[key][Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
				var k = _step9.value;

				this.set(k, val, loop, loop_binding, old_data, true);
			}
		} catch (err) {
			_didIteratorError9 = true;
			_iteratorError9 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion9 && _iterator9.return) {
					_iterator9.return();
				}
			} finally {
				if (_didIteratorError9) {
					throw _iteratorError9;
				}
			}
		}
	}
	if (loop) {
		binding = Ozenfant.xpOne(loop.paths[key], loop_binding);
	} else {
		if (!this.bindings[key]) {
			return;
		}
		binding = this.bindings[key];
	}
	if (!this.root) return;
	//console.log('path', this.text_vars_paths[key], 'vars', this.nodes_vars);
	if (this.if_else_tree.var_funcs[key]) {
		//console.log('should check the func first!', key);
		if (!this.if_else_tree.var_funcs[key](this.state)) {
			// no need to update anything in DOM - it's not an active branch
			return;
		}
	}
	this.__set(key, val, old_val, binding, loop, loop_context);
};
Ozenfant.xpOne = function (path) {
	var node = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : document;

	if (node !== document && path[0] === '/') {
		path = path.substr(1);
	}
	return document.evaluate(path, node, null, XPathResult.ANY_TYPE, null).iterateNext();
};

module.exports = Ozenfant;
},{"../ooo_oo_o/parser":16,"./config":17}],19:[function(require,module,exports){
'use strict';

var divide = function divide(delim, str) {
	return str.split(delim).map(function (val) {
		return val.trim();
	});
};

module.exports = {
	syntax: {
		root_token: {
			children: ['>', {
				type: 'set'
			}]
		},
		set: {
			children: ['>', {
				type: 'operator',
				optional: true
			}, {
				type: 'item'
			}, {
				type: 'item_with_comma',
				multiple: true,
				optional: true
			}]
		},
		operator: {
			free_chars: true,
			regex: /^([\>\|\&|\/])+$/
		},
		item_with_comma: {
			children: ['>', {
				type: 'comma'
			}, {
				type: 'item'
			}]
		},
		item: {
			children: ['|', {
				type: 'func',
				optional: true
			}, ['>', ['|', {
				type: 'quoted_cellname'
			}, {
				type: 'cellname'
			}, {
				type: 'bracket_extended'
			}], {
				type: 'cond',
				optional: true
			}, {
				type: 'pipe',
				optional: true
			}, {
				type: 'output',
				optional: true
			}, {
				type: 'imperatives',
				optional: true
			}, {
				type: 'quantifier',
				optional: true
			}]]
		},
		bracket_extended: {
			children: ['>', {
				type: 'bracket'
			}, {
				type: 'pipe',
				optional: true
			}, {
				type: 'output',
				optional: true
			}, {
				type: 'imperatives',
				optional: true
			}, {
				type: 'quantifier',
				optional: true
			}]
		},
		bracket: {
			start: '(',
			children: ['>', {
				type: 'set'
			}],
			end: ')'
		},
		quoted_cellname: {
			start: '"',
			end: '"',
			free_chars: true
		},
		cellname: {
			free_chars: true,
			regex: /^\s?([a-zA-Z0-9_\-])+\s?$/
		},
		output: {
			start: ':',
			free_chars: true,
			regex: /^([a-zA-Z0-9_\-])+$/
		},
		pipe: {
			start: '|',
			free_chars: true,
			regex: /^([a-zA-Z0-9_\-])+$/
		},
		threedots: {
			str: '...'
		},
		cond: {
			start: '?',
			free_chars: true,
			regex: /^([a-zA-Z0-9_\-])+$/
		},
		comma: {
			free_chars: true,
			regex: /^[\,]+$/
		},
		func: {
			children: ['>', {
				type: 'cellname'
			}, {
				type: 'func_params'
			}, {
				type: 'threedots',
				optional: true
			}, {
				type: 'pipe',
				optional: true
			}, {
				type: 'output',
				optional: true
			}]
		},
		func_params: {
			start: '(',
			free_chars: true,
			end: ')'
		},
		quantifier_char: {
			free_chars: true,
			regex: /^[\*\+]+$/
		},
		quantifier_num: {
			free_chars: true,
			start: '{',
			end: '}'
		},
		imperatives: {
			free_chars: true,
			start: '[',
			end: ']'
		},
		quantifier: {
			children: ['|', {
				type: 'quantifier_char',
				optional: true
			}, {
				type: 'quantifier_num',
				optional: true
			}]
		}
	},
	semantics: {
		root_token: {
			type: 'door'
		},
		bracket: {
			type: 'door'
		},
		bracket_extended: {
			func: function func(struct, parser) {
				var revolver = parser(struct.children[0].children[0]);
				var props = struct.children.slice(1);
				if (!props.length) {
					return revolver;
				}
				if (revolver.subtype !== '|') {
					console.log('Useless quant or output - wrong revolver type', props);
					return revolver;
				}
				//console.log('OK, props' + revolver.subtype, props);
				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = props[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var child = _step.value;

						if (child.type === 'output') {
							revolver.output = parser(child);
						}
						if (child.type === 'pipe') {
							revolver.pipe = parser(child).chars;
						}
						if (child.type === 'imperatives') {
							var ex = divide(',', child.chars).map(divide.bind(null, '='));
							revolver.imperatives = ex;
						}
						if (child.type === 'quantifier') {
							var res = {},
							    quant = parser(child);
							//console.log('Found quantifier', quant);
							switch (quant.chars) {
								case '*':
									res.min = 0;
									break;
								case '+':
									res.min = 1;
									break;
								default:
									if (quant.chars.indexOf(',') !== -1) {
										var pieces = quant.chars.split(',');
										if (pieces[0]) {
											res.min = Number(pieces[0]);
										}
										if (pieces[1]) {
											res.max = Number(pieces[1]);
										}
									} else {
										// just one number, like {42}
										res.min = res.max = Number(quant.chars);
									}
									break;
							}
							revolver.quantifier = res;
						}
					}
				} catch (err) {
					_didIteratorError = true;
					_iteratorError = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion && _iterator.return) {
							_iterator.return();
						}
					} finally {
						if (_didIteratorError) {
							throw _iteratorError;
						}
					}
				}

				return revolver;
			}

			/*type: 'door',
   ret: 1,*/
		},
		quantifier: {
			type: 'door'
		},
		quantifier_char: {
			type: 'chars'
		},
		quantifier_num: {
			type: 'chars'
		},
		cond: {
			type: 'chars'
		},
		pipe: {
			type: 'chars'
		},
		set: {
			func: function func(struct, parser) {
				var children = struct.children;
				if (children[0].type === 'operator') {
					return {
						type: 'revolver',
						subtype: children[0].chars,
						children: parser(children.slice(1))
					};
				} else {
					if (children.length > 1) {
						// ">" be default
						return {
							type: 'revolver',
							subtype: '>',
							children: parser(children)
						};
					} else {
						return parser(children[0]);
					}
				}
			}
		},
		output: {
			func: function func(struct) {
				return struct.chars;
			}
		},
		func: {
			func: function func(struct, parser) {
				//console.log('analyzing func!', struct, parser);
				var self = {
					name: struct.children[0].chars,
					params: struct.children[1].chars ? struct.children[1].chars : '',
					type: 'func',
					subtype: 'sync'
				};
				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {
					for (var _iterator2 = struct.children[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						var child = _step2.value;

						if (child.type === 'output') {
							self.output = parser(child);
						}
						if (child.type === 'pipe') {
							self.pipe = parser(child).chars;
						}
						if (child.type === 'cond') {
							self.cond = parser(child).chars;
						}
						if (child.type === 'threedots') {
							self.subtype = 'async';
						}
					}
				} catch (err) {
					_didIteratorError2 = true;
					_iteratorError2 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion2 && _iterator2.return) {
							_iterator2.return();
						}
					} finally {
						if (_didIteratorError2) {
							throw _iteratorError2;
						}
					}
				}

				return self;
			}
		},
		item: {
			func: function func(struct, parser) {
				var self = {};
				if (struct.children.length === 1) {
					switch (struct.children[0].type) {
						case 'cellname':
						case 'quoted_cellname':
							self.event = {
								name: struct.children[0].chars.trim(),
								type: 'cell'
							};
							break;
						default:
							return parser(struct.children[0]);
							break;

					}
				}
				switch (struct.children[0].type) {
					case 'cellname':
					case 'quoted_cellname':
						self.event = {
							name: struct.children[0].chars.trim(),
							type: 'cell'
						};
						break;
					default:
						self.event = parser(struct.children[0]);
						break;

				}
				var _iteratorNormalCompletion3 = true;
				var _didIteratorError3 = false;
				var _iteratorError3 = undefined;

				try {
					for (var _iterator3 = struct.children[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
						var child = _step3.value;

						if (child.type === 'output') {
							self.output = parser(child);
						}
						if (child.type === 'quantifier') {
							var res = {},
							    quant = parser(child);
							//console.log('Found quantifier', quant);
							switch (quant.chars) {
								case '*':
									res.min = 0;
									break;
								case '+':
									res.min = 1;
									break;
								default:
									if (quant.chars.indexOf(',') !== -1) {
										var pieces = quant.chars.split(',');
										if (pieces[0]) {
											res.min = Number(pieces[0]);
										}
										if (pieces[1]) {
											res.max = Number(pieces[1]);
										}
									} else {
										// just one number, like {42}
										res.min = res.max = Number(quant.chars);
									}
									break;
							}
							self.quantifier = res;
						}
						if (child.type === 'pipe') {
							self.pipe = parser(child).chars;
						}
						if (child.type === 'cond') {
							self.cond = parser(child).chars;
						}
						if (child.type === 'imperatives') {
							self.imperatives = divide(',', child.chars).map(divide.bind(null, '='));
						}
					}
				} catch (err) {
					_didIteratorError3 = true;
					_iteratorError3 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion3 && _iterator3.return) {
							_iterator3.return();
						}
					} finally {
						if (_didIteratorError3) {
							throw _iteratorError3;
						}
					}
				}

				return self;
			}
		},
		item_with_comma: {
			type: 'door',
			ret: 2
		}
	}
};
},{}],20:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var parserPackage = require('../ooo_oo_o/parser');
var config = require('./config');

var parser = parserPackage.get_parser(config);
var parsed_pool = {};

var get_subscriptions = function get_subscriptions(struct, cells_set) {
	if (struct.event) struct = struct.event;
	if (!struct.type) {
		console.warn('No type', struct);
	}
	switch (struct.type) {
		case 'revolver':
			switch (struct.subtype) {
				case '|':
					for (var i = 0; i < struct.children.length; i++) {
						var child = struct.children[i];
						if (child.event) {
							child = child.event;
						}
						get_subscriptions(struct.children[i], cells_set);
					}
					break;
				case '>':
					var child = struct.children[0];
					if (child.event) {
						child = child.event;
					}
					get_subscriptions(child, cells_set);
					break;
			}
			break;
		case 'cell':
			cells_set.add(struct.name);
			break;
	}
	return cells_set;
};

var output = function output() {};

function dripres() {
	var full_success = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
	var particular_success = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
	var value = arguments[2];

	return { full_success: full_success, particular_success: particular_success, value: value };
}

var is_luck = function is_luck(a) {
	return a.full_success;
};
var has_particular_success = function has_particular_success(a) {
	return a.particular_success;
};
var get_value = function get_value(a) {
	return a.value;
};

var is_multiple = function is_multiple(quant) {
	return !!(quant && quant.max !== 1);
};

var is_num = function is_num(a) {
	return Number(a) == a;
};

var defaultStateMutator = function defaultStateMutator(state, key, val) {
	if (val !== undefined) {
		state[key] = val;
	}
	return state;
};

var Chex = function Chex(struct) {
	var linking = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	var callbacks = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

	this.struct = struct;
	this.onOutput = linking.onOutput || function () {};
	this.onSuccess = linking.onSuccess;
	this.stateMutator = linking.stateMutator ? linking.stateMutator : defaultStateMutator;
	this.callbacks = callbacks;
	this.state = {};
	this.mirror = {
		children: []
	};
	this.refreshSubscriptions();
	this.activate_needed_events();
};

Chex.prototype.getStruct = function (struct) {
	return this.struct;
};

Chex.prototype.__runCallback = function (pipe, value) {
	var cb;
	if (is_num(pipe)) {
		// its number
		--pipe; // because it's 1-based
		cb = this.callbacks[pipe];
	} else {
		cb = this.callbacks[0][pipe];
	}
	if (!(cb instanceof Function)) {
		console.error('Callback should be a function!');
		return;
	}
	return cb(value);
};

Chex.prototype.set = function (key, val, multiple) {
	if (multiple) {
		if (!this.state[key]) {
			this.state[key] = [];
		}
		this.state[key].push(val);
	} else {
		this.state[key] = val;
	}
	this.onOutput(key, val);
};

Chex.prototype.absorb = function (struct, mirror_struct, cellname, value) {
	var _this = this;

	//console.log('checking children', struct.children);
	var res;
	var check = function check(i) {
		var child = struct.children[i];
		if (child.event) {
			child = child.event;
		}
		switch (child.type) {
			case 'cell':
			case 'func':
				if (child.name === cellname) {
					var cond = struct.children[i].cond;
					if (cond) {
						--cond; // because it's 1-based
						if (!_this.callbacks[cond]) {
							console.error('No callback for cond:', cond);
						}
						var lakmus = _this.callbacks[cond](_this.state, value);
						if (!lakmus) return dripres();
					}
					var state = mirror_struct.children[i];
					state.counter = state.counter ? state.counter + 1 : 1;
					var pipe = struct.children[i].pipe;
					var imp = struct.children[i].imperatives;
					var quant = struct.children[i].quantifier;
					if (quant && quant.max !== undefined && quant.max < state.counter) {
						// counter exceeded
						return dripres();
					}
					if (pipe) {
						value = _this.__runCallback(pipe, value);
					}
					// regular join
					var real_key = struct.children[i].output ? struct.children[i].output : cellname;
					var as_array = is_multiple(quant);
					if (as_array) {
						if (!_this.state[real_key]) {
							_this.state[real_key] = [];
						}
						_this.state[real_key].push(value);
					} else {
						_this.stateMutator(_this.state, real_key, value);
					}
					if (imp) {
						imp.forEach(function (pair) {
							var _pair = _slicedToArray(pair, 2),
							    to = _pair[0],
							    from = _pair[1];

							_this.state[to] = _this.state[from];
						});
					}
					if (quant) {
						if (state.counter >= quant.min) {
							return dripres(true, true, value);
						} else {
							return dripres();
						}
					}
					return dripres(true, true, value);
				}
				break;
			case 'revolver':
				if (!mirror_struct.children[i]) {
					mirror_struct.children[i] = {
						children: []
					};
				}
				return _this.absorb(child, mirror_struct.children[i], cellname, value);
				break;
		}
		return dripres();
	};
	var output = function output(_output, val) {
		_this.onOutput(_output, val);
	};
	if (!struct.subtype) {
		struct = struct.event;
	}
	var luck_hapenned = false;
	switch (struct.subtype) {
		case '|':
			for (var i in struct.children) {
				res = check(i);
				if (is_luck(res)) {
					var vl = get_value(res);
					if (struct.children[i].output) {
						this.set(struct.children[i].output, vl);
					}
					if (struct.output) {
						this.set(struct.output, vl, is_multiple(struct.quantifier));
					}
					return dripres(true, true, value);;
				}
			}
			break;
		case '/':
			for (var _i in struct.children) {
				if (mirror_struct.successful_branch !== undefined && mirror_struct.successful_branch !== _i) {
					//console.log('now we skip it!', i);
					continue;
				}
				res = check(_i);
				if (has_particular_success(res)) {
					mirror_struct.successful_branch = _i;
				}
				if (is_luck(res)) {
					if (struct.children[_i].output) {
						output(struct.children[_i].output, get_value(res));
					}
					return dripres(true, true, value);
				}
				if (mirror_struct.successful_branch === _i) {
					break;
				}
			}
			break;
		case '&':
			mirror_struct.count_all_counter = mirror_struct.count_all_counter || 0;
			mirror_struct.count_all_each_event = mirror_struct.count_all_each_event || {};
			for (var _i2 in struct.children) {
				//console.log('checking', struct.children[i], i, mirror_struct.count_all_counter);
				res = check(_i2);
				if (is_luck(res)) {
					luck_hapenned = true;
					if (struct.children[_i2].output) {
						output(struct.children[_i2].output, get_value(res));
					}
					if (!mirror_struct.count_all_each_event[_i2]) {
						mirror_struct.count_all_counter++;
						if (mirror_struct.count_all_counter === struct.children.length) {
							//console.log('Full success!');
							return dripres(true, true, value);
						}
					}
					mirror_struct.count_all_each_event[_i2] = true;
				}
			}
			break;
		case '>':
			var pos = mirror_struct.pos || 0;
			for (var _i3 = pos;; _i3++) {
				if (!struct.children[_i3]) {
					break;
				}
				res = check(_i3);
				var state = mirror_struct.children[_i3];
				state.counter = state.counter || 0;
				if (is_luck(res)) {
					luck_hapenned = true;
					if (mirror_struct.counter === undefined) {
						mirror_struct.counter = 0;
					}
					++mirror_struct.counter;
					if (struct.children[_i3].output) {
						output(struct.children[_i3].output, get_value(res));
					}
					var next_pos = pos + 1;
					if (!struct.children[next_pos]) {
						// revolver finished
						//console.log(struct.children, next_pos, '> REVOLVER SUCCESS!');
						return dripres(true, true, value);;
					} else {
						if (!struct.children[_i3].quantifier || mirror_struct.counter > struct.children[_i3].quantifier.max) {
							//console.log(struct.children[i].quantifier, mirror_struct.counter);
							// if it's finite
							pos = _i3;
							++pos;
							mirror_struct.pos = pos;
						}
					}
				} else {
					if (struct.children[_i3].quantifier && struct.children[_i3].quantifier.min !== 0 && state.counter < struct.children[_i3].quantifier.min) {
						break;
					}
				}
				if (!struct.children[_i3].quantifier || !is_multiple(struct.children[_i3].quantifier)) {
					//console.log('should break', struct.children[i].quantifier);
					break;
				}
				if (struct.children[_i3].quantifier && struct.children[_i3].quantifier.max !== undefined && mirror_struct.counter < struct.children[_i3].quantifier.max) {
					break;
				}
			}
			break;
		default:
			console.log('Unknown revolver type:', struct.subtype);
			break;
	}
	return dripres(false, luck_hapenned);
};

Chex.prototype.refreshSubscriptions = function () {
	var subscr = new Set();
	this.subscriptions = get_subscriptions(this.getStruct(), subscr);
};

Chex.prototype.sleep = function () {
	this.mirror = {
		children: []
	};
	this.state = {};
	this.sleeping = true;
};

Chex.prototype.awake = function () {
	this.sleeping = false;
};

Chex.prototype.activate_needed_events = function () {
	var cells_and_funcs = this.get_active_cells_and_funcs(null, null, this.struct, this.mirror);
	this.needed_events = cells_and_funcs[0];
	var cb = function cb(fnc, done, value) {
		this.drip(fnc.name, value);
	};
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = cells_and_funcs[1][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var fnc = _step.value;

			var subtype = fnc.subtype;
			if (fnc.mirror.run) {
				// already run
				continue;
			}
			if (subtype === 'sync') {
				var value = this.callbacks[0][fnc.name](this.state);
				cb.call(this, fnc, true, value);
			} else {
				if (!this.callbacks[0]) {
					console.error('You should provide a callback object with "' + fnc.name + '" key!');
				}
				if (!(this.callbacks[0][fnc.name] instanceof Function)) {
					console.error('Expecting ' + fnc.name + ' to be a function, given', _typeof(this.callbacks[0][fnc.name]), 'instead!');
				}
				this.callbacks[0][fnc.name](this.state, cb.bind(this, fnc));
			}
			fnc.mirror.run = true;
		}
		// @todo: check for linked chex' and activate them
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}
};

Chex.prototype.get_active_cells_and_funcs = function (parent, parent_mirror, branch, mirror) {
	var cells = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : new Set();
	var funcs = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : new Set();

	var res = [];
	if (branch.type === 'func') {
		cells.add(branch.name);
		funcs.add(Object.assign({ parent_mirror: parent_mirror, mirror: mirror, parent: parent }, branch));
		return [cells, funcs];
	}
	if (branch.type === 'revolver') {
		if (!mirror.children) {
			mirror.children = [];
		}
		switch (branch.subtype) {
			case '>':
				mirror.pos = mirror.pos || 0;
				if (!branch.children[mirror.pos]) {
					// revolver finished
					return [cells, funcs];
				}

				var p = mirror.pos;
				do {
					if (!mirror.children[p]) mirror.children[p] = { children: [] };
					//console.log('traversing >', branch.children, p);
					this.get_active_cells_and_funcs(branch, mirror, branch.children[p], mirror.children[p], cells, funcs);
					p++;
				} while (branch.children[p - 1] && !(!branch.children[p - 1].quantifier || branch.children[p - 1].max) || branch.children[p - 1].type === 'func');
				break;
			default:
				for (var _p in branch.children) {
					if (!mirror.children[_p]) {
						mirror.children[_p] = {
							children: []
						};
					}
					this.get_active_cells_and_funcs(branch, mirror, branch.children[_p], mirror.children[_p], cells, funcs);
				}
				//console.log('Activate each part of revolver');
				break;
		}
	} else {
		if (!branch.event) {
			console.log('So what is it?', branch);
		}
		switch (branch.event.type) {
			case 'cell':
				cells.add(branch.event.name);
				break;
			case 'revolver':
				/*if(!mirror.children[0]){
    	console.log('~~~~~~~ ADD CHILD TO MIRROR___________', mirids+1, branch, mirror);
    	mirror.children[0] = {
    		children: [],
    		parent: mirror,
    		type: branch.event.subtype,
    		id: ++mirids
    	};
    }*/
				this.get_active_cells_and_funcs(branch, mirror, branch.event, mirror, cells, funcs);
				break;
		}
	}
	return [cells, funcs];
};

Chex.prototype.drip = function (cellname, val) {
	//console.log('dripping', cellname);
	if (this.finished) {
		//console.log('No way, it\'s over!');
		return;
	}
	if (this.sleeping) {
		//console.log('No, I\'m sleeping!');
		return;
	}
	if (!this.needed_events.has(cellname)) {
		//console.log('We are not interested in this event now', cellname);
		return;
	}
	var res = this.absorb(this.struct, this.mirror, cellname, val);
	this.activate_needed_events();
	//console.log('____dripped', this.needed_events);
	if (is_luck(res)) {
		// pattern done
		//console.log('________ FINISH!');
		this.finished = true;
		this.mirror = {
			children: []
		};
		if (this.onSuccess) {
			this.onSuccess();
		}
	}
};

module.exports = {
	create: function create(che_expression, linking) {
		var struct;
		if (parsed_pool[che_expression]) {
			struct = parsed_pool[che_expression];
		} else {
			struct = parsed_pool[che_expression] = parser(che_expression);
		}
		//console.log('Sem', struct.semantics);

		for (var _len = arguments.length, callbacks = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
			callbacks[_key - 2] = arguments[_key];
		}

		var state = new Chex(struct.semantics, linking, callbacks);
		return state;
	}
};
},{"../ooo_oo_o/parser":16,"./config":19}]},{},[6])

