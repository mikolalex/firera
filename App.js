import PackagePool from './PackagePool';
import LinkManager from './LinkManager';
import Parser from './Parser';
import utils from './utils';
import Grid from "./Grid";
const Obj = utils.Obj;
const Arr = utils.Arr;
const apps = [];
var appIds = 0;
const type_map = {
	'is': 'formula',
	'free': 'free',
	'fake': 'fake',
}

const get_grid_struct = (grid) => {
	const cells_1 = Object.keys(grid.cell_types);
	const cells_2 = Object.keys(grid.cell_values);
	const cells_3 = Arr.unique(cells_1.concat(cells_2));
	const cells = [];
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
		const props = {};
		var once = false;
		for(let subtype of types){
			if(Parser.system_macros.has(subtype) && subtype !== 'is'){
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
		const parents = grid.cell_parents(cell);
		const wrong_links = {};
		for(let cn of parents){
			if(!grid.cellExists(cn) && Parser.real_cell_name(cn) !== '$i'){
				wrong_links[cn] = true;
			}
		}
		const obj = {
			name: cell,
			val: grid.cell_values[cell],
			parents,
			wrong_links,
			type,
			props,
		};
		if(once){
			obj.subtype = grid.cell_types[cell].type;
		}
		cells.push(obj)
	}
	const by_types = utils.group_by(cells, (obj) => {
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
	
	const childs = grid.linked_grids_provider.pool;
	const children = {};
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

const get_app_struct = (app) => {
	return get_grid_struct(app.root);
}

const App = function(config, root_package_pool){
	this.id = ++appIds;
	this.config = config;
	if(global.firera_debug_mode !== 'off'){
		Firera.onGridCreated(this.id, (app, grid_id) => {
			const struct = get_grid_struct(this.getGrid(grid_id));
			for(let groupname in struct.cells){
				for(let cell of struct.cells[groupname]){
					for(let wrong_cell in cell.wrong_links){
						utils.warn('Linking to unexisting cell:', '"' + wrong_cell + '"', 'referred by', '"' + cell.name + '"', 'hash #' + grid_id);
					}
				}
			}
		})
	}
	if(this.config.storeChanges){
		this.changesPool = [];
	}
	this.grid_create_counter = 0;
	this.packagePool = new PackagePool(root_package_pool, this.id);
	if(config.packages){
		for(let pack of config.packages){
			this.packagePool.load(pack);
		}
	}
	this.grids = {};
	this.gridIds = 0;
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
	if(path && path[0] === '/') path = path.substr(1);
	return this.root.get(cell, path);
}
App.prototype.getStruct = function(){
	return get_app_struct(this);
}
App.prototype.getVals = function(){
	return get_vals(this.root);
}
App.prototype.getGrid = function(id){
	return this.grids[id];
}
App.prototype.set = function(cell, val, child){
	this.startChange();
	this.root.set(cell, val, child);
	this.endChange();
}
App.prototype.eachChild = function(parent_grid_id, cb){
	const grid = this.getGrid(parent_grid_id);
	for(let l in grid.linked_grids){
		const child = this.getGrid(grid.linked_grids[l]);
		cb(child);
		this.eachChild(grid.linked_grids[l], cb);
	}
}
App.prototype.eachParent = function(grid_id, cb){
	while(grid_id){
		const grid = this.getGrid(grid_id);
		cb(grid);
		grid_id = grid.parent;
	}
}

const cb_prot = {
	cell_parents(cell) {
		return this.cell_types[cell] ? this.cell_types[cell].parents : [];
	},
	cell_children(cell) {
		return this.cell_types[cell] ? this.cell_types[cell].children : {};
	}, 
	setLevel(cell, level) {
		this.levels[cell] = level;
	},
	setLevels() {
		var level = 1;
		this.levels = {};
		var max_level = 1;
		const already_set = new Set();
		const pool = [];
		for(let i in this.cell_types){
			if(this.cell_types[i].parents.length === 0){
				this.setLevel(i, 1);
				for(let j in this.cell_types[i].children){
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
	setLevelsIterable(cellname, pool) {
		var max_level = 1;
		for(let cell of this.cell_parents(cellname)){
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
				this.setLevel(cellname, max_level + 1);
			}
			return;
		} else {
			this.setLevel(cellname, max_level + 1);
		}
		for(let cell in this.cell_children(cellname)){
			if(pool.indexOf(cell) === -1){
				pool.push(cell);
				//this.setLevelsRec(cell, already_set);
			}
		}
	},
	setLevelsRec(cellname, already_set) {
		var max_level = 1;
		for(let cell of this.cell_parents(cellname)){
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
				this.setLevel(cellname, max_level + 1);
			}
			for(let cell in this.cell_children(cellname)){
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
			this.setLevel(cellname, max_level + 1);
		}
		//console.log('New level for', cellname, 'is', max_level + 1);
		for(let cell in this.cell_children(cellname)){
			if(!(already_set.has(cell))){
				already_set.add(cell);
				this.setLevelsRec(cell, already_set);
			} else {
				if(this.levels[cell] <= this.levels[cellname]){
					this.setLevelsRec(cell, already_set);
				}
			}
		}
	}
}

App.prototype.parse_cbs = function(a){
	const eachMixin = Object.assign({}, this.packagePool.eachGridMixin);
	const res = Object.create(cb_prot);
	res.plain_base = Object.assign(eachMixin, a); 
	res.side_effects = {};
	res.grids_to_link = {};
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

App.prototype.startChange = function() {
	if(!this.config.trackChanges) return;
	if(this.changeObj){
		utils.warn('old change not released!', this.changeObj);
	}
	this.changeObj = [];
}
App.prototype.logChange = ([path, cell, val, level]) => {
	const pathname = path + (new Array(Math.max(0, 17 - path.length)).join(' '));
	level = (level || 0) + 1;
	const cellname = new Array(Number(level)).join('.') + cell + (new Array(Math.max(0, 29 - cell.length - level)).join(' '));
	if(typeof val === 'string' && val.length > 255){
		val = val.substr(0, 255);
	}
	console.log('|', pathname, '|' + level, cellname, '|', val, '|');
}
App.prototype.endChange = function() {
	if(!this.config.trackChanges) return;
	if(!this.changeObj){
		utils.warn('change doesnt exist!');
	}
	if(this.config.storeChanges){
		this.changesPool.push(changeObj);
	}
	if(this.config.trackChanges){
		if(this.config.trackChangesType === 'log'){
			console.log('@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@');
			for(let change of this.changeObj){
				this.logChange(change);
			}
		} else {
			console.log(this.changeObj);
		}
	}
	delete this.changeObj;
}

App.prototype.setGrid = function(id, grid){
	this.grids[id] = grid;
}

App.prototype.branchCreated = function(grid_id){
	const grid = this.getGrid(grid_id);
	const path = grid.path;
	if(Firera.onBranchCreatedStack[this.id]){
		for(let cb of Firera.onBranchCreatedStack[this.id]){
			cb(this, grid_id, path, grid.parent);
		}
	}
}

App.prototype.createGrid = function(type, link_as, free_vals, parent_id) {
	const parent = this.getGrid(parent_id);
	free_vals = parent.init_values[link_as] 
				? Object.assign({}, parent.init_values[link_as], free_vals || {}) 
				: free_vals;
	const parent_path = parent.path;
	const path = (parent_path !== '/' ? parent_path + '/' : '/')  + link_as;
	const child = new Grid(this, type, link_as, free_vals, true, parent_id, path);
	Firera.gridCreated(this, child.id, child.path, child.parent);
	//child.setLevels();
	return child.id;
}
App.apps = apps;
App.get_app_struct = get_app_struct;
module.exports = App;