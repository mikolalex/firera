var PackagePool = require('./PackagePool');
var LinkManager = require('./LinkManager');
var Parser = require('./Parser');
var utils = require('./utils');
var Hash = require("./Hash");
var Obj = utils.Obj;
var Arr = utils.Arr;
var apps = [];
var appIds = 0;
var type_map = {
	'is': 'formula',
	'free': 'free',
	'fake': 'fake',
}

var get_grid_struct = (grid) => {
	var cells_1 = Object.keys(grid.cell_types);
	var cells_2 = Object.keys(grid.cell_values);
	var cells_3 = Arr.unique(cells_1.concat(cells_2));
	var cells = [];
	for(let cell of cells_3){
		let types, type;
		if(!grid.cell_types[cell]){
			// probably, nested cell child
		    types = ['free'];
		    type = 'free';
		} else {
		    types = utils.split_camelcase(grid.cell_types[cell].type);
		    type = grid.cell_types[cell].type;
		}
		var props = {};
		var once = false;
		for(let subtype of types){
			if(Parser.system_predicates.has(subtype) && subtype !== 'is'){
				props[subtype] = true;
				once = true;
			}
		}
		if(once){
			type = 'is';
		}
		if(!type_map[type]){
			console.log('unmapped type!', type);
		}
		type = type_map[type];
		var obj = {
			name: cell,
			val: grid.cell_values[cell],
			type,
			props,
		};
		if(once){
			obj.subtype = grid.cell_types[cell].type;
		}
		cells.push(obj)
	}
	var by_types = utils.group_by(cells, (obj) => {
		if(obj.name.indexOf('/') !== -1){
			return 'linked';
		}
		if(obj.name.indexOf('$child') === 0 || obj.name === '$all_children'){
			return 'children';
		}
		if(obj.name.indexOf('|') !== -1){
			return 'DOM';
		}
		if(obj.name[0] === '$'){
			return 'system';
		}
		if(obj.props.funnel){
			return 'funnel';
		}
		return obj.type;
		
	});
	
	var childs = grid.linked_hashes_provider.pool;
	var children = {};
	for(let child_name in childs){
		if(child_name === '..') continue;
		let child_id = childs[child_name];
		let child = grid.app.getGrid(child_id);
		children[child_name] = get_grid_struct(child);
	}
	for(let celltype in by_types){
		by_types[celltype].sort((a, b) => {
			return a.name > b.name ? 1 : -1;
		});
	}
	return {
		children,
		cells: by_types,
	};
}

var get_app_struct = (app) => {
	return get_grid_struct(app.root);
}

var App = function(packages, root_package_pool){
	this.id = ++appIds;
	this.packagePool = new PackagePool(root_package_pool, this.id);
	if(packages){
		for(let pack of packages){
			this.packagePool.load(pack);
		}
	}
	this.hashes = {};
	this.hashIds = 0;
	this.linkManager = new LinkManager(this);
};

App.prototype.onChangeFinished = function(cb){
	if(!this.onChangeFinishedStack){
		this.onChangeFinishedStack = [];
	}
	this.onChangeFinishedStack.push(cb);
}
App.prototype._changeFinished = function(){
	if(this.onChangeFinishedStack){
		for(let cb of this.onChangeFinishedStack){
			cb();
		}
	}
}

App.prototype.get = function(cell, path){
	return this.root.get(cell, path);
}
App.prototype.getStruct = function(){
	return get_app_struct(this);
}
App.prototype.getVals = function(){
	return get_vals(this.root);
}
App.prototype.getGrid = function(id){
	return this.hashes[id];
}
App.prototype.set = function(cell, val, child){
	this.root.set(cell, val, child);
}
App.prototype.eachChild = function(parent_grid_id, cb){
	var grid = this.getGrid(parent_grid_id);
	for(var l in grid.linked_hashes){
		var child = this.getGrid(grid.linked_hashes[l]);
		cb(child);
		this.eachChild(grid.linked_hashes[l], cb);
	}
}
App.prototype.eachParent = function(grid_id, cb){
	while(grid_id){
		var grid = this.getGrid(grid_id);
		cb(grid);
		grid_id = grid.parent;
	}
}

