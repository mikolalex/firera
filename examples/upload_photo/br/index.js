(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _PackagePool = require('./PackagePool');

var _PackagePool2 = _interopRequireDefault(_PackagePool);

var _LinkManager = require('./LinkManager');

var _LinkManager2 = _interopRequireDefault(_LinkManager);

var _Parser = require('./Parser');

var _Parser2 = _interopRequireDefault(_Parser);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var _Grid = require('./Grid');

var _Grid2 = _interopRequireDefault(_Grid);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Obj = _utils2.default.Obj;
var Arr = _utils2.default.Arr;
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
				types = _utils2.default.split_camelcase(grid.cell_types[cell].type);
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

					if (_Parser2.default.system_macros.has(subtype) && subtype !== 'is') {
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

					if (!grid.cellExists(cn) && _Parser2.default.real_cell_name(cn) !== '$i') {
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

	var by_types = _utils2.default.group_by(cells, function (obj) {
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

var App = function App(config, root_package_pool) {
	var _this = this;

	this.id = ++appIds;
	this.config = config;
	if (global.firera_debug_mode !== 'off') {
		Firera.onGridCreated(this.id, function (app, grid_id) {
			var struct = get_grid_struct(_this.getGrid(grid_id));
			for (var groupname in struct.cells) {
				var _iteratorNormalCompletion4 = true;
				var _didIteratorError4 = false;
				var _iteratorError4 = undefined;

				try {
					for (var _iterator4 = struct.cells[groupname][Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
						var cell = _step4.value;

						for (var wrong_cell in cell.wrong_links) {
							_utils2.default.warn('Linking to unexisting cell:', '"' + wrong_cell + '"', 'referred by', '"' + cell.name + '"', 'hash #' + grid_id);
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
			}
		});
	}
	if (this.config.storeChanges) {
		this.changesPool = [];
	}
	this.grid_create_counter = 0;
	this.packagePool = new _PackagePool2.default(root_package_pool, this.id);
	if (config.packages) {
		var _iteratorNormalCompletion5 = true;
		var _didIteratorError5 = false;
		var _iteratorError5 = undefined;

		try {
			for (var _iterator5 = config.packages[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
				var pack = _step5.value;

				this.packagePool.load(pack);
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
	this.grids = {};
	this.gridIds = 0;
	this.linkManager = new _LinkManager2.default(this);
};

App.prototype.onChangeFinished = function (cb) {
	if (!this.onChangeFinishedStack) {
		this.onChangeFinishedStack = [];
	}
	this.onChangeFinishedStack.push(cb);
};
App.prototype._changeFinished = function () {
	if (this.onChangeFinishedStack) {
		var _iteratorNormalCompletion6 = true;
		var _didIteratorError6 = false;
		var _iteratorError6 = undefined;

		try {
			for (var _iterator6 = this.onChangeFinishedStack[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
				var cb = _step6.value;

				cb();
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
	this.startChange();
	this.root.set(cell, val, child);
	this.endChange();
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
	setLevel: function setLevel(cell, level) {
		this.levels[cell] = level;
	},
	setLevels: function setLevels() {
		var level = 1;
		this.levels = {};
		var max_level = 1;
		var already_set = new Set();
		var pool = [];
		for (var i in this.cell_types) {
			if (this.cell_types[i].parents.length === 0) {
				this.setLevel(i, 1);
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
		var _iteratorNormalCompletion7 = true;
		var _didIteratorError7 = false;
		var _iteratorError7 = undefined;

		try {
			for (var _iterator7 = this.cell_parents(cellname)[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
				var _cell = _step7.value;

				_cell = _Parser2.default.real_cell_name(_cell);
				if (this.levels[_cell] === undefined) {
					if (pool.indexOf(_cell) === -1) {
						this.setLevelsIterable(_cell, pool);
					}
				}
				if (this.levels[_cell] > max_level) {
					max_level = this.levels[_cell];
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
				this.setLevel(cellname, max_level + 1);
			}
			return;
		} else {
			this.setLevel(cellname, max_level + 1);
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
		var _iteratorNormalCompletion8 = true;
		var _didIteratorError8 = false;
		var _iteratorError8 = undefined;

		try {
			for (var _iterator8 = this.cell_parents(cellname)[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
				var _cell3 = _step8.value;

				_cell3 = _Parser2.default.real_cell_name(_cell3);
				//if(cell[0] === '-') debugger;
				if (this.levels[_cell3] === undefined) {
					//this.setLevelsRec(cell, already_set);
				}
				if (this.levels[_cell3] > max_level) {
					max_level = this.levels[_cell3];
				}
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

		if (this.levels[cellname]) {
			if (max_level + 1 > this.levels[cellname]) {
				this.setLevel(cellname, max_level + 1);
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
			this.setLevel(cellname, max_level + 1);
		}
		//console.log('New level for', cellname, 'is', max_level + 1);
		for (var _cell2 in this.cell_children(cellname)) {
			if (!already_set.has(_cell2)) {
				already_set.add(_cell2);
				this.setLevelsRec(_cell2, already_set);
			} else {
				if (this.levels[_cell2] <= this.levels[cellname]) {
					this.setLevelsRec(_cell2, already_set);
				}
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

	_Parser2.default.parse_pb(res, this.packagePool);
	_utils2.default.init_if_empty(res.plain_base, '$init', {}, '$name', null);
	res.cell_types = _Parser2.default.parse_cell_types(res.plain_base);
	res.setLevels();
	return res;
};

App.prototype.loadPackage = function (pack) {
	this.packagePool.load(pack);
};

App.prototype.startChange = function () {
	if (!this.config.trackChanges) return;
	if (this.changeObj) {
		_utils2.default.warn('old change not released!', this.changeObj);
	}
	this.changeObj = [];
};
App.prototype.logChange = function (_ref) {
	var _ref2 = _slicedToArray(_ref, 4),
	    path = _ref2[0],
	    cell = _ref2[1],
	    val = _ref2[2],
	    level = _ref2[3];

	var pathname = path + new Array(Math.max(0, 17 - path.length)).join(' ');
	level = (level || 0) + 1;
	var cellname = new Array(Number(level)).join('.') + cell + new Array(Math.max(0, 29 - cell.length - level)).join(' ');
	if (typeof val === 'string' && val.length > 255) {
		val = val.substr(0, 255);
	}
	console.log('|', pathname, '|' + level, cellname, '|', val, '|');
};
App.prototype.endChange = function () {
	if (!this.config.trackChanges) return;
	if (!this.changeObj) {
		_utils2.default.warn('change doesnt exist!');
	}
	if (this.config.storeChanges) {
		this.changesPool.push(changeObj);
	}
	if (this.config.trackChanges) {
		if (this.config.trackChangesType === 'log') {
			console.log('@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@');
			var _iteratorNormalCompletion9 = true;
			var _didIteratorError9 = false;
			var _iteratorError9 = undefined;

			try {
				for (var _iterator9 = this.changeObj[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
					var change = _step9.value;

					this.logChange(change);
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
		} else {
			console.log(this.changeObj);
		}
	}
	delete this.changeObj;
};

App.prototype.setGrid = function (id, grid) {
	this.grids[id] = grid;
};

App.prototype.branchCreated = function (grid_id) {
	var grid = this.getGrid(grid_id);
	var path = grid.path;
	if (Firera.onBranchCreatedStack[this.id]) {
		var _iteratorNormalCompletion10 = true;
		var _didIteratorError10 = false;
		var _iteratorError10 = undefined;

		try {
			for (var _iterator10 = Firera.onBranchCreatedStack[this.id][Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
				var cb = _step10.value;

				cb(this, grid_id, path, grid.parent);
			}
		} catch (err) {
			_didIteratorError10 = true;
			_iteratorError10 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion10 && _iterator10.return) {
					_iterator10.return();
				}
			} finally {
				if (_didIteratorError10) {
					throw _iteratorError10;
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
	var child = new _Grid2.default(this, type, link_as, free_vals, true, parent_id, path);
	Firera.gridCreated(this, child.id, child.path, child.parent);
	//child.setLevels();
	return child.id;
};
App.apps = apps;
App.get_app_struct = get_app_struct;
module.exports = App;
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Grid":2,"./LinkManager":3,"./PackagePool":4,"./Parser":5,"./utils":15}],2:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _Parser = require('./Parser');

var _Parser2 = _interopRequireDefault(_Parser);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Obj = _utils2.default.Obj;
var Arr = _utils2.default.Arr;

var unusual_cell = function unusual_cell(cellname) {
	return !cellname.match(/^([a-zA-Z0-9\_]*)$/);
};

var create_provider = function create_provider(app, self) {
	return {
		pool: {},
		create: function create(self, type, link_as, free_vals) {
			var child_id = self.app.createGrid(type, link_as, free_vals, self.id);
			_utils2.default.init_if_empty(self, 'linked_grids', {}, link_as, child_id);
			this.set(link_as, child_id);
			this.get(link_as).linked_grids_provider.set('..', self.id);
			app.linkManager.onNewGridAdded(self.id, child_id, link_as);
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
			app.linkManager.onRemoveGrid(id);
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
				_utils2.default.warn('removing unexisting grid!', name);
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
	_utils2.default.init_if_empty(pool, cell, {}, grid, []);
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
		_utils2.default.error('Cannot find grid to parse:', parsed_pb_name);
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
	Obj.each(this.grids_to_link, function (grid_name, link_as) {
		return _this.linkChild(grid_name, link_as);
	});
	// @todo: refactor, make this set in one step

	if (this.plain_base.$init && !init_later) {
		this.init();
	} else {
		if (this.init_values) {
			for (var cell in this.init_values) {
				//this.cell_values[cell] = this.init_values[cell];
			}
		}
	}
	if (parsed_pb.no_args_cells) {
		//this.set(parsed_pb.no_args_cells);
		this.updateTree(parsed_pb.no_args_cells, false, true);
	}
	if (this.link_chains) {
		for (var link in this.link_chains) {
			this.initLinkChain(link);
		}
	}
};

Grid.prototype.changesFinished = function () {
	this.app._changeFinished();
};

Grid.prototype.initIfSideEffectCell = function (cell) {
	if (!this.cellExists(cell) && unusual_cell(cell)) {
		_Parser2.default.parse_cellname(cell, this, 'getter', this.app.packagePool, this);
		this.cell_types = _Parser2.default.parse_cell_types(this.plain_base);
		var matched = _Parser2.default.findMatcher(cell, this.app.packagePool);
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
		_Parser2.default.parse_cellname(cell, this, 'setter', this.app.packagePool);
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
		_utils2.default.warn('Trying to link undefined grid:', grid);
		return;
	}
	var child_id = this.linkChild(grid, cellname, free_vals);
	if (!child_id) return;
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
			var chld = this.getChild(link_as);
			if (free_vals) {
				chld.set(free_vals);
			}
			return this.linked_grids_provider.pool[link_as];
		} else {
			this.unlinkChild(link_as);
		}
	}
	var id = this.linked_grids_provider.create(this, type, link_as, free_vals);
	if (!this.app.grids[id]) {
		return false;
	}
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
		var zzz = func(cell, parent_cell);
		already_counted_cells[cell] = true;
		if (zzz === Firera.skip) {
			return;
		}
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
			var new_func = func(this.cell_values[real_cell_name]);
			//console.log('Setting closure function', new_func);
			this.cell_funcs[real_cell_name] = new_func;
		}
		func = this.cell_funcs[real_cell_name];
	}
	// getting arguments
	var args;
	switch (arg_num) {
		case 1:
			args = [this.cell_value(_Parser2.default.get_real_cell_name(parents[0]))];
			break;
		case 2:
			args = [this.cell_value(_Parser2.default.get_real_cell_name(parents[0])), this.cell_value(_Parser2.default.get_real_cell_name(parents[1]))];
			break;
		case 3:
			args = [this.cell_value(_Parser2.default.get_real_cell_name(parents[0])), this.cell_value(_Parser2.default.get_real_cell_name(parents[1])), this.cell_value(_Parser2.default.get_real_cell_name(parents[2]))];
			break;
		case 4:
			args = [this.cell_value(_Parser2.default.get_real_cell_name(parents[0])), this.cell_value(_Parser2.default.get_real_cell_name(parents[1])), this.cell_value(_Parser2.default.get_real_cell_name(parents[2])), this.cell_value(_Parser2.default.get_real_cell_name(parents[3]))];
			break;
		default:
			args = this.cell_parents(real_cell_name).map(function (parent_cell_name) {
				return _this5.cell_value(_Parser2.default.get_real_cell_name(parent_cell_name));
			});
			break;
	}
	if (props.funnel) {
		if (!parent_cell_name) {
			_utils2.default.warn('Cannot calculate map cell value - no parent cell name provided!');
			return;
		}
		parent_cell_name = _Parser2.default.get_real_cell_name(parent_cell_name);
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
			_this5.app.startChange();
			_this5.set_cell_value(real_cell_name, val);
			_this5.doRecursive(_this5.compute.bind(_this5), real_cell_name, true, null, {}, true);
			_this5.changesFinished();
			_this5.app.endChange();
		});
	}
	/*for(let n of args){
 	if(n === Firera.undef){
 		//console.log('UNDEF FOUND!', cell);
 		return;
 	}
 }*/
	// counting value
	var val;
	if (props.hasOwnProperty('map') && props.map) {
		val = func instanceof Function ? func(this.cell_value(_Parser2.default.get_real_cell_name(parent_cell_name))) : func;
	} else {
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
	if (val === Firera.skip || val === this.cell_value(real_cell_name) && this.isValue(real_cell_name)) {
		return Firera.skip;
	}
	if (this.isSignal(real_cell_name)) {
		if (!val) {
			return Firera.skip;
		} else {
			val = true;
		}
	}
	if (props.async || props.nested) {} else if (props.dynamic && !dynamic) {
		var fs = _Parser2.default.parse_arr_funcstring(val, cell, { plain_base: {} }, this.app.packagePool);
		_Parser2.default.parse_cell_type(cell, fs, this.dynamic_cells_props, []);
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
		child = this.linked_grids_provider.get(childname);
		if (!child) {
			_utils2.default.warn('Cannot get - no such path', path);
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
	var max_level = 0;
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
			start_level = lvl;
		}
		if (lvl > max_level) {
			max_level = lvl;
		}
		if (!levels[lvl]) {
			levels[lvl] = new Set();
		}
		levels[lvl].add(cell);
	}
	var already = new Set();
	var x = start_level;
	var parents = {};
	while (levels[x] !== undefined || x <= max_level) {
		if (levels[x]) {
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
						if (res === Firera.skip) {
							skip = true;
						}
					}
					if (this.cell_has_type(_cell, 'async') || skip) {
						continue;
					}
					for (var child in children) {
						var _lvl = this.levels[child];
						if (!levels[_lvl]) {
							levels[_lvl] = new Set();
						}
						if (!cells[child]) {
							levels[_lvl].add(child);
						}
						parents[child] = _cell;
						for (var j = _lvl - 1; j > x; j--) {
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
		}
		x++;
	}
};

Grid.prototype.cellExists = function (cn) {
	cn = _Parser2.default.get_real_cell_name(cn);
	return this.cell_values.hasOwnProperty(cn) || this.cell_types.hasOwnProperty(cn) && this.cell_types[cn].type !== 'fake' || this.fake_cells.indexOf(cn) !== -1;
};

Grid.prototype.set = function (cells, val, child, no_args, skipsame) {
	if (child) {
		// setting value for some linked child grid
		var path = child.split('/');
		var childname = path[0];
		child = this.linked_grids_provider.get(childname);
		if (!child) {
			_utils2.default.warn('Cannot set - no such path', path);
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
		child = this.linked_grids_provider.get(childname);
		if (!child) {
			_utils2.default.warn('Cannot set - no such path', path);
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
	return this.cell_types[real_cell_name] ? this.cell_types[real_cell_name].additional_type === '~' : false;
};
Grid.prototype.real_cell_name = function (cell) {
	return this.cell_types[cell] ? this.cell_types[cell].real_cell_name : {};
};
Grid.prototype.fake_cells = ['$real_keys', '$real_values', '$path', '$app_id', '$name'];
Grid.prototype.cell_value = function (cell) {
	var _this9 = this;

	var _ret = function () {
		switch (cell) {
			case '$real_keys':
				return {
					v: [].concat(_toConsumableArray(new Set(Object.keys(_this9.plain_base).concat(Object.keys(_this9.plain_base.$init))))).filter(function (k) {
						return k.match(/^(\w|\d|\_|\-)*$/);
					})
				};
				break;
			case '$real_values':
				var res = {};
				Obj.each([].concat(_toConsumableArray(new Set(Object.keys(_this9.cell_values).concat(Object.keys(_this9.init_values))))).filter(function (k) {
					return k.match(/^(\w|\d|\_|\-)*$/);
				}), function (k, v) {
					res[k] = _this9.cell_value(k);
				});
				return {
					v: res
				};
				break;
			case '$path':
				return {
					v: _this9.path
				};
				break;
			case '$app_id':
				return {
					v: _this9.app.id
				};
				break;
			case '$name':
				return {
					v: _this9.name
				};
				break;
			default:
				if (_this9.cell_values.hasOwnProperty(cell)) {
					return {
						v: _this9.cell_values[cell]
					};
				} else {
					return {
						v: Firera.undef
					};
					//return this.cell_values[cell];
				}
		}
	}();

	if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
};
Grid.prototype.set_cell_value = function (cell, val) {
	var _this10 = this;

	this.cell_values[cell] = val;
	if (this.app.config.trackChanges && this.app.changeObj && this.asterisk_omit_list.indexOf(cell) === -1 && cell !== '*') {
		if (this.app.config.trackChanges instanceof Array && this.app.config.trackChanges.indexOf(cell) === -1) {} else {
			var change = [this.path, cell, val, this.levels[cell]];
			if (this.app.config.trackChangesType === 'log') {
				this.app.changeObj.push(change);
			}
			if (this.app.config.trackChangesType === 'imm') {
				this.app.logChange(change);
			}
		}
	}
	if (this.side_effects[cell]) {
		if (!_Parser2.default.side_effects[this.side_effects[cell]]) console.info('I SHOULD SET side-effect', cell, this.side_effects[cell], _Parser2.default.side_effects);
		_Parser2.default.side_effects[this.side_effects[cell]].func.call(this, cell, val);
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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var LinkManager = function LinkManager(app) {
	this.app = app;
	this.links = [];
	this.linkStruct = {};
	this.workingLinks = {};
	this.pointers = {};
	this.doubleAsterisk = {};
	this.pathToId = {};
	this.linksFromChildToParent = {};
};

LinkManager.prototype.onNewGridAdded = function (parent_grid_id, child_id, link_as) {
	var child_path = this.app.getGrid(child_id).path;
	//console.log('new grid added to', parent_grid_id, 'as', child_id, child_path);
	// add doubleAsterisk links
	for (var path in this.doubleAsterisk) {
		if (child_path.indexOf(path) === 0) {
			// it's a child of master grid
			for (var cellname in this.doubleAsterisk[path]) {
				if (!this.addWorkingLink(child_id, cellname, this.pathToId[path], '**/' + cellname, '**', child_path)) {
					// grid may be removed!
					continue;
				}
			}
		}
	}
	//
	for (var link_id in this.pointers[parent_grid_id]) {
		this.actualizeLink(link_id, child_id);
	}
	if (this.linksFromChildToParent[parent_grid_id] && this.linksFromChildToParent[parent_grid_id][link_as]) {
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = this.linksFromChildToParent[parent_grid_id][link_as][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var master_cell = _step.value;

				this.addWorkingLink(child_id, master_cell, parent_grid_id, link_as + '/' + master_cell, '**');
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
	var _iteratorNormalCompletion2 = true;
	var _didIteratorError2 = false;
	var _iteratorError2 = undefined;

	try {
		for (var _iterator2 = data.pointers[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
			var pointer = _step2.value;

			_utils2.default.init_if_empty(this.pointers, pointer.grid_id, {});
			this.pointers[pointer.grid_id][link_id] = data.path[pointer.pos];
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
				var cv2 = val;
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
				//console.log('GOT', cell_val, cv2);
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

LinkManager.prototype.onRemoveGrid = function (id) {
	delete this.workingLinks[id];
};

LinkManager.prototype.addWorkingLink = function (master_grid_id, master_cellname, slave_grid_id, slave_cellname, link_id, path) {
	_utils2.default.init_if_empty(this.workingLinks, master_grid_id, {}, master_cellname, {}, slave_grid_id, {}, slave_cellname, { link_id: link_id, path: path });
	//this.app.getGrid(slave_grid_id).set(slave_cellname, val);
	var master = this.app.getGrid(master_grid_id);
	if (!master) {
		//utils.warn('Link unexisting grid', master_grid_id);
		return false;
	}
	master.initIfSideEffectCell(master_cellname);
	if (!master.isSignal(master_cellname)) {
		this.checkUpdate(master_grid_id, master_cellname);
	}
};

LinkManager.prototype.actualizeLink = function (link_id, first_child_id) {
	var _this = this;

	var current_pointer;
	var data = this.links[link_id];

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
				for (var _child_name in curr_grid.linked_grids) {
					var _child_id = curr_grid.linked_grids[_child_name];
					move_further(_child_id, i + 1, start_pos, path);
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
		current_pointer = data.pointers[pointer_index];
		move_further(current_pointer.grid_id, current_pointer.pos, pointer_index, current_pointer.path);
	}
	this.refreshPointers(link_id);
};

var is_special = function is_special(path) {
	return path === '*' || path === '**' || path === '^^' || path === '^' || path === '..' || path === '';
};

LinkManager.prototype.initLink = function (grid_id, link, slave_cellname) {
	var _this2 = this;

	var path = link.split('/');
	if (path.length === 2) {
		if (!is_special(path[0])) {
			var _ret = function () {
				_utils2.default.init_if_empty(_this2.linksFromChildToParent, grid_id, {});
				_utils2.default.init_if_empty(_this2.linksFromChildToParent[grid_id], path[0], []);
				_this2.linksFromChildToParent[grid_id][path[0]].push(path[1]);
				var slave_cn = slave_cellname || link;
				_this2.app.eachChild(grid_id, function (child) {
					_this2.addWorkingLink(child.id, path[1], grid_id, slave_cn, '~', child.path);
				});
				return {
					v: void 0
				};
			}();

			if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
		}
	}
	if (path[0] == '**') {
		var _ret2 = function () {
			if (path.length > 2) {
				_utils2.default.error('You cannot listen to such path', path.join('/'));
				return {
					v: void 0
				};
			}
			var cellname = path[1];
			var grid_path = _this2.app.getGrid(grid_id).path;
			_this2.pathToId[grid_path] = grid_id;
			_utils2.default.init_if_empty(_this2.doubleAsterisk, grid_path, {}, cellname, true);
			// check already added grids
			_this2.app.eachChild(grid_id, function (child) {
				_this2.addWorkingLink(child.id, cellname, grid_id, '**/' + cellname, '**', child.path);
			});
			return {
				v: void 0
			};
		}();

		if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
	}
	if (path[0] == '^^') {
		var _ret3 = function () {
			if (path.length > 2) {
				_utils2.default.error('You cannot listen to such path', path.join('/'));
				return {
					v: void 0
				};
			}
			var cellname = path[1];
			_this2.app.eachParent(grid_id, function (grid) {
				_this2.addWorkingLink(grid.id, cellname, grid_id, '^^/' + cellname);
			});
			return {
				v: void 0
			};
		}();

		if ((typeof _ret3 === 'undefined' ? 'undefined' : _typeof(_ret3)) === "object") return _ret3.v;
	}
	if (path[0] == '') {
		if (path.length > 2) {
			_utils2.default.error('You cannot listen to such path', path.join('/'));
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
	_utils2.default.init_if_empty(this.linkStruct, grid_id, {});
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

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
			_utils2.default.error('Package not found: ' + pack);
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
		Firera.onGridCreated(this.app_id, pack.onGridCreated);
	}
	if (pack.onBranchCreated) {
		_utils2.default.init_if_empty(Firera.onBranchCreatedStack, this.app_id, []);
		Firera.onBranchCreatedStack[this.app_id].push(pack.onBranchCreated);
	}
};
module.exports = PackagePool;
},{"./utils":15}],5:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Obj = _utils2.default.Obj;
var Arr = _utils2.default.Arr;

var system_macros = new Set(['is', 'async', 'closure', 'funnel', 'dynamic', 'nested']);

var get_random_name = function () {
	// temp solution for Symbol
	var c = 1;
	return function () {
		return '@@@_' + ++c;
	};
}();

var err = function err(text) {
	_utils2.default.error(text);
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
	var real_cell_types = _utils2.default.split_camelcase(type) || [];

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
	if (additional_type && row.length === 1) {
		row.unshift(_utils2.default.id);
	}
	var func = row[0];
	var parents;
	if (row.length > 1) {
		parents = row.slice(1);
		if (func instanceof Function) {
			// regular sync cell
			type = 'is';
		} else {
			// may be 'async', 'changes' or something else
			type = func;
			func = parents.shift();
		}
	} else {
		parents = row;
		type = 'is';
	}
	cell_types[i] = get_cell_type(i, type, func, parents, additional_type);
	for (var _j in parents) {
		var _cell_listening_type = cell_listening_type(parents[_j]),
		    _cell_listening_type2 = _slicedToArray(_cell_listening_type, 2),
		    listening_type = _cell_listening_type2[0],
		    parent_cell_name = _cell_listening_type2[1];

		if (listening_type !== 'passive') {
			_utils2.default.init_if_empty(children, parent_cell_name, {});
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
			var r_type = _utils2.default.is_special(cellname) ? 'free' : 'fake';
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
		console.error('wrong func:', funcname, key + ':', a);
		return;
	}
	var cc = _utils2.default.split_camelcase(funcname);
	if (a.length === 1 && typeof a[0] === 'string') {
		funcstring = ['is', _utils2.default.id, a[0]];
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
					_utils2.default.init_if_empty(pool.plain_base, '$init', {});
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
				_utils2.default.init_if_empty(pool.plain_base, '$init', {});
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
			var c = 0;
			this.grid_i_to_id = {};
			for (var i in this.linked_grids) {
				var id = this.linked_grids[i];
				var grid = this.app.getGrid(id);
				if (grid) {
					grid.set('$i', c);
					this.grid_i_to_id[c] = id;
					c++;
				} else {
					//console.log('404', i, id, this.app.grids);
				}
			}
		}
	}
};

var get_real_cell_name = function get_real_cell_name(str) {
	if (['-', '=', '~'].indexOf(str[0]) !== -1) {
		return str.slice(1);
	} else {
		return str;
	}
};

var parse_cellname = function parse_cellname(cellname, pool, context, packages, isDynamic) {
	if (cellname.indexOf('/') !== -1) {
		//console.log('Found cellname', cellname);
		// it's a path - link to other grids
		var path = cellname.split('/');
		//console.log('Found', cellname, 'in', pool);
		if (!pool.initLinkChain) {
			_utils2.default.init_if_empty(pool, 'link_chains', {}, cellname, path);
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
			_utils2.default.init_if_empty(pool, 'side_effects', {}, cellname, []);
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
	var _loop = function _loop(_key) {
		if (_key === '$init') {
			return 'continue';
		}
		if (_key === '$children') {
			var value = res.plain_base.$children;
			if (value instanceof Array || typeof value === 'string') {
				// its dynamic children
				parse_fexpr(value, res, '$all_children', packages);
			} else {
				Obj.each(value, function (grid_type, link_as) {
					if (grid_type instanceof Array) {
						_key = '$child_' + link_as;
						//console.log('Child', grid_type, link_as, key);
						parse_fexpr(grid_type, res, _key, packages);
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
			return 'continue';
		}
		parse_fexpr(res.plain_base[_key], res, _key, packages);
		key = _key;
	};

	for (var key in res.plain_base) {
		var _ret = _loop(key);

		if (_ret === 'continue') continue;
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
		_utils2.default.init_if_empty(pool.plain_base, '$init', {});
		parse_cellname(key, pool, 'setter', packages);
		pool.plain_base.$init[key] = a;
		return;
	}
	if (!funcstring[2]) {
		// function with no dependancy
		_utils2.default.init_if_empty(pool, 'no_args_cells', {}, key, true);
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

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _utils = require('../../../utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var get_file_data = function get_file_data(cb, f) {
	if (!f) return;
	var reader = new FileReader();
	reader.onload = function (e) {
		cb(e.target.result);
	};
	reader.readAsDataURL(f);
};

var get_exif_data = function get_exif_data(cb, file) {
	if (!file) return;
	EXIF.getData(file, function () {
		if (this.exifdata && this.exifdata.DateTimeOriginal) {
			var dt = this.exifdata.DateTimeOriginal.split(' ')[0].split(':');
			var date = {
				year: dt[0],
				month: dt[1],
				date: dt[2]
			};
			cb(date);
		}
	});
};

var get_field_with_validation = function get_field_with_validation(field_classname, min_length) {
	return ['nested', function (cb, val) {
		cb('value', val);
		cb('valid', val.length >= min_length);
	}, ['value', 'valid', 'error'], '.' + field_classname + '|getval'];
};

var popup_template = '\n\t.popup\n\t\t.\n\t\t\ta.close(href: #)\n\t\t\t\t"Close"\n\t\th3.\n\t\t\t"Upload photo"\n\t\t.\n\t\t\tinput.choose-file(type: file, multiple: false, accept: image/jpeg)\n\t\t.\n\t\t\timg.uploaded-image(src: $file_data)\n\t\t.(show: $file_selected)\n\t\t\t.what\n\t\t\t\t"What?"\n\t\t\t\ttext(name: what)\n\t\t\t\t.(show: $what_invalid)\n\t\t\t\t\t"This field should not be empty"\n\t\t\t.where\n\t\t\t\t"Where?"\n\t\t\t\ttext(name: where)\n\t\t\t\t.(show: $where_invalid)\n\t\t\t\t\t"This field should not be empty"\n\t\t\t.(text-align: center, padding: 10px) \n\t\t\t\tsubmit(value: Submit, hasAttr disabled: $upload_photo.inProgress)\t\t\t\t\n';
var base = {
	$init: {
		file_selected: false,
		'$upload_photo.inProgress': false
	},
	$template: popup_template,
	close: ['join', '.close|click', [function (a) {
		return a && a.success ? true : Firera.skip;
	}, 'upload_photo.result']],
	file_select: ['nested', function (cb, files) {
		var file = files[0];
		if (!file) {
			cb('error', 'No files selected');
			return;
		}
		if (file.type !== 'image/jpeg') {
			cb('error', 'Wrong extension: ' + file.type + ', should be image/jpeg');
			return;
		}
		cb('file', file);
	}, ['error', 'file'], '.choose-file|change|files'],
	file_data: ['async', get_file_data, 'file_select.file'],
	file_selected: ['file_select.file'],
	what: get_field_with_validation('what', 2),
	where: get_field_with_validation('where', 2),
	what_invalid: ['transist', 'submit', ['!', 'what.valid']],
	where_invalid: ['transist', 'submit', ['!', 'where.valid']],
	date: ['async', get_exif_data, 'file_select.file'],
	valid: ['&&', 'what.valid', 'where.valid', 'file_data'],
	submit: ['[type=submit]|click'],
	upload_photo: ['nested', function (cb, valid, _, file_data, what, where) {
		if (valid) {
			console.log('---> Uploading photo...');
			var data = { what: what, where: where, file_data: file_data };
			cb('inProgress', true);
			setTimeout(function () {
				console.log('<=== Photo uploaded ');
				cb('inProgress', false);
				cb('result', { success: true });
			}, 1000);
		}
	}, ['inProgress', 'result'], '-valid', 'submit', '-file_data', '-what.value', '-where.value'],
	'show_message': [_utils2.default.always('Photo successfully uploaded!'), 'upload_photo.result'],
	f: [_utils2.default.l, 'show_what_error']
};
exports.default = base;
},{"../../../utils":15}],7:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _utils = require('../../../utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isDef = function isDef(n) {
	return n !== undefined;
};

var root_template = '\n\t.\n\t\t.messages{$messages_shown}\n\t\t\t.$.msg\n\t\th2\n\t\t\t"Firera file upload example"\n\t\t.\n\t\t\tbutton.show-photo-upload-popup\n\t\t\t\t"Upload photo"\n\t\t.overlay(show: $popup_shown)\n\t\t\t"OVERLAY"\n\t\t.$popup\n';

var message_timer = function message_timer() {
	var time_to_keep = 2000;
	var queue = [];
	return function (cb, _ref) {
		var _ref2 = _slicedToArray(_ref, 1),
		    msg = _ref2[0];

		var ind = queue.push({ msg: msg }) - 1;
		setTimeout(function () {
			delete queue[ind];
			cb(queue.filter(isDef));
		}, time_to_keep);
		cb(queue.filter(isDef));
	};
};

module.exports = {
	$template: root_template,
	$el: document.querySelector('.test-photo-upload'),
	'show_popup': ['.show-photo-upload-popup|click'],
	'close_popup': ['join', 'popup/close', '.overlay|click'],
	'popup_shown': ['map', {
		'show_popup': 'popup',
		'close_popup': false
	}],
	'messages_shown': ['asyncClosure', message_timer, '**/show_message'],
	$child_popup: ['popup_shown']
};
},{"../../../utils":15}],8:[function(require,module,exports){
'use strict';

var _firera = require('../../firera');

var _firera2 = _interopRequireDefault(_firera);

var _root = require('./components/root');

var _root2 = _interopRequireDefault(_root);

var _photo_upload_popup = require('./components/photo_upload_popup');

var _photo_upload_popup2 = _interopRequireDefault(_photo_upload_popup);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _firera2.default)({
	__root: _root2.default,
	popup: _photo_upload_popup2.default
}, {
	packages: ['htmlCells', 'neu_ozenfant'],
	//trackChanges: true,
	trackChangesType: 'imm'
});

dispatchEvent(new Event('click'), document.querySelector('.show-photo-upload-popup'));
},{"../../firera":9,"./components/photo_upload_popup":6,"./components/root":7}],9:[function(require,module,exports){
'use strict';

var _ozenfant = require('../ozenfant/ozenfant');

var _ozenfant2 = _interopRequireDefault(_ozenfant);

var _Parser = require('./Parser');

var _Parser2 = _interopRequireDefault(_Parser);

var _App = require('./App');

var _App2 = _interopRequireDefault(_App);

var _PackagePool = require('./PackagePool');

var _PackagePool2 = _interopRequireDefault(_PackagePool);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var _Grid = require('./Grid');

var _Grid2 = _interopRequireDefault(_Grid);

var _SimpleHtmlTemplates = require('./packages/SimpleHtmlTemplates');

var _SimpleHtmlTemplates2 = _interopRequireDefault(_SimpleHtmlTemplates);

var _Che = require('./packages/Che');

var _Che2 = _interopRequireDefault(_Che);

var _HtmlCells = require('./packages/HtmlCells');

var _HtmlCells2 = _interopRequireDefault(_HtmlCells);

var _Core = require('./packages/Core');

var _Core2 = _interopRequireDefault(_Core);

var _Ozenfant = require('./packages/Ozenfant');

var _Ozenfant2 = _interopRequireDefault(_Ozenfant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Obj = _utils2.default.Obj;


console.log("UTILS", _utils2.default);

var is_def = function is_def(a) {
	return a !== undefined && a !== Firera.undef;
};
var falsy = function falsy(a) {
	return !a || a === Firera.undef;
};

var show_performance = function show_performance() {
	var res = [];
	for (var _i = 1; _i < arguments.length; ++_i) {
		res.push(_i + ': ' + (arguments[_i] - arguments[_i - 1]).toFixed(3));
	}
	res.push('Total: ' + (arguments[i - 1] - arguments[0]).toFixed(3));
	return res.join(', ');
};

var get_app = function get_app(config) {
	var app = new _App2.default(config, root_package_pool);
	_App2.default.apps.push(app);
	return app;
};

window.Firera = function (apps) {
	var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

	if (apps.$packages) {
		config.packages = apps.$packages;
	}
	if (arguments.length > 1) {
		// it's a set of grids we should join
		apps = Firera.join.apply(null, arguments);
	}
	var start = performance.now();
	var app = get_app(config);
	// getting real pbs
	app.cbs = Obj.map(apps, app.parse_cbs.bind(app), { except: ['$packages'] });
	// now we should instantiate each pb
	if (!app.cbs.__root) {
		// no root grid
		throw new Error('Cant find root app!');
	}
	//console.log(app);
	//const compilation_finished = performance.now();
	++app.grid_create_counter;
	app.startChange();
	app.root = new _Grid2.default(app, '__root', false, { $app_id: app.id }, null, null, '/');
	app.endChange();
	Firera.gridCreated(app, app.root.id, app.root.path, null);
	--app.grid_create_counter;
	if (app.grid_create_counter === 0) {
		app.branchCreated(1);
	}
	//const init_finished = performance.now();
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
Firera.onGridCreated = function (app_id, cb) {
	_utils2.default.init_if_empty(Firera.onGridCreatedStack, app_id, []);
	Firera.onGridCreatedStack[app_id].push(cb);
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

var root_package_pool = new _PackagePool2.default();
var Firera_UNDEFINED = function Firera_UNDEFINED() {};
var Firera_SKIP = function Firera_SKIP() {};
Firera_UNDEFINED.prototype.toString = function () {
	return 'Firera.UNDEFINED';
};
Firera.undef = new Firera_UNDEFINED();
Firera.skip = new Firera_SKIP();
Firera.apps = _App2.default.apps;
Firera.run = Firera;
Firera.Ozenfant = _ozenfant2.default;
Firera.utils = _utils2.default;
Firera.is_def = is_def;
Firera.is_falsy = falsy;

Firera.getAppStruct = function () {
	return Firera.apps.map(_App2.default.get_app_struct);
};
Firera.loadPackage = function (pack) {
	root_package_pool.load(pack);
};
Firera.join = function () {
	var join = function join(a, b) {
		for (var _i2 in b) {
			a[_i2] = b[_i2];
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
				_utils2.default.init_if_empty(res, k, []);
				res.$packages = res.$packages.concat(grid[k]);
				continue;
			}
			_utils2.default.init_if_empty(res, k, {});
			join(res[k], grid[k]);
		}
	}
	return res;
};
Firera.loadPackage(_Core2.default);
Firera.loadPackage(_Che2.default);
Firera.packagesAvailable = { simpleHtmlTemplates: _SimpleHtmlTemplates2.default, htmlCells: _HtmlCells2.default, neu_ozenfant: _Ozenfant2.default, che: _Che2.default };
Firera.func_test_export = { parse_pb: _Parser2.default.parse_pb, parse_fexpr: _Parser2.default.parse_fexpr };
Firera._ = _utils2.default;

module.exports = Firera;
},{"../ozenfant/ozenfant":18,"./App":1,"./Grid":2,"./PackagePool":4,"./Parser":5,"./packages/Che":10,"./packages/Core":11,"./packages/HtmlCells":12,"./packages/Ozenfant":13,"./packages/SimpleHtmlTemplates":14,"./utils":15}],10:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _shche = require('../../shche/shche');

var _shche2 = _interopRequireDefault(_shche);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

module.exports = {
	macros: {
		che: function che(expr) {
			var _expr = _slicedToArray(expr, 2),
			    expr = _expr[0],
			    cbs = _expr[1];

			cbs = cbs || [];
			var succ_cb;
			var obj = _shche2.default.create.apply(_shche2.default, [expr, {
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
},{"../../shche/shche":20}],11:[function(require,module,exports){
'use strict';

var _macros;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _Parser = require('../Parser');

var _Parser2 = _interopRequireDefault(_Parser);

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

var Obj = _utils2.default.Obj;
var Arr = _utils2.default.Arr;

var get_by_selector = function get_by_selector(name, $el) {
	var children = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

	if (name === null) return null;
	if (name === '__root') return document.querySelector('body');
	$el = _utils2.default.raw($el);
	if (!$el) return null;
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = $el.children[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var c = _step.value;

			if (c.getAttribute('data-fr') == name) {
				return c;
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

	return null;
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
		_utils2.default.arr_different(new_arr, arr, function (key) {
			// create new element
			map[key] = ++id;
			changes.push(['add', id, new_arr[key]]);
		});
		//console.log('Computing changes between new an old arrays', new_arr, arr);
		_utils2.default.arr_different(arr, new_arr, function (key) {
			// create new element
			changes.push(['remove', map[key]]);
			delete map[key];
		});
		_utils2.default.arr_common(arr, new_arr, function (key) {
			changes.push(['change', map[key], new_arr[key]]);
		});
		arr = _utils2.default.sh_copy(new_arr);
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
				_Parser2.default.parse_fexpr(['closure', function () {
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
	macros: (_macros = {
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

			return ['closure', function (init_val) {
				var now = def !== undefined ? def : init_val;
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
				if (Firera.is_def(cellA)) {
					return func ? func(cellB) : cellB;
				} else {
					return Firera.skip;
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
		mapPrev: function mapPrev(fs) {
			var _fs5 = _slicedToArray(fs, 2),
			    map = _fs5[0],
			    def_value = _fs5[1];

			var cells = Object.keys(map);
			var func = function func(init_val) {
				var prev = def_value === undefined ? init_val : def_value;
				return function (cellname, val) {
					if (!(map[cellname] instanceof Function)) {
						prev = map[cellname];
					} else {
						prev = map[cellname](val, prev);
					}
					return prev;
				};
			};
			return ['closureFunnel', func].concat(_toConsumableArray(cells));
		},
		arr: function arr(fs) {
			var _fs6 = _slicedToArray(fs, 1),
			    config = _fs6[0];

			var args = [];
			if (config.push) {
				args.push(config.push);
			}
			if (config.pop) {
				args.push(config.pop);
			}
			var st = ['closureFunnel', function (init_val) {
				var arr = init_val || [];
				return function (cell, val) {
					if (cell === config.push) {
						arr.push(val);
					}
					if (cell === config.pop) {
						arr.splice(val, 1);
					}
					return arr;
				};
			}].concat(args);
			return st;
		},
		arrDeltas: function arrDeltas(fs) {
			var _fs7 = _slicedToArray(fs, 1),
			    config = _fs7[0];

			var args = [];
			if (config.push) {
				args.push(config.push);
			}
			if (config.pop) {
				args.push(config.pop);
			}
			var st = ['funnel', function (cell, val) {
				var deltas = [];
				if (cell === config.push) {
					deltas.push(['add', null, val]);
				}
				if (cell === config.pop) {
					deltas.push(['remove', val]);
				}
				return deltas;
			}].concat(args);
			return st;
		},
		transistAll: function transistAll(fs) {
			//const [func, ...rest] = fs;
			var func;
			if (fs[0] instanceof Function) {
				func = fs.shift();
			}
			return [function (cellA) {
				for (var _len2 = arguments.length, restArgs = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
					restArgs[_key2 - 1] = arguments[_key2];
				}

				if (cellA) {
					if (func) {
						return func.apply(null, restArgs);
					} else {
						return restArgs;
					}
				} else {
					return Firera.skip;
				}
			}].concat(fs);
		},
		'&&': function _(fs) {
			return [function (cellA, cellB) {
				return !Firera.is_falsy(cellA) && !Firera.is_falsy(cellB);
			}].concat(fs);
		},
		'||': function _(fs) {
			return [function (cellA, cellB) {
				return !Firera.is_falsy(cellA) || !Firera.is_falsy(cellB);
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
		join: function join(funcstring) {
			return [function (cell, val) {
				return val;
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
			var list_name = '';
			if (funcstring[1] || !funcstring[0] instanceof Array) {
				list_name = funcstring[0] + '/';
				funcstring = funcstring.slice(1);
			}
			var subscribe_to = list_name + '*/*';
			if (funcstring[0] instanceof Array) {
				// its an array of fields
				var fields = funcstring[0].map(function (a) {
					return list_name + '*/' + a;
				});
				subscribe_to = ['funnel', _utils2.default.ids].concat(_toConsumableArray(fields));
			}
			return ['closureFunnel', function () {
				var arr = [];
				//console.log('Returning closure');
				return function (cell, values) {
					if (cell === list_name + '$arr_data.changes') {
						for (var i in values) {
							var _values$i = _slicedToArray(values[i], 4),
							    type = _values$i[0],
							    index = _values$i[1],
							    _ = _values$i[2],
							    val = _values$i[3];

							if (type === 'add') {
								var added_obj = {};
								var _iteratorNormalCompletion2 = true;
								var _didIteratorError2 = false;
								var _iteratorError2 = undefined;

								try {
									for (var _iterator2 = fields[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
										var fieldname = _step2.value;

										fieldname = fieldname.replace(list_name + "*/", "");
										added_obj[fieldname] = val[fieldname];
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
							    val = _values[1];

							if (!_fieldname.replace) debugger;
							_fieldname = _fieldname.replace(list_name + "*/", "");
							if (val && arr[val[0]]) {
								//console.log('?', val, arr, fieldname, arr[val[0]]);
								arr[val[0]][_fieldname] = val[1];
							}
						}
					}
					return _utils2.default.arr_fix_keys(arr);
				};
			}, subscribe_to, list_name + '$arr_data.changes'];
		},
		indices: function indices(funcstring) {
			var func = funcstring[0];
			var field = '*/' + funcstring[1];
			if (!funcstring[1]) {
				field = '*/' + func;
				func = _utils2.default.id;
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
						var _iteratorNormalCompletion3 = true;
						var _didIteratorError3 = false;
						var _iteratorError3 = undefined;

						try {
							for (var _iterator3 = vl[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
								var _step3$value = _slicedToArray(_step3.value, 2),
								    change_type = _step3$value[0],
								    _index = _step3$value[1];

								if (change_type === 'remove') {
									indices.delete(_index);
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
			var fnc = funcstring[1] ? funcstring[1] : _utils2.default.id;
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
					if (_utils2.default.path_cellname(cell) == '$arr_data.changes') {
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

					val = fnc(val);
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
		}
	}, _defineProperty(_macros, 'join', function join(funcstring) {
		return ['funnel', _utils2.default.second].concat(funcstring);
	}), _defineProperty(_macros, 'list', function list(funcstring) {
		var props = funcstring[0];
		if (!props instanceof Object) {
			_utils2.default.error('List properties should be an object!');
		}
		var item_type = props.type;
		if (!props.push && !props.datasource && !props.deltas && !props.data && !funcstring[1]) {
			_utils2.default.warn('No item source provided for list', funcstring);
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
							var _iteratorNormalCompletion4 = true;
							var _didIteratorError4 = false;
							var _iteratorError4 = undefined;

							try {
								for (var _iterator4 = key[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
									var k = _step4.value;

									arr.push(['remove', k]);
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

							return arr;
						}
						return [['remove', key]];
					}
				}
			}];
		} else if (props.deltas) {
			deltas_func = [_utils2.default.id, props.deltas];
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
					//console.log('Got changes:', utils.frozen(chngs), 'from', changes);
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
			$is_list: true,
			$children: ['$arr_data.changes']
		};
		if (props.push) {
			all_lists_mixin.$push = props.push;
			if (!props.push instanceof Array) {
				_utils2.default.error('List\'s PUSH property should be a F-expression(array), given', props.push);
			}
		}
		if (props.pop) {
			all_lists_mixin.$pop = props.pop;
			if (!props.pop instanceof Array) {
				_utils2.default.error('List\'s POP property should be a F-expression(array), given', props.pop);
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
			fnc = [_utils2.default.always(list_own_type)];
		}
		return fnc;
	}), _defineProperty(_macros, 'arr_deltas', function arr_deltas(funcstring) {
		var cell = funcstring[0];
		return ['closure', function () {
			var val = [];
			return function (new_arr) {
				var deltas = _utils2.default.arr_deltas(val, new_arr);
				val = new_arr;
				//console.info('deltas are', deltas);
				return deltas;
			};
		}, cell];
	}), _macros)
};
},{"../Parser":5,"../utils":15}],12:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _Parser = require('../Parser');

var _Parser2 = _interopRequireDefault(_Parser);

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/* gator v1.2.4 craig.is/riding/gators */
(function () {
	function t(a) {
		return k ? k : a.matches ? k = a.matches : a.webkitMatchesSelector ? k = a.webkitMatchesSelector : a.mozMatchesSelector ? k = a.mozMatchesSelector : a.msMatchesSelector ? k = a.msMatchesSelector : a.oMatchesSelector ? k = a.oMatchesSelector : k = e.matchesSelector;
	}function q(a, b, c) {
		if ("_root" == b) return c;if (a !== c) {
			if (t(a).call(a, b)) return a;if (a.parentNode) return m++, q(a.parentNode, b, c);
		}
	}function u(a, b, c, e) {
		d[a.id] || (d[a.id] = {});d[a.id][b] || (d[a.id][b] = {});d[a.id][b][c] || (d[a.id][b][c] = []);d[a.id][b][c].push(e);
	}
	function v(a, b, c, e) {
		if (d[a.id]) if (!b) for (var _f in d[a.id]) {
			d[a.id].hasOwnProperty(_f) && (d[a.id][_f] = {});
		} else if (!e && !c) d[a.id][b] = {};else if (!e) delete d[a.id][b][c];else if (d[a.id][b][c]) for (f = 0; f < d[a.id][b][c].length; f++) {
			if (d[a.id][b][c][f] === e) {
				d[a.id][b][c].splice(f, 1);break;
			}
		}
	}function w(a, b, c) {
		if (d[a][c]) {
			var k = b.target || b.srcElement,
			    f,
			    g,
			    h = {},
			    n = g = 0;m = 0;for (f in d[a][c]) {
				d[a][c].hasOwnProperty(f) && (g = q(k, f, l[a].element)) && e.matchesEvent(c, l[a].element, g, "_root" == f, b) && (m++, d[a][c][f].match = g, h[m] = d[a][c][f]);
			}b.stopPropagation = function () {
				b.cancelBubble = !0;
			};for (g = 0; g <= m; g++) {
				if (h[g]) for (n = 0; n < h[g].length; n++) {
					if (!1 === h[g][n].call(h[g].match, b)) {
						e.cancel(b);return;
					}if (b.cancelBubble) return;
				}
			}
		}
	}function r(a, b, c, k) {
		function f(a) {
			return function (b) {
				w(g, b, a);
			};
		}if (this.element) {
			a instanceof Array || (a = [a]);c || "function" != typeof b || (c = b, b = "_root");var g = this.id,
			    h;for (h = 0; h < a.length; h++) {
				k ? v(this, a[h], b, c) : (d[g] && d[g][a[h]] || e.addEvent(this, a[h], f(a[h])), u(this, a[h], b, c));
			}return this;
		}
	}function e(a, b) {
		if (!(this instanceof e)) {
			for (var c in l) {
				if (l[c].element === a) return l[c];
			}p++;l[p] = new e(a, p);return l[p];
		}this.element = a;this.id = b;
	}var k,
	    m = 0,
	    p = 0,
	    d = {},
	    l = {};e.prototype.on = function (a, b, c) {
		return r.call(this, a, b, c);
	};e.prototype.off = function (a, b, c) {
		return r.call(this, a, b, c, !0);
	};e.matchesSelector = function () {};e.cancel = function (a) {
		a.preventDefault();a.stopPropagation();
	};e.addEvent = function (a, b, c) {
		a.element.addEventListener(b, c, "blur" == b || "focus" == b);
	};e.matchesEvent = function () {
		return !0;
	};"undefined" !== typeof module && module.exports && (module.exports = e);window.Gator = e;
})();

var filter_attr_in_path = function filter_attr_in_path(e, delegateEl) {
	if (e && e.path) {
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = e.path[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var nd = _step.value;

				if (nd === e.target) {
					continue;
				}
				if (nd === delegateEl) {
					break;
				}
				if (nd.getAttribute('data-fr-grid-root')) {
					return false;
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
	}
	return true;
};
var filter_attr_in_parents = function filter_attr_in_parents(parent_node, index, el) {
	for (;;) {
		el = el.parentElement;
		if (!el) return true;
		if (el.hasAttribute('data-fr-grid-root')) {
			return el.children[0] === parent_node;
		}
	}
};
var htmlPipeAspects = {
	attr: function attr(e, _attr) {
		if (!e) return;
		/*debugger;
  for(var attrName in attr){
  	el.setAttribute(attrName, attr[attrName]);
  }*/
		return e.target.getAttribute(_attr);
	},
	files: function files(e) {
		return e.target.files;
	}
};

var raw = function raw(a) {
	if (a instanceof Node || !a) {
		return a;
	} else {
		return a[0];
	}
};

var make_resp1 = function make_resp1(cb, val) {
	return cb(val);
};

var make_resp2 = function make_resp2(pipe, cb, e) {
	var res;
	var _iteratorNormalCompletion2 = true;
	var _didIteratorError2 = false;
	var _iteratorError2 = undefined;

	try {
		for (var _iterator2 = pipe[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
			var _step2$value = _slicedToArray(_step2.value, 2),
			    asp = _step2$value[0],
			    pars = _step2$value[1];

			if (!htmlPipeAspects[asp]) {
				console.error('Unknown pipe aspect:', asp);
				continue;
			}
			res = htmlPipeAspects[asp].apply(htmlPipeAspects, [e].concat(_toConsumableArray(pars)));
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

	return cb(res);
};

var toggle_class = function toggle_class(el, clas, val) {
	var cls_string = el.getAttribute('class') || '';
	var cls = cls_string.split(' ');
	var pos = cls.indexOf(clas);
	var toggle;
	if (val !== undefined) {
		toggle = val;
	} else {
		toggle = pos === -1;
	}
	if (toggle) {
		if (cls.indexOf(clas) === -1) {
			el.setAttribute('class', cls_string + ' ' + clas);
		}
	} else {
		if (pos !== -1) {
			cls.splice(pos, 1);
		}
		el.setAttribute('class', cls.join(' '));
	}
};

var trigger_event = function trigger_event(name, element, fakeTarget) {
	var event; // The custom event that will be created
	if (element instanceof $) {
		var _iteratorNormalCompletion3 = true;
		var _didIteratorError3 = false;
		var _iteratorError3 = undefined;

		try {
			for (var _iterator3 = element[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
				var el = _step3.value;

				trigger_event(name, el);
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

		return;
	}
	if (document.createEvent) {
		event = document.createEvent("HTMLEvents");
		event.initEvent(name, true, true);
	} else {
		event = document.createEventObject();
		event.eventType = name;
	}

	event.eventName = name;
	if (fakeTarget) {
		e.target = fakeTarget;
	}

	if (document.createEvent) {
		element.dispatchEvent(event);
	} else {
		element.fireEvent("on" + event.eventType, event);
	}
};

var get_handler = function get_handler(event, selector, all_subtree, make_resp) {
	return function (cb, vals) {
		if (!vals) return;

		var _vals = _slicedToArray(vals, 2),
		    $prev_el = _vals[0],
		    $now_el = _vals[1];

		if (!Firera.is_def($now_el)) return;
		var prev_el = raw($prev_el);
		var now_el = raw($now_el);
		//console.log('Assigning handlers for ', cellname, arguments, $now_el);
		if (prev_el && prev_el !== Firera.undef) {
			Gator(prev_el).off(event);
		}
		if (!$now_el) {
			_utils2.default.warn('Assigning handlers to nothing', $now_el);
		}
		Gator(now_el).on(event, selector, function (e) {
			if (!all_subtree && !filter_attr_in_path(e, now_el)) {
				return;
			}
			make_resp(cb, e);
			if (e.originalEvent && e.originalEvent.target) {
				trigger_event(event, document, e.originalEvent.target);
			}
		});
	};
};

module.exports = {
	eachGridMixin: {
		'$html_skeleton_changes': ['$real_el']
	},
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

				var make_resp = !pipe.length ? make_resp1 : make_resp2.bind(null, pipe);
				var selector = matches[2];
				var all_subtree = false;
				var func, params;
				var setters = new Set(['visibility', 'display', 'setval', 'hasClass', 'css', 'setfocus']);
				var getters = new Set(['getval', 'change', 'click', 'dblclick', 'getfocus', '', 'scrollPos', 'press', 'hasClass', 'enterText', 'visibility', 'css', 'display', 'setval']);

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
				if (!setters.has(aspect) && !getters.has(aspect)) {
					_utils2.default.error('Aspect "' + aspect + '" not found!');
					return;
				}
				if (context === 'setter' && !setters.has(aspect)) {
					//utils.error('HTML setter ' + aspect + ' not found! In ' + matches[0]);
					return;
				}
				if (context !== 'setter' && setters.has(aspect)) {
					//utils.error('Using HTML setter ' + aspect + ' not in setter context!');
					return;
				}

				switch (aspect) {
					case 'getval':
						func = function func(cb, vals) {
							var onch = function onch(el) {
								var type = el.getAttribute('type');
								var val;
								if (type == 'checkbox') {
									val = el.hasAttribute('checked');
								} else {
									val = el.value;
								}
								//console.log('CHange', el, val, selector);
								make_resp(cb, val);
							};

							var _vals2 = _slicedToArray(vals, 2),
							    $prev_el = _vals2[0],
							    $now_el = _vals2[1];

							var prev_el = raw($prev_el);
							var el = raw($now_el);
							var onChange = function onChange(e) {
								if (!all_subtree && !filter_attr_in_path(e, el)) {
									return;
								}
								onch(e.target);
							};
							var onKeyup = function onKeyup(e) {
								if (!all_subtree && !filter_attr_in_path(e, el)) {
									return;
								}
								var elem = e.target;
								var type = elem.getAttribute('type');
								var val;
								if (type == 'checkbox') {
									return;
								} else {
									val = elem.value;
								}
								make_resp(cb, val);
							};
							//console.log('Assigning handlers for ', cellname, arguments, $now_el.find(selector));
							if (Firera.is_def($prev_el)) {
								Gator(prev_el).off('keyup', selector);
								Gator(prev_el).off('change', selector);
							}
							if (Firera.is_def($now_el)) {
								Gator(el).on('keyup', selector, onKeyup);
								Gator(el).on('change', selector, onChange);
							}
						};
						break;
					case 'click':
						if (selector === 'other') {
							func = function func(cb, vals) {
								if (!vals) return;

								var _vals3 = _slicedToArray(vals, 2),
								    $prev_el = _vals3[0],
								    $now_el = _vals3[1];

								$prev_el = raw($prev_el);
								$now_el = raw($now_el);
								if (!Firera.is_def($now_el)) return;
								document.addEventListener('click', function (e) {
									var ot = e.srcElement || e.originalTarget;
									var is_other = $now_el.contains(ot);
									if (is_other) {
										make_resp(cb, true);
									}
								});
							};
						} else {
							func = function func(cb, vals) {
								if (!vals) return;

								var _vals4 = _slicedToArray(vals, 2),
								    $prev_el = _vals4[0],
								    $now_el = _vals4[1];

								if (!Firera.is_def($now_el)) return;
								var prev_el = raw($prev_el);
								var now_el = raw($now_el);
								//console.log('Assigning handlers for ', cellname, arguments, $now_el);
								if (prev_el && prev_el !== Firera.undef) {
									Gator(prev_el).off('click');
								}
								if (!$now_el) {
									_utils2.default.warn('Assigning handlers to nothing', $now_el);
								}
								Gator(now_el).on('click', selector, function (e) {
									if (!all_subtree && !filter_attr_in_path(e, now_el)) {
										return;
									}
									make_resp(cb, e);
									if (e.originalEvent && e.originalEvent.target) {
										trigger_event('click', document, e.originalEvent.target);
									}
									e.preventDefault();
									//return false;
								});
							};
						}
						break;
					case 'dblclick':
						func = get_handler('dblclick', selector, all_subtree, make_resp);
						break;
					case 'change':
						func = get_handler('change', selector, all_subtree, make_resp);
						break;
					case 'focus':
						func = function func(cb, vals) {
							if (!vals) return;

							var _vals5 = _slicedToArray(vals, 2),
							    $prev_el = _vals5[0],
							    $now_el = _vals5[1];

							if (!Firera.is_def($now_el)) return;
							if ($prev_el) {
								// @todo
							}
							var el = raw($now_el);
							Gator(el).on('focus', selector, function (e) {
								if (!all_subtree && !filter_attr_in_path(e, el)) {
									return;
								}
								make_resp(cb, e);
								return false;
							});
						};
						break;
					case '':
						func = function func(cb, vals) {
							if (!vals) return;

							var _vals6 = _slicedToArray(vals, 2),
							    $prev_el = _vals6[0],
							    $now_el = _vals6[1];

							if (!Firera.is_def($now_el)) return;
							make_resp(cb, $now_el.querySelectorAll(selector));
						};
						break;
					case 'scrollPos':
						func = function func(cb, vals) {
							if (!vals) return;

							var _vals7 = _slicedToArray(vals, 2),
							    $prev_el = _vals7[0],
							    $now_el = _vals7[1];

							if (!Firera.is_def($now_el)) return;
							if ($prev_el) {
								// @todo
							}
							var el = raw($now_el);
							var element = el.querySelector(selector);

							var _params = params,
							    _params2 = _slicedToArray(_params, 1),
							    direction = _params2[0];

							var mn = { 'Y': 'scrollTop', 'X': 'scrollLeft' }[direction];
							element.addEventListener('scroll', function (e) {
								make_resp(cb, e.target[mn]);
							});
						};
						break;
					case 'press':
						func = function func(cb, vals) {
							var _vals8 = _slicedToArray(vals, 2),
							    prev_el = _vals8[0],
							    now_el = _vals8[1];

							if (!Firera.is_def(now_el)) return;
							//console.log('Assigning handlers for ', cellname, arguments, $now_el);
							if (prev_el) {
								//$prev_el.off('keyup', selector);
							}
							now_el = raw(now_el);
							Gator(now_el).on('keyup', selector, function (e) {
								if (!all_subtree && !filter_attr_in_path(e, now_el)) {
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
							$el = raw($el);

							var _params3 = params,
							    _params4 = _slicedToArray(_params3, 1),
							    classname = _params4[0];

							toggle_class($el, classname, val);
						};
						break;
					case 'enterText':
						func = function func(cb, vals) {
							var _vals9 = _slicedToArray(vals, 2),
							    $prev_el = _vals9[0],
							    $now_el = _vals9[1];

							if (!$now_el) return;
							if ($prev_el) {
								//$prev_el.off('keyup', selector);
							}
							var el = raw($now_el);
							el.onkeyup = function (e) {
								if (e.target === el.querySelector(selector)) {
									if (!all_subtree && !filter_attr_in_path(e, el)) {
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
						func = function func(el, val) {
							if (!Firera.is_def(el)) {
								return;
							}
							if (val === undefined) {
								return;
							}
							el = raw(el);
							if (val) {
								el.style.visibility = 'visible';
							} else {
								el.style.visibility = 'hidden';
							}
						};
						break;
					case 'css':
						var _params5 = params,
						    _params6 = _slicedToArray(_params5, 2),
						    property = _params6[0],
						    unit = _params6[1];

						if (unit) {
							unit = unit.trim();
						}
						func = function func(el, val) {
							if (unit) {
								val = val + unit;
							}
							if (el && el[0]) {
								el[0].style[property] = val;
							}
						};
						break;
					case 'display':
						func = function func(el, val) {
							if (!Firera.is_def(el) || val === undefined) {
								return;
							}

							el = raw(el);
							if (val) {
								el.style.display = 'block';
							} else {
								el.style.display = 'none';
							}
						};
						break;
					case 'setval':
						func = function func(el, val) {
							if (!Firera.is_def(el) || !Firera.is_def(val)) {
								return;
							}
							el = raw(el);
							el.value = val;
						};
						break;
					default:
						debugger;
						throw new Error('unknown HTML aspect: =' + aspect + '=');
						break;
				}
				if (context === 'setter') {
					_Parser2.default.parse_fexpr([func, [function (a) {
						if (!Firera.is_def(a)) return false;
						if (!selector) return a;
						if (selector === 'other') return a;
						a = raw(a);
						if (!a) {
							return a;
						}
						return a.querySelectorAll(selector);
						/*var node = a.find(selector) @todo
      		.filter(filter_attr_in_parents.bind(null, a));*/
					}, '-$real_el', '$html_skeleton_changes'], cellname], pool, _Parser2.default.get_random_name(), packages);
				} else {
					_Parser2.default.parse_fexpr(['asyncClosure', function () {
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
},{"../Parser":5,"../utils":15}],13:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var rendered = {};
var templates = {};
var closest_templates = {};

var raw = _utils2.default.raw;

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
	return Object.keys(struct.children).length && !struct.children[0].val;
};

var get_arr_val = function get_arr_val(app, grid_id) {
	var vals = app.getGrid(grid_id).getChildrenValues();
	return vals;
};

var render_rec = function render_rec(app, struct, closest_existing_template_path, skip) {
	var grid = app.getGrid(struct.grid_id);
	_utils2.default.init_if_empty(rendered, app.id, {}, grid.id, true);
	if (struct.val) {
		var context = Object.assign({}, grid.cell_values);
		_utils2.default.init_if_empty(templates, app.id, {});
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
			var _res = [];
			for (var _key in struct.children) {
				_res.push(render_rec(app, struct.children[_key]));
			}
			return _res.join('');
		} else {
			_utils2.default.init_if_empty(closest_templates, app.id, {});
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
	var grid = app.getGrid(struct.grid_id);
	el = raw(el);
	if (struct.tmpl) {
		el.setAttribute('data-fr-grid-root', 1);
		if (is_root) {
			struct.tmpl.setFirstNode(el).updateBindings();
		} else {
			struct.tmpl.setRoot(el).updateBindings();
		}
		grid.set('$real_el', el);
		for (var key in struct.children) {
			var _el = struct.tmpl.bindings[key];
			if (_el) {
				set_bindings_rec(app, struct.children[key], _el, false, true);
			}
		}
	} else {
		if (el && !skip) {
			grid.set('$real_el', el);
			el.setAttribute('data-fr-grid-root', 1);
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
	container.innerHTML = html;
	var children = container.children;
	if (children[1]) {
		console.error('Template should have only one root node,', children, html);
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
			if (!self.cell_values.$el) {
				return;
			}
			var node = raw(self.cell_values.$el);
			container = document.createElement('div');
			container.style.display = 'none';
			container.setAttribute('id', 'ozenfant-container-hidden');
			document.getElementsByTagName('body')[0].appendChild(container);
			render(app, self, node);
		}
		if (rendered[app.id] && rendered[app.id][parent]) {
			var parent_path = app.getGrid(parent).path;
			var parent_tmpl = templates[app.id][parent_path];
			if (parent_tmpl) {
				var _node = parent_tmpl.bindings[self.name];
				if (!_node) {
					console.error('No binding found for', self.name, 'in path', parent_path);
					return;
				}
				render(app, self, _node);
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
				var _node2 = get_root_node_from_html(html);
				//parpar_binding.insertAdjacentHTML("beforeend", html);
				parpar_binding.appendChild(_node2);
				set_bindings_rec(app, struct, _node2, true);
			}
		}
	}
};
},{"../utils":15}],14:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _utils = require('../utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Obj = _utils2.default.Obj;
var search_fr_bindings = function search_fr_bindings($el) {
	var res = {};
	if (!Firera.is_def($el)) return res;
	$el = _utils2.default.raw($el);
	if (!$el) {
		return res;
	}
	$el.querySelectorAll('[data-fr]').forEach(function (node, k) {
		var name = node.getAttribute('data-fr-name');
		if (!name) {
			name = node.getAttribute('data-fr');
		}
		res[name] = node;
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
					val[i].innerHTML = pool[i];
				}
			}
		}
	};
};

module.exports = {
	eachGridMixin: {
		$list_template_writer: ['nestedClosure', function () {
			var index_c = 3;
			var index_map = {};
			return function (cb, is_list, deltas, $el) {
				if ($el === Firera.undef || !is_list || !$el) return;
				for (var i in deltas) {
					var type = deltas[i][0];
					var key = deltas[i][1];
					switch (type) {
						case 'add':
							$el.insertAdjacentHTML('beforeend', '<div data-fr="' + ++index_c + '" data-fr-name="' + key + '"></div>');
							index_map[key] = index_c;
							// I domt know...
							break;
						case 'remove':
							$el.querySelector('[data-fr="' + index_map[key] + '"]').remove();
							break;
					}
				}
				cb('dummy', true);
				cb('index_map', index_map);
				return true;
			};
		}, '-$is_list', '$arr_data.changes', '$real_el'],
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

			if (Firera.is_def($prev_el) && Firera.is_def($el) && $prev_el === $el) {
				return false;
			} else {
				return true;
			}
		}, function ($el) {
			$el = _utils2.default.raw($el);
			var str = '';
			if (Firera.is_def($el)) {
				str = !$el ? '' : $el.innerHTML.trim();
			}
			return str;
		}, '$real_el'],
		'$template_writer': [function (real_templ, $html_template, no_auto, keys, $el) {
			$el = _utils2.default.raw($el);
			if (Firera.is_def(real_templ) && Firera.is_def($el) && $el) {
				$el.innerHTML = real_templ;
				return true;
			}
			if (!$html_template && Firera.is_def($el) && keys && !no_auto && $el) {
				var auto_template = keys.map(function (k) {
					return '<div>' + k + ':<div data-fr="' + k + '"></div></div>';
				}).join(' ');
				$el.innerHTML = auto_template;
			}
		}, '$template', '$html_template', '$no_auto_template', '-$real_keys', '-$real_el'],
		'$html_skeleton_changes': [_utils2.default.id, '$template_writer'],
		'$htmlbindings': [function (is_list, a, b, c) {
			if (!is_list) {
				return search_fr_bindings(a, b);
			} else {
				if (!a || !c) return;
				var res = Obj.map(c, function (n, i) {
					return get_by_selector(c[i], a);
				});
				return res;
			}
		}, '-$is_list', '-$real_el', '$template_writer', '$list_template_writer.index_map'],
		'$writer': ['closureFunnel', write_changes, '$htmlbindings', '*']
	}
};
},{"../utils":15}],15:[function(require,module,exports){
"use strict";
},{}],16:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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
							if (is_empty_char(char) && !started && !tk.can_start_with_space) {
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
									//console.log('matching regex', tt, tk.regex, 'against "' + char + '"', a1, '"' + string_to_compare + '"', a2);
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
					if (test_str === tk.str) {
						return [res, pos + tk.str.length];
					} else {
						return [false, pos];
					}
				} else {
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

	var _parse_rec = parse_rec('root_token', str, 0),
	    _parse_rec2 = _slicedToArray(_parse_rec, 2),
	    struct = _parse_rec2[0],
	    pos = _parse_rec2[1];

	if (pos < str.length) {
		var rest = str.substr(pos);
		if (!rest.match(/^\s*$/)) {
			throw new Error('Parse error - cannot parse:\n' + rest);
		}
	}
	struct = flatten(struct);
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
var count_indent = function count_indent(str, child) {
	var spaces = str.match(/[\s^\t]*/g);
	var spaces_count = 0;
	if (spaces) {
		for (var i in spaces) {
			spaces_count += spaces[i].length;
		}
	}
	var tabs = str.match(/[\t]*/g);
	var tabs_count = 0;
	if (tabs) {
		for (var i in tabs) {
			tabs_count += tabs[i].length;
		}
	}
	spaces_count -= tabs_count;
	return spaces_count + tabs_count * 4;
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
			}, 'optional'], ['|', {
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
				type: 'trim',
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
			can_start_with_space: true,
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
			can_start_with_space: true,
			regex: /^(\t|\s)+$/,
			free_chars: true
		},
		trim: {
			can_start_with_space: true,
			regex: /^[\t ]*$/,
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
								res.level = count_indent(child.chars, child);
								break;
							case 'loop':
								var loopvn = child.chars.match(/\{\$([^\}]*)\}/);
								if (!loopvn) {
									throw new Error('Ozenfant: Wrong loop var name: ' + child.chars + ', should match /\{\$([^\}]*)\}/');
								}
								res.loop = loopvn[1];
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
											var val = assign[1] ? assign[1].trim() : '';
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

var toggle_class = function toggle_class(el, clas, val) {
	var cls_string = el.getAttribute('class') || '';
	var cls = cls_string.split(' ');
	var pos = cls.indexOf(clas);
	var toggle;
	if (val !== undefined) {
		toggle = val;
	} else {
		toggle = pos === -1;
	}
	if (toggle) {
		if (cls.indexOf(clas) === -1) {
			el.setAttribute('class', cls_string + ' ' + clas);
		}
	} else {
		if (pos !== -1) {
			cls.splice(pos, 1);
		}
		el.setAttribute('class', cls.join(' '));
	}
};

var html_attrs = new Set(["accept", "accept-charset", "accesskey", "action", "align", "alt", "async", "autocomplete", "autofocus", "autoplay", "autosave", "bgcolor", "border", "buffered", "challenge", "charset", "checked", "cite", "class", "code", "codebase", "color", "cols", "colspan", "content", "contenteditable", "contextmenu", "controls", "coords", "data", "data-*", "datetime", "default", "defer", "dir", "dirname", "disabled", "download", "draggable", "dropzone", "enctype", "for", "form", "formaction", "headers", "hidden", "high", "href", "hreflang", "http-equiv", "icon", "id", "integrity", "ismap", "itemprop", "keytype", "kind", "label", "lang", "language", "list", "loop", "low", "manifest", "max", "maxlength", "media", "method", "min", "multiple", "muted", "name", "novalidate", "open", "optimum", "pattern", "ping", "placeholder", "poster", "preload", "radiogroup", "readonly", "rel", "required", "reversed", "rows", "rowspan", "sandbox", "scope", "scoped", "seamless", "selected", "shape", "size", "sizes", "slot", "span", "spellcheck", "src", "srcdoc", "srclang", "srcset", "start", "step", "style", "summary", "tabindex", "target", "title", "type", "usemap", "value", "wrap"]);
var is_attr = function is_attr(str) {
	return html_attrs.has(str) || str.match(/^data\-/);
};

var traverse_tree = function traverse_tree(root_node, cb) {
	var key = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'children';

	for (var b in root_node[key]) {
		var leaf = root_node[key][b];
		cb(leaf);
		traverse_tree(leaf, cb, key);
	}
};

var text_var_regexp = /\{\{([a-zA-Z0-9\_]*)\}\}/g; ///\$([a-zA-Z0-9]*)/g;

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
	try {
		var f = new Function(args, fbody);
		return f;
	} catch (e) {
		console.error('Cannot create function');
		return new Function('', '');
	}
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
		//console.log('VAR', varname, 'already exists!');
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
	if (parent_loop) {
		init_if_empty(parent_loop, 'nested_loops', []);
		parent_loop.nested_loops.push(lp);
	}
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
		console.error('Template should have only one root node! Given', this.struct.semantics.length);
	} else {
		path = fix_path(path);
	}
	pool[varname] = path;
};

var special_html_setters = {
	'hasClass': {
		dom: function dom(binding, val, _ref) {
			var _ref2 = _slicedToArray(_ref, 1),
			    classname = _ref2[0];

			toggle_class(binding, classname, val);
		},
		str: function str(val, conf, _ref3) {
			var _ref4 = _slicedToArray(_ref3, 1),
			    classname = _ref4[0];

			conf.classnames.push("' + ((" + val + ") ? '" + classname + "' : '') + '");
		}
	},
	'hasAttr': {
		dom: function dom(binding, val, _ref5) {
			var _ref6 = _slicedToArray(_ref5, 1),
			    attrname = _ref6[0];

			if (val) {
				binding.setAttribute(attrname, attrname);
			} else {
				binding.removeAttribute(attrname);
			}
		},
		str: function str(val, conf, _ref7) {
			var _ref8 = _slicedToArray(_ref7, 1),
			    attrname = _ref8[0];

			if (val) {
				conf.attrs.push(" ' + (" + val + " ? '" + attrname + "' : '' ) + '");
			}
		}
	},
	'val': {
		updateAnyway: true,
		dom: function dom(binding, val) {
			binding.value = val;
		},
		str: function str(val, conf, _ref9) {
			var _ref10 = _slicedToArray(_ref9, 1),
			    classname = _ref10[0];

			conf.attrs.push(' value="' + "' + (" + val + " || '') + '" + '"');
		}
	},
	'show': {
		dom: function dom(binding, val, _ref11) {
			var _ref12 = _slicedToArray(_ref11, 1),
			    disp = _ref12[0];

			var shown = disp || 'block';
			if (!val) {
				binding.style.display = 'none';
			} else {
				binding.style.display = shown;
			}
		},
		str: function str(val, conf, _ref13) {
			var _ref14 = _slicedToArray(_ref13, 1),
			    disp = _ref14[0];

			disp = disp || 'block';
			conf.styles.push("display: ' + ((" + val + ") ? '" + disp + "' : 'none') + '");
		}
	},
	'focus': {
		updateAnyway: true,
		dom: function dom(binding, val) {
			if (val) {
				binding.focus();
			}
		},
		str: function str(val, conf) {
			conf.attrs.push(" ' + (" + val + " ? 'autofocus' : '') + '");
		}
	}
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

							var _parse_attr_style_nam = parse_attr_style_name(attrname),
							    _parse_attr_style_nam2 = _slicedToArray(_parse_attr_style_nam, 2),
							    real_name = _parse_attr_style_nam2[0],
							    params = _parse_attr_style_nam2[1];

							if (special_html_setters[real_name]) {
								// its special setter
								types[_varname] = {
									type: 'SETTER',
									name: real_name,
									params: params
								};
							} else {
								var as_type = is_attr(attrname) ? 'ATTR' : 'STYLE';
								types[_varname] = {
									type: as_type,
									name: attrname
								};
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

var input_types = new Set(['text', 'submit', 'checkbox', 'radio', 'range', 'file']);

var toHTML = function toHTML(node, context, parent_tag) {};

var getvar = function getvar(key) {
	return "' + (ctx['" + key + "'] || '') + '";
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
		a = a.length ? "['" + a + "']" : '';
		a = 'ctx' + a;
	}
	return a;
};

var parse_attr_style_name = function parse_attr_style_name(attrname) {
	var pieces = attrname.split(' ');
	return [pieces[0], pieces.slice(1)];
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
			var styles = [];
			var attrs = [];
			var conf = { attrs: attrs, styles: styles, classnames: [] };
			if (node.classnames && node.classnames.length > 1) {
				conf.classnames = node.classnames.substr(1).split('.');
			}
			if (node.assignments) {
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

						var _parse_attr_style_nam3 = parse_attr_style_name(key),
						    _parse_attr_style_nam4 = _slicedToArray(_parse_attr_style_nam3, 2),
						    real_name = _parse_attr_style_nam4[0],
						    params = _parse_attr_style_nam4[1];

						if (special_html_setters[real_name]) {
							special_html_setters[real_name].str(real_key, conf, params);
						} else {
							if (is_attr(real_name)) {
								conf.attrs.push(' ' + key + '="' + val + '"');
							} else {
								conf.styles.push(key + ': ' + val + ';');
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
			}
			if (styles.length) {
				res2.push(' style="' + styles.join('') + '"');
			}
			if (conf.classnames.length) {
				res2.push(' class="' + conf.classnames.join(' ') + '"');
			}
			if (conf.attrs.length) {
				res2.push(' ' + attrs.join(' ') + ' ');
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
			res_final = indent + node.quoted_str.replace(/\'/g, "\\'").replace(text_var_regexp, function (_, key) {
				//console.log('Found!', key, context[key]);
				return "' + ctx['" + key + "'] + '";
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
Ozenfant.prototype.updateLoopVals = function (loopname, val, old_val, binding, context) {
	var loop = this.loop_pool[loopname];
	var prefix = new Array(loop.level + 2).join('.');
	for (var k in val) {
		if (val[k] === old_val[k]) {
			//console.log('skip', k);
			continue;
		}
		var varname = prefix + k;
		if (this.varname_pool.var_aliases[varname]) {
			var _iteratorNormalCompletion9 = true;
			var _didIteratorError9 = false;
			var _iteratorError9 = undefined;

			try {
				for (var _iterator9 = this.varname_pool.var_aliases[varname][Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
					var vn = _step9.value;

					if (loop.paths[vn]) {
						this.set(vn, val[k], loop, binding, old_val[k], false, context);
					}
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
		if (loop.paths[varname]) {
			this.set(varname, val[k], loop, binding, old_val[k], false, context);
		}
	}
};

Ozenfant.prototype.removeLoopItem = function (binding, i) {
	if (binding.children[i]) {
		binding.children[i].remove();
	} else {
		console.warn('Cannot remove unexisting', i);
	}
};
Ozenfant.prototype.addLoopItems = function (loop, from, to, val, old_val, binding, context) {
	var res = [];
	var func = this.var_types[loop].func;
	old_val = old_val || [];
	for (var i = from; i <= to; ++i) {
		old_val[i] = val[i];
		if (val[i]) {
			var ht = func.apply(null, context.concat(val[i]));
			res.push(ht);
		}
	}
	// !!! should be rewritten!
	binding.insertAdjacentHTML("beforeend", res.join(''));
};

Ozenfant.prototype.setLoop = function (loopname, val, old_val, binding, parent_context) {
	var skip_removing = false;
	for (var i in val) {
		if (old_val && old_val[i]) {
			this.updateLoopVals(loopname, val[i], old_val[i], binding.children[i]);
		} else {
			skip_removing = true;
			this.addLoopItems(loopname, i, val.length - 1, val, old_val, binding, parent_context);
			break;
		}
	}
	if (i) {
		++i;
	} else {
		i = 0;
	}
	if (old_val && old_val[i] && !skip_removing) {
		var init_i = i;
		var del_count = 0;
		for (var j = old_val.length - 1; j >= i; j--) {
			++del_count;
			this.removeLoopItem(binding, j);
		}
		old_val.splice(init_i, del_count);
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
				if (!val_arr) debugger;
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
	var _this2 = this;

	var level = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 0;

	var pth = path.split('/');
	var first = pth[0].match(/([^\[]*)\[([^\]]*)\]/);
	if (!first) {
		var keyname = new Array(level + 1).join('.') + pth[0];
		var paths_hash = parent_loop.paths || parent_loop.node_vars_paths;
		if (paths_hash[keyname]) {
			var binding = Ozenfant.xpOne(paths_hash[keyname], el);
			old_val = old_val[trim_dots(keyname)];
			if (this.loop_pool[keyname]) {
				this.setLoop(keyname, val, old_val, binding, context);
			} else {
				this.__set(keyname, val, old_val, binding);
			}
		} else {
			var key = new Array(parent_loop.level + 2).join('.') + path;
			traverse_tree(parent_loop, function (loop) {
				if (loop.paths[key]) {
					_this2.eachLoopBinding(loop, function (bnd) {
						var bind = Ozenfant.xpOne(loop.paths[key], bnd);
						_this2.__set(key, val, null, bind, loop);
					});
				}
			}, 'nested_loops');
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
			this.updateLoopVals(loopname, val, new_context, bnd, context);
		} else {}
		// @todO!
		//this.addLoopItems(loopname, index, index, val, binding);

		//console.log('FINAL', bnd, val, new_context);
	}
};

Ozenfant.prototype.__set = function (key, val, old_val, binding, loop, loop_context) {
	var _this3 = this;

	if (this.nodes_vars[this.text_vars_paths[key]]) {
		var template = this.nodes_vars[this.text_vars_paths[key]];
		//console.log('template!', template);
		var new_str = template.replace(text_var_regexp, function (_, key) {
			return _this3.state[key];
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
				case 'SETTER':
					special_html_setters[this.var_types[key].name].dom(binding, val, this.var_types[key].params);
					break;
				case 'LOOP':
					var ct = loop_context || [this.state];
					this.setLoop(key, val, old_val, binding, ct);
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

Ozenfant.prototype.updateAnyway = function (key) {
	return this.var_types[key] && special_html_setters[this.var_types[key].name] && special_html_setters[this.var_types[key].name].updateAnyway;
};

Ozenfant.prototype.set = function (key, val, loop, loop_binding, old_data, force, loop_context) {
	var _this4 = this;

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
		if (!this.updateAnyway(key)) {
			if (this.varname_pool.var_aliases[key]) {
				var _iteratorNormalCompletion10 = true;
				var _didIteratorError10 = false;
				var _iteratorError10 = undefined;

				try {
					for (var _iterator10 = this.varname_pool.var_aliases[key][Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
						var k = _step10.value;

						if (this.updateAnyway(k)) {
							this.set(k, val, loop, loop_binding, old_data, true);
						}
					}
				} catch (err) {
					_didIteratorError10 = true;
					_iteratorError10 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion10 && _iterator10.return) {
							_iterator10.return();
						}
					} finally {
						if (_didIteratorError10) {
							throw _iteratorError10;
						}
					}
				}
			}
			return;
		} else {
			// OK...
		}
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
			this.eachLoopBinding(l_loop, function (node, loop_ctx, i) {
				_this4.set(cn, val, l_loop, node, old_val, true, loop_ctx);
			});
		}
	}
	if (this.varname_pool.var_aliases[key]) {
		var _iteratorNormalCompletion11 = true;
		var _didIteratorError11 = false;
		var _iteratorError11 = undefined;

		try {
			for (var _iterator11 = this.varname_pool.var_aliases[key][Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
				var _k = _step11.value;

				this.set(_k, val, loop, loop_binding, old_data, true);
			}
		} catch (err) {
			_didIteratorError11 = true;
			_iteratorError11 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion11 && _iterator11.return) {
					_iterator11.return();
				}
			} finally {
				if (_didIteratorError11) {
					throw _iteratorError11;
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
	if (path === '') {
		return node;
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
},{"../ooo_oo_o/parser":16,"./config":19}]},{},[8])