var cb_prot = {
	cell_parents: function(cell){
		return this.cell_types[cell] ? this.cell_types[cell].parents : [];
	},
	cell_children: function(cell){
		return this.cell_types[cell] ? this.cell_types[cell].children : {};
	}, 
	setLevels: function(){
		var level = 1;
		this.levels = {};
		var max_level = 1;
		var already_set = new Set();
		var pool = [];
		for(let i in this.cell_types){
			if(this.cell_types[i].parents.length === 0){
				this.levels[i] = 1;
				for(var j in this.cell_types[i].children){
					pool.push(j);
					this.setLevelsRec(j, already_set);
				}
			}
		}
		var c = 0;
		while(pool[c]){
			this.setLevelsIterable(pool[c], pool);
			c++;
		}
	},
	setLevelsIterable: function(cellname, pool){
		var max_level = 1;
		for(var cell of this.cell_parents(cellname)){
			cell = Parser.real_cell_name(cell);
			if(this.levels[cell] === undefined){
				if(pool.indexOf(cell) === -1){
					this.setLevelsIterable(cell, pool);
				}
			}
			if(this.levels[cell] > max_level){
				max_level = this.levels[cell];
			}
		}
		if(this.levels[cellname]){
			if(max_level + 1 > this.levels[cellname]){
				this.levels[cellname] = max_level + 1;
			}
			return;
		} else {
			this.levels[cellname] = max_level + 1;
		}
		for(var cell in this.cell_children(cellname)){
			if(pool.indexOf(cell) === -1){
				pool.push(cell);
				//this.setLevelsRec(cell, already_set);
			}
		}
	},
	setLevelsRec: function(cellname, already_set){
		var max_level = 1;
		for(var cell of this.cell_parents(cellname)){
			cell = Parser.real_cell_name(cell);
			//if(cell[0] === '-') debugger;
			if(this.levels[cell] === undefined){
				//this.setLevelsRec(cell, already_set);
			}
			if(this.levels[cell] > max_level){
				max_level = this.levels[cell];
			}
		}
		if(this.levels[cellname]){
			if(max_level + 1 > this.levels[cellname]){
				this.levels[cellname] = max_level + 1;
			}
			for(var cell in this.cell_children(cellname)){
				if(this.levels[cell] <= this.levels[cellname]){
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
		for(var cell in this.cell_children(cellname)){
			if(!(already_set.has(cell))){
				already_set.add(cell);
				this.setLevelsRec(cell, already_set);
			}
		}
	}
}

App.prototype.parse_cbs = function(a){
	var eachMixin = Object.assign({}, this.packagePool.eachHashMixin);
	var res = Object.create(cb_prot);
	res.plain_base = Object.assign(eachMixin, a); 
	res.side_effects = {};
	res.hashes_to_link = {};
	res.no_args_cells = {};
	
	Parser.parse_pb(res, this.packagePool);
	utils.init_if_empty(res.plain_base, '$init', {}, '$name', null);
	res.cell_types = Parser.parse_cell_types(res.plain_base);
	res.setLevels();
	return res;
}

App.prototype.loadPackage = function(pack) {
	this.packagePool.load(pack);
}

App.prototype.setHash = function(id, hash){
	this.hashes[id] = hash;
}

App.prototype.createHash = function(type, link_as, free_vals, parent_id) {
	var parent = this.getGrid(parent_id);
	free_vals = parent.init_values[link_as] 
				? Object.assign({}, parent.init_values[link_as], free_vals || {}) 
				: free_vals;
	var parent_path = parent.path;
	var path = (parent_path !== '/' ? parent_path + '/' : '/')  + link_as;
	var child = new Hash(this, type, link_as, free_vals, true, parent_id, path); 
	Firera.hashCreated(this, child.id, child.path, child.parent);
	//child.setLevels();
	return child.id;
}
App.apps = apps;
App.get_app_struct = get_app_struct;
module.exports = App;