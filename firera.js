'use strict';

var Ozenfant = require('../ozenfant/ozenfant');
var che = require('../shche/shche');
var $ = require('jquery');

var _F = {};

var always = _F.always = (a) => {
	return () => a;
}

var init_if_empty = _F.init_if_empty = function(obj/*key, val, key1, val1, ... */) {
	for(let i  = 1; ;i = i + 2){
		var key = arguments[i];
		var val = arguments[i + 1];
		if(!key) break;

		if(obj[key] === undefined){
			obj[key] = val;
		}
		obj = obj[key];
	}
	return obj;
}


var throttle = _F.throttle = function(thunk, time){
	var is_throttled = false;
	var pending = false;
	return () => {
		if(!is_throttled){
			//console.log('run!');
			thunk();
			is_throttled = true;
			setTimeout(() => {
				is_throttled = false;
				if(pending){
					//console.log('run pending!');
					thunk();
					pending = false;
				}
			}, time);
		} else {
			//console.log('skip!');
			pending = true;
		}
	}
}

var log = () => {};// console.log.bind(console);

var decorate = (fnc, msg) => {
	return function(){
		console.log("@", msg, arguments);
		return fnc.apply(null, arguments);
	}
}

var mk_logger = (a) => {
	return (b) => {
		console.log(a, b);
		return b;
	}
}

var group_by = _F.group_by =  (arr, prop_or_func) => {
	var res = {};
	for(let obj of arr){
		init_if_empty(res, prop_or_func instanceof Function ? prop_or_func(obj) : obj[prop_or_func], []).push(obj);
	}
	return res;
}

var frozen = _F.frozen =  (a) => JSON.parse(JSON.stringify(a));

var id = _F.id = (a) => a;
var ids = _F.ids = function(){
	return arguments;
}

var arr_remove = _F.arr_remove = (arr, el) => {
	var pos = arr.indexOf(el);
	if(pos !== -1){
		arr.splice(pos, 1);
	}
}

var arr_different = _F.arr_different = function(arr1, arr2, cb){
	for(var i in arr1){
		if(arr2[i] === undefined){
			cb(i);
		}
	}
}
var arr_common = _F.arr_common = function(arr1, arr2, cb){
	for(var i in arr1){
		if(arr2[i] !== undefined){
			cb(i);
		}
	}
}

var arr_deltas = _F.arr_deltas = (old_arr, new_arr) => {
	var new_ones = arr_diff(new_arr, old_arr);
	var remove_ones = arr_diff(old_arr, new_arr);
	var changed_ones = new_arr.mapFilter((v, k) => {
		if(old_arr[k] !== v && old_arr[k] !== undefined){
			 return k;
		}
	})
	//console.log('CHANGED ONES', changed_ones);
	var deltas = [].concat(
		 new_ones.map((key) => ['add', key, new_arr[key]]),
		 remove_ones.map((key) => ['remove', key]),
		 changed_ones.map((key) => ['change', key, new_arr[key]])
	)
	return deltas;
}

var arr_fix_keys = _F.arr_fix_keys = (a) => {
	var fixed_arr = [];
	for(let i of a){
		if(i !== undefined){
			fixed_arr.push(i);
		}
	}
	return fixed_arr;
}

var arr_diff = _F.arr_diff = function(a, b){
	var diff = [];
	for(var i in a){
		if(!b[i]) diff.push(i);
	}
	return diff;
}

var second = _F.second = (__, a) => a;

var path_cellname = (a) => a.split('/').pop();

var is_special = (a) => {
	return ((a.indexOf('/') !== -1) || (a.indexOf('|') !== -1) || a === '*' || a[0] === '$'); 
}
var bms = {};
window.bm = {
	start: (branch, tag, id) => {
		init_if_empty(bms, branch, {}, tag, {sum: 0}, 'ids', {}, id, performance.now());
	},
	stop: (branch, tag, id) => {
		bms[branch][tag].ids[id] = performance.now() - bms[branch][tag].ids[id];
	},
	report: function(logger = false){
		if(!logger){
			logger = console.log.bind(console);
		}
		for(let b in bms){
			var branch = bms[b];
			var branch_sum = 0;
			for(let t in branch){
				var tag = branch[t];
				for(var tt in tag.ids){
					var time = tag.ids[tt];
					tag.sum += time;
				}
				branch_sum += tag.sum;
			}
			for(let t in branch){
				var tag = branch[t];
				tag.perc = 100*(tag.sum/branch_sum);
				console.log(t, 'tag sum', tag.sum, 'branch sum', branch_sum, '%', tag.perc);
			}
		}
		console.log(bms);
	}
}

Object.defineProperty(Object.prototype, 'map', {
	enumerable: false,
	writable: true,
	value: function(func, conf){
		var res = {};
		var self = this;
		var exceptions = conf ? conf.except : false;
		for(let key in self){
			if(exceptions && exceptions.indexOf(key) !== -1){
				continue;
			}
			res[key] = func(this[key], key);
		}
		return res;
	}
});
Object.defineProperty(Object.prototype, 'each', {
	enumerable: false,
    configurable: false,
	writable: true,
	value: function(func){
		for(var key in this){
			if(func(this[key], key) === false){
				break;
			}
		}
	}
});
Object.defineProperty(Object.prototype, 'eachKey', {
	enumerable: false,
    configurable: false,
	writable: true,
	value: function(func){
		for(var key in this){
			if(func(key) === false){
				break;
			}
		}
	}
});
Object.defineProperty(Array.prototype, 'mapFilter', {
	enumerable: false,
    configurable: false,
	writable: true,
	value: function(func){
		var res = [];
		for(var key in this){
			var a;
			if((a = func(this[key], key)) !== undefined){
				res.push(a);
			}
		}
		return res;
	}
});
Object.defineProperty(Array.prototype, 'unique', {
    enumerable: false,
    configurable: false,
    writable: true,
    value: function() {
        var a = this.concat();
        for(var i=0; i<a.length; ++i) {
            for(var j=i+1; j<a.length; ++j) {
                if(a[i] === a[j])
                    a.splice(j--, 1);
            }
        }
        return a;
    }
});

var copy = _F.copy = function(from, to){
	for(var i in from){
		to.push(from[i]);
	}
}
var kcopy = _F.kcopy = function(from, to){
	for(let i in from){
		to[i] = from[i];
	}
}
var cell_listening_type = function(str){
	if(!str.match) debugger;
	var m = str.match(/^(\:|\-|\=)/);
	return [{
		//':': 'change', 
		'=': 'skip_same', 
		'-': 'passive', 
		'val': 'normal'
	}[m ? m[1] : 'val'], str.replace(/^(\:|\-|\=)/, '')];
}
var get_real_cell_name = function(str){
	return str[0] === '-' ? str.slice(1) : str;
}

var real_cell_name = (str) => str.replace(/^(\:|\-|\=)/, '');

var is_def = (a) => {
	return (a !== undefined) && (a !== Firera.undef);
}

var PackagePool = function(proto = {}, app_id){
	this.app_id = app_id;
	this.cellMatchers = Object.assign({}, proto.cellMatchers);
	this.predicates = Object.assign({}, proto.predicates);
	this.eachHashMixin = Object.assign({}, proto.eachHashMixin);
}
PackagePool.prototype.load = function(pack){
	if(typeof pack === 'string'){
		if(!Firera.packagesAvailable[pack]){
			console.error('Package not found!', pack);
			return;
		}
		pack = Firera.packagesAvailable[pack];
	}
	kcopy(pack.cellMatchers, this.cellMatchers);
	kcopy(pack.predicates, this.predicates);
	if(pack.eachHashMixin){
		// update the mixin for each hash created
		Object.assign(this.eachHashMixin, pack.eachHashMixin);
	}
	if(pack.onHashCreated){
		init_if_empty(onHashCreatedStack, this.app_id, []);
		onHashCreatedStack[this.app_id].push(pack.onHashCreated);
	}
}

var LinkManager = function(app){
	this.app = app;
	this.links = [];
	this.linkStruct = {};
	this.workingLinks = {};
	this.pointers = {};
	this.doubleAsterisk = {};
	this.pathToId = {};
};

LinkManager.prototype.onNewHashAdded = function(parent_hash_id, child_id){
	var child_path = this.app.getGrid(child_id).path
	//console.log('new hash added to', parent_hash_id, 'as', child_id, child_path);
	// add doubleAsterisk links
	for(let path in this.doubleAsterisk){
		if(child_path.indexOf(path) === 0){
			// it's a child of master hash
			for(var cellname in this.doubleAsterisk[path]){
				this.addWorkingLink(child_id, cellname, this.pathToId[path], '**/' + cellname, '**', child_path);
			}
		}
	}
	//
	for(var link_id in this.pointers[parent_hash_id]){
		this.actualizeLink(link_id, child_id);
	}
}

LinkManager.prototype.refreshPointers = function(link_id){
	for(let hash_id in this.pointers){
		var links = this.pointers[hash_id];
		for(let i in links){
			if(links[i] == link_id){
				links.splice(i, 1);
			}
		}
	}
	var data = this.links[link_id];
	for(let pointer of data.pointers){
		init_if_empty(this.pointers, pointer.hash_id, {}, link_id, data.path[pointer.pos]);
		//log('considering pointer', link_id, data.str, pointer);
	}
}

LinkManager.prototype.checkUpdate = function(master_hash_id, master_cell, val){
	if(this.workingLinks[master_hash_id] && this.workingLinks[master_hash_id][master_cell]){
		if(val === undefined){
			val = this.app.getGrid(master_hash_id).get(master_cell);
		}
		if(val === Firera.undef){
			return;
		}
		var lnks = this.workingLinks[master_hash_id][master_cell];
		for(var slave_hash_id in lnks){
			for(var slave_cellname in lnks[slave_hash_id]){
				var cell_val = val;
				if(lnks[slave_hash_id] && lnks[slave_hash_id][slave_cellname]){
					var link_data = lnks[slave_hash_id][slave_cellname];
					if(link_data.link_id === '**'){
						cell_val = [cell_val, link_data.path];
					} else {
						var data = this.links[link_data.link_id];
						if(data){
							for(var i = data.path.length - 1; i > -1; i--){
								if(data.path[i] === '*'){
									//console.log('A', i, data.path, link_data.path[i+1]);
									cell_val = [link_data.path[i+1], cell_val];
								}
							}
						}
					}
				}
				// the very meaning of this method
				var slave_grid = this.app.getGrid(slave_hash_id);
				if(!slave_grid){
					var lnk = this.links[link_data.link_id];
					log('obsolete link!', lnk);
				} else {
					log('!set', slave_cellname, cell_val);
					slave_grid.set(slave_cellname, cell_val);
				}
			}
		}
	}
	
	
}

LinkManager.prototype.addWorkingLink = function(master_hash_id, master_cellname, slave_hash_id, slave_cellname, link_id, path){
	init_if_empty(this.workingLinks, master_hash_id, {}, master_cellname, {}, slave_hash_id, {}, slave_cellname, {link_id, path});
	//this.app.getGrid(slave_hash_id).set(slave_cellname, val);
	this.app.getGrid(master_hash_id).initIfSideEffectCell(master_cellname);
	this.checkUpdate(master_hash_id, master_cellname);
}

LinkManager.prototype.actualizeLink = function(link_id, first_child_id){
	var gridname, current_pointer;
	var data = this.links[link_id];
	var curr_hash_id = data.hash_id, curr_hash;
	
	var move_further = (curr_hash_id, i, start_pos, path) => {
		if(!path) debugger;
		path = path.slice();
		var curr_hash = this.app.getGrid(curr_hash_id);
		if(path.indexOf(curr_hash.name) !== -1){
			//console.log('hm', path, curr_hash.name);
		} else {
			path.push(curr_hash.name);
		}
		var gridname = data.path[i];
		var next_hash_id;
		if(!data.path[i + 1]){
			//log('~~~ success!', data.str, path);
			// its cellname
			if(!data.pointers[start_pos].fixed){
				data.pointers.splice(start_pos, 1);
			}
			this.addWorkingLink(curr_hash_id, gridname, data.hash_id, data.slave_cellname, link_id, path);
			return;
		}

		if(gridname === '..'){
			// looking for parent
			next_hash_id = curr_hash.parent;
		} else if(gridname === '*'){
			// all children
			if(i === current_pointer.pos){
				if(first_child_id !== undefined) {
					//log('--- checking first child', data.str, link_id, first_child_id);
					move_further(first_child_id, i+1, start_pos, path);
				} else {
					data.pointers[start_pos].fixed = true;
					data.pointers[start_pos].hash_id = curr_hash_id;
					//log('--- what to do then?', link_id, 1, curr_hash.linked_hashes);
					for(var child_name in curr_hash.linked_hashes){
						var child_id = curr_hash.linked_hashes[child_name];
						move_further(child_id, i+1, start_pos, path);
					}
				}
			} else {
				//log('--- remove old pointer', link_id, data.str, i, data.pointers[start_pos].fixed);
				// remove old pointer
				if(!data.pointers[start_pos].fixed){
					data.pointers.splice(start_pos, 1);
				}
				data.pointers.push({
					pos: i,
					hash_id: curr_hash_id,
					fixed: true,
					path
				})
				for(var child_name in curr_hash.linked_hashes){
					var child_id = curr_hash.linked_hashes[child_name];
					move_further(child_id, i+1, start_pos, path);
				}
				return;
			}
		} else {
			if(curr_hash.linked_hashes && (curr_hash.linked_hashes[gridname] !== undefined)){
				next_hash_id = curr_hash.linked_hashes[gridname];
			} else {
				//console.log('_____________ NOT FOUND');
				return;
			}
		}
		if(next_hash_id !== undefined){
			move_further(next_hash_id, i+1, start_pos, path);
		}
	}
	
	for(var pointer_index in data.pointers){
		var current_pointer = data.pointers[pointer_index];
		move_further(
				current_pointer.hash_id, 
				current_pointer.pos, 
				pointer_index, 
				current_pointer.path
		);
	}
	this.refreshPointers(link_id);
}

LinkManager.prototype.initLink = function(hash_id, link, slave_cellname){
	var path = link.split('/');
	if(path.length == 2 && path[0] === '..'){
		/*var curr_hash = this.app.getGrid(hash_id);
		var parent = curr_hash.parent;
		if(parent === undefined) {
			console.log('parent undefined! child', curr_hash);
			return;
		}
		this.addWorkingLink(parent, path[1], curr_hash.id, link);
		//console.log('Simple!', link, parent);
		//ttimer.stop('ilc');
		return;*/
	}
	if(path[0] == '**'){
		if(path.length > 2){
			console.error('You cannot listen to such path', path.join('/'));
			return;
		}
		var cellname = path[1];
		var grid_path = this.app.getGrid(hash_id).path;
		this.pathToId[grid_path] = hash_id;
		init_if_empty(this.doubleAsterisk, grid_path, {}, cellname, true);
		// check already added grids
		this.app.eachChild(hash_id, (child) => {
			this.addWorkingLink(child.id, cellname, hash_id, '**/' + cellname, '**', child.path);
		})
		return;
	}
	if(path[0] == '^^'){
		if(path.length > 2){
			console.error('You cannot listen to such path', path.join('/'));
			return;
		}
		var cellname = path[1];
		this.app.eachParent(hash_id, (hash) => {
			this.addWorkingLink(hash.id, cellname, hash_id, '^^/' + cellname);
		})
		return;
	}
	if(path[0] == ''){
		if(path.length > 2){
			console.error('You cannot listen to such path', path.join('/'));
			return;
		}
		var cellname = path[1];
		var grid_path = this.app.getGrid(hash_id).path;
		this.addWorkingLink(this.app.hashes[1].id, cellname, hash_id, '/' + cellname);
		return;
	}
	var obj = {
		path: path,
		target: path[path.length - 1],
		pointers: [{
			pos: 0,
			path: [],
			hash_id,
			fixed: false,
		}],
		str: link,
		slave_cellname: slave_cellname || link,
		hash_id: hash_id,
		status: null,
	};
	init_if_empty(this.linkStruct, hash_id, {});
	if(this.linkStruct[hash_id][link] == undefined){
		var link_id = this.links.push(obj) - 1;
		this.linkStruct[hash_id][link] = link_id;
		this.actualizeLink(link_id);
	} else {
		this.actualizeLink(this.linkStruct[hash_id][link]);
	}
	//ttimer.stop('ilc');
}



var root_package_pool = new PackagePool();

var apps = [];
var appIds = 0;
var App = function(packages){
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
App.prototype.changeFinished = function(){
	if(this.onChangeFinishedStack){
		for(let cb of this.onChangeFinishedStack){
			cb();
		}
	}
}

var noop = function(){
	console.log('Noop is called!');
};
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
			cell = real_cell_name(cell);
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
			cell = real_cell_name(cell);
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
	
	parse_pb(res, this.packagePool);
	init_if_empty(res.plain_base, '$init', {}, '$name', null);
	res.cell_types = parse_cell_types(res.plain_base);
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

var show_performance = function(){
	var res = [];
	for(var i = 1; i < arguments.length; ++i){
		res.push(i + ': ' + (arguments[i] - arguments[i - 1]).toFixed(3));
	}
	res.push('Total: ' + (arguments[i - 1] - arguments[0]).toFixed(3));
	return res.join(', ');
}

var add_dynamic_link = (pool, cell, grid, slave_cell, type) => {
	init_if_empty(pool, cell, {}, grid, []);
	var links = pool[cell][grid];
	for(let lnk of links){
		if(lnk.cell_name === slave_cell && lnk.type === type){
			// already exists
			return;
		}
	}
	links.push({
		cell_name: slave_cell,
		type: type
	})
}

var create_provider = (app, self) => {
	return {
		pool: {},
		create: function(self, type, link_as, free_vals){
			var child_id = self.app.createHash(type, link_as, free_vals, self.id);
			init_if_empty(self, 'linked_hashes', {}, link_as, child_id);
			this.set(link_as, child_id);
			this.get(link_as).linked_hashes_provider.set('..', self.id);
			app.linkManager.onNewHashAdded(self.id, child_id);
			return child_id;
		},
		set: function(name, hash_id){
			this.pool[name] = hash_id;
		},
		isLinked: function(name){
			return !!this.get(name);
		},
		get: function(name){
			var id = this.pool[name];
			
			return id ? app.hashes[id] : false;
		},
		remove: function(name){
			var id = this.pool[name];
			delete this.pool[name];
			self.app.hashes[id].set('$remove', true);
			delete self.app.hashes[id];
		},
		setCellValues: function(childName, values){
			this.get(childName).set(values);
		},
		initChild: function(name){
			if(!this.get(name).init){
				console.log('strange', this, name);
			}
			this.get(name).init();
		},
		unlinkChildCells: function(name){
			var hsh = this.get(name);
			if(!hsh){
				//console.warn('removing unexisting hash!', name);
				return;
			}
			this.remove(name);
		},
		getLinkedHashCellValue: function(hashname, cellname){
			var hash = this.get(hashname);
			return hash ? hash.cell_value(cellname) : false;
		},
		linkAnyTwoCells: function(slave, master){
			if(slave.indexOf('/') !== -1){
				app.linkManager.initLink(self.id, slave);
			} else {
				add_dynamic_link(self.dynamic_cell_links, slave, '__self', master, 'dynamic');
			}
		},
	}
}

var Hash = function(app, parsed_pb_name, name, free_vals, init_later, parent_id, path){
	var self = this;
	var id = ++app.hashIds;
	//////////////////////////
	//bm.start('init', '2', id);
	this.path = path;
	app.setHash(id, this);
	this.id = id;
	this.parent = parent_id;
	this.app = app;
	this.name = name || '__root';
	var parsed_pb;
	this.parsed_pb_name = parsed_pb_name;
	if(typeof parsed_pb_name === 'string'){
		parsed_pb = app.cbs[parsed_pb_name];
	} else {
		var key = '$$$_@@@_tag';
		if(parsed_pb_name[key]){
			parsed_pb = parsed_pb_name[key];
		} else {
			parsed_pb = app.parse_cbs(parsed_pb_name);
			parsed_pb_name[key] = parsed_pb;
		}
	}
	if(!parsed_pb){
		console.error('Cannot find hash to parse:', parsed_pb_name);
		return;
	}
	this.cell_types = parsed_pb.cell_types;
	this.side_effects = parsed_pb.side_effects;
	this.hashes_to_link = parsed_pb.hashes_to_link;
	this.plain_base = Object.create(parsed_pb.plain_base);
	this.link_chains = Object.create(parsed_pb.link_chains || {});
	this.levels = Object.create(parsed_pb.levels);
	//this.setLevels();
	this.linked_hashes_provider = create_provider(app, self);
	this.linked_hashes = {};
	// for "closure" cell type
	this.cell_funcs = {};
	this.dirtyCounter = {};
	this.dynamic_cell_links = {};
	this.dynamic_cells_props = {};
	if(this.cell_types['*']){
		/*var omit_list = this.all_cell_children('*');
		for(let cell in this.cell_types){
			if(omit_list.indexOf(cell) === -1 && can_be_set_to_html(cell, this.app)){
				add_dynamic_link(this.dynamic_cell_links, cell, '__self', '*', '');
			}
		}*/
	}
	this.cell_values = Object.assign({}, this.plain_base.$init || {});
	this.init_values = Object.assign({}, this.plain_base.$init, free_vals || {});
	//////////////////////////
	//bm.stop('init', '2', id);
	//bm.start('init', '1', id);
	this.hashes_to_link.each((hash_name, link_as) => this.linkChild(hash_name, link_as));
	// @todo: refactor, make this set in one step
	//console.log('Setting $init values', this.init_values);
	//////////////////////////
	//bm.stop('init', '1', id);
	//bm.start('init', '3', id);

	if(this.plain_base.$init && !init_later){
		this.init();
	}
	//////////////////////////
	//bm.stop('init', '3', id);
	//bm.start('init', '4', id);
	if(parsed_pb.no_args_cells){
		//this.set(parsed_pb.no_args_cells);
		var min_level = Number.POSITIVE_INFINITY;
		var cell_vals = {};
		this.updateTree(parsed_pb.no_args_cells, false, true);
	}
	//////////////////////////
	//bm.stop('init', '4', id);
	//bm.start('init', '5', id);
	if(this.link_chains){
		for(let link in this.link_chains){
			this.initLinkChain(link);
		}
	}
	//////////////////////////
	//bm.stop('init', '5', id);
}

Hash.prototype.changesFinished = function(){
	this.app.changeFinished();
}

Hash.prototype.initIfSideEffectCell = function(cell){
	if(!this.cellExists(cell) && unusual_cell(cell)){
		parse_cellname(cell, this, 'getter', this.app.packagePool, this);
		this.cell_types = parse_cell_types(this.plain_base);
		var matched = findMatcher(cell, this.app.packagePool);
		if(matched){
			this.compute(cell);
		}
		//this.setLevels();
	}
}

Hash.prototype.hasChild = function(name){
	return this.linked_hashes && this.linked_hashes[name];
} 

Hash.prototype.init = function(){
	for(let cell in this.init_values){
		parse_cellname(cell, this, 'setter', this.app.packagePool);
	}
	this.set(this.init_values);
}
Hash.prototype.updateChildFreeValues = function(childName, values){
	this.linked_hashes_provider.setCellValues(childName, values);
}

Hash.prototype.initLinkChain = function(link){
	this.app.linkManager.initLink(this.id, link);
}

Hash.prototype.linkHash = function(cellname, val){
	//log('RUNNING SIDE EFFECT', this, val); 
	var hash, link1, link2, free_vals;
	cellname = cellname.replace("$child_", "");
	if(val instanceof Array){
		// it's hash and link
		hash = val[0];
		link1 = val[1];
		link2 = val[2];
		free_vals = val[3] || {};
	} else {
		hash = val;
	}
	if(!hash){
		console.warn('Trying to link undefined hash:', hash);
		return;
	}
	var child_id = this.linkChild(hash, cellname, free_vals);
	if(link1){
		//console.info('Linking by link1 hash', link1);
		link1.each((his_cell, my_cell) => {
			this.app.linkManager.initLink(this.id, cellname + '/' + his_cell, my_cell);
		})
	}
	if(link2){
		//console.info('Linking by link2 hash', link2);
		link2.each((his_cell, my_cell) => {
			this.app.linkManager.initLink(child_id, '../' + his_cell, my_cell);
		})
	}
}

Hash.prototype.getChild = function(link_as){
	return this.app.getGrid(this.linked_hashes_provider.pool[link_as]);
} 

Hash.prototype.linkChild = function(type, link_as, free_vals){
	if(this.linked_hashes_provider.isLinked(link_as)){
		var pb = this.getChild(link_as).parsed_pb_name;
		if(pb === type){
			this.getChild(link_as).set(free_vals);
			return this.linked_hashes_provider.pool[link_as];
		} else {
			this.unlinkChild(link_as);
		}
	}
	var id = this.linked_hashes_provider.create(this, type, link_as, free_vals);
	this.linked_hashes_provider.initChild(link_as);
	return id;
}

Hash.prototype.cellExists = function(cellname){
	return this.cell_types[cellname] !== undefined;
}

Hash.prototype.unlinkChild = function(link_as){
	this.linked_hashes_provider.unlinkChildCells(link_as);
}

Hash.prototype.doRecursive = function(func, cell, skip, parent_cell, already_counted_cells = {}, run_async){
	var cb = this.doRecursive.bind(this, func);
	if(!skip) {
		//console.log('--Computing cell', this.cell_type(cell));
		func(cell, parent_cell);
		already_counted_cells[cell] = true;
	} else {
		//throw new Error('Skipping!', arguments);
	}
	if(this.cell_has_type(cell, 'async') && !run_async) {
		//console.log('Skipping counting children of async');
		return;
	}
	this.cell_children(cell).eachKey((child_cell_name) => {
		if(!already_counted_cells[child_cell_name]){
			already_counted_cells[child_cell_name] = true,
			this.doRecursive(func, child_cell_name, false, cell, Object.create(already_counted_cells));
		} else {
			//console.error('Circular dependency found!', child_cell_name, already_counted_cells, this);
		}
	});
}

var toLowerCase = (a) => a.toLowerCase();

var split_camelcase = (str) => {
	if(!str.match) return false;
	var first = str.match(/^([a-z0-9]*)/);
	var others = (str.match(/[A-Z][a-z0-9]*/g) || []).map(toLowerCase);
	return [first[1], ...others];
}

Hash.prototype.compute = function(cell, parent_cell_name){
	log('compute', cell);
	var real_cell_name = this.real_cell_name(cell);
	var val;
	var props = this.cell_type_props(cell);
	var parents = this.cell_parents(real_cell_name);
	var dynamic = parents.indexOf(parent_cell_name) == -1;
	var func = this.cell_func(real_cell_name);
	var arg_num = this.cell_arg_num(real_cell_name);
	if(props.dynamic && dynamic){
		var real_props = this.dynamic_cells_props[cell];
		func = real_props.func;
		parents = real_props.parents;
		props = {dynamic: true};
		arg_num = parents.length;
		//console.log('computing dynamic cell val', parents);
	}
	// getting func
	if(props.hasOwnProperty('map') && props.map){
		if(!parent_cell_name){
			throw new Error('Cannot calculate map cell value - no parent cell name provided!');
		}
		if(func[parent_cell_name] === undefined){
			throw new Error('Cannot compute MAP cell: parent cell func undefined or not function!');
		}
		func = func[parent_cell_name];
	} else if(props.closure){
		if(!this.cell_funcs[real_cell_name]){
			var new_func = func();
			//console.log('Setting closure function', new_func);
			this.cell_funcs[real_cell_name] = new_func;
		}
		func = this.cell_funcs[real_cell_name];
	}
	// getting arguments
	var args;
	switch(arg_num){
		case 1:
			args = [this.cell_value(get_real_cell_name(parents[0]))];
		break;
		case 2:
			args = [
				this.cell_value(get_real_cell_name(parents[0])),
				this.cell_value(get_real_cell_name(parents[1]))
			];
		break;
		case 3:
			args = [
				this.cell_value(get_real_cell_name(parents[0])),
				this.cell_value(get_real_cell_name(parents[1])),
				this.cell_value(get_real_cell_name(parents[2]))
			];
		break;
		case 4:
			args = [
				this.cell_value(get_real_cell_name(parents[0])),
				this.cell_value(get_real_cell_name(parents[1])),
				this.cell_value(get_real_cell_name(parents[2])),
				this.cell_value(get_real_cell_name(parents[3]))
			];
		break;
		default:
			var args = this.cell_parents(real_cell_name).map((parent_cell_name) => {
				return this.cell_value(get_real_cell_name(parent_cell_name))
			});
		break;
	}
	if(props.funnel){
		if(!parent_cell_name){
			throw new Error('Cannot calculate map cell value - no parent cell name provided!');
		}
		parent_cell_name = get_real_cell_name(parent_cell_name);
		args = [parent_cell_name, this.cell_value(parent_cell_name)];
	}
	if(props.nested){
		args.unshift((cell, val) => {
			var cell_to_update = real_cell_name + '.' + cell;
			this.set_cell_value(cell_to_update, val);
			this.doRecursive(this.compute.bind(this), cell_to_update, true);
		});
	} else if(props.async){
		args.unshift((val) => {
			//console.log('ASYNC callback called!',val); 
			this.set_cell_value(real_cell_name, val);
			this.doRecursive(this.compute.bind(this), real_cell_name, true, null, {}, true);
			this.changesFinished();
		});
	}
	/*for(var n of args){
		if(n === Firera.undef){
			//console.log('UNDEF FOUND!', cell);
			return;
		}
	}*/
	// counting value
	if(props.hasOwnProperty('map') && props.map){
		var val = func instanceof Function 
					  ? func(this.cell_value(get_real_cell_name(parent_cell_name)))
					  : func;
	} else {
		var val;
		switch(args.num){
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
	if(val === Firera.noop){
		//console.log('skipping update');
		return Firera.noop;
	}
	if(props.async || props.nested){
		
	} else if(props.dynamic && !dynamic) {
		var fs = parse_arr_funcstring(val, cell, {plain_base:{}}, this.app.packagePool);
		parse_cell_type(cell, fs, this.dynamic_cells_props, []);
		parents = this.dynamic_cells_props[cell].parents;
		for(let parent_cell of parents){
			this.linked_hashes_provider.linkAnyTwoCells(parent_cell, cell);
		}
		this.setLevel(cell, parents.concat(this.cell_parents(real_cell_name)));
		this.compute(cell);
	} else {
		this.set_cell_value(real_cell_name, val);
	}
}

Hash.prototype.get = function(cell, child){
	if(child){
		// setting value for some linked child hash
		//log('Trying to set', child, cell, val);
		var path = child.split('/');
		var childname = path[0];
		var child = this.linked_hashes_provider.get(childname);
		if(!child){
			console.warn('Cannot get - no such path', path);
			return;
		}
		var child_path = path[1] ? path.slice(1).join('/') : undefined;
		return child.get(cell, child_path);
	} else {
		var val = this.cell_values[cell];
		return val === undefined ? (this.cell_values.hasOwnProperty(cell) ? val : Firera.undef) : val;
	}
}

Hash.prototype.setLevel = function(cell, parents){
	//console.log('got parents', parents);
	var max_level = 0;
	for(let prnt of parents){
		var lvl = this.levels[prnt];
		if(lvl > max_level){
			max_level = lvl;
		}
	}
	this.levels[cell] = max_level + 1;
	//console.log('got max level', max_level);
}

Hash.prototype.updateTree = function(cells, no_args = false, compute = false){
	var set = Object.keys(cells);
	var start_level = Number.POSITIVE_INFINITY;
	var levels = {};
	for(let cell in cells){
		if(compute){
			this.compute(cell);
		}
		if(!no_args){
			var val1 = compute ? this.cell_values[cell] : cells[cell];
			this.set_cell_value(cell, val1);
		}
		var lvl = this.levels[cell];
		if(lvl < start_level){
			start_level = this.levels[cell];
		}
		if(!levels[lvl]){
			levels[lvl] = new Set();
		}
		levels[lvl].add(cell);
	}
	var already = new Set();
	var x = start_level;
	var parents = {};
	while(levels[x] !== undefined){
		for(let cell of levels[x]){
			var skip = false;
			var needed_lvl = x+1;
			var children = this.cell_children(cell);
			var ct = this.cell_type(cell);
			if(
				!this.cell_has_type(cell, 'free')
				&& (cells[cell] === undefined || no_args)
				&& this.cell_types[cell].func
			){
				var res = this.compute(cell, parents[cell]);
				if(res === Firera.noop){
					skip = true;
				}
			}
			if(this.cell_has_type(cell, 'async') || skip) {
				continue;
			}
			for(var child in children){
				var lvl = this.levels[child];
				if(!levels[lvl]){
					levels[lvl] = new Set();
				}
				if(!cells[child]){
					levels[lvl].add(child);
				}
				parents[child] = cell;
				for(var j = lvl - 1; j > x; j--){
					if(!levels[j]){
						levels[j] = new Set();
					}
				}
				if(already.has(child)){
					console.log('skipping2', child);
					//continue;
				}
			}
		}
		x++;
	}
}

Hash.prototype.set = function(cells, val, child, no_args){
	if(child){
		// setting value for some linked child hash
		var path = child.split('/');
		var childname = path[0];
		var child = this.linked_hashes_provider.get(childname);
		if(!child){
			console.warn('Cannot set - no such path', path);
			return;
		}
		var child_path = path[1] ? path.slice(1).join('/') : undefined;
		child.set(cells, val, child_path);
		return;
	}
	if(!(cells instanceof Object)){
		var a = {};
		a[cells] = val;
		cells = a;
	}
	this.updateTree(cells, no_args);
} 

Hash.prototype.set2 = function(cell, val, child){
	if(child){
		// setting value for some linked child hash
		//log('Trying to set', child, cell, val);
		var path = child.split('/');
		var childname = path[0];
		var child = this.linked_hashes_provider.get(childname);
		if(!child){
			console.warn('Cannot set - no such path', path);
			return;
		}
		var child_path = path[1] ? path.slice(1).join('/') : undefined;
		child.set(cell, val, child_path);
		return;
	}
	if(cell instanceof Object){
		// batch update
		//console.log('Computing batch update', cell);
		cell.eachKey(
			(key) => {
				this.force_set(key, cell[key], true);
				this.doRecursive((cell) => {
					this.dirtyCounter[cell] 
						? this.dirtyCounter[cell]++ 
						: (this.dirtyCounter[cell] = 1);
				}, key)
			}
		);
		//console.log('dirty counter', this.dirtyCounter);
		cell.eachKey(this.doRecursive.bind(this, (cell2, parent_cell_name) => {
			if(--this.dirtyCounter[cell2] === 0 && cell[cell2] === undefined){
				//console.log('Computing after batch change', cell2, cell);
				this.compute(cell2, parent_cell_name);
			//} else {
				//console.log('Cell ', cell2, 'is not ready', this.dirtyCounter[cell2]);
			}
		}));
	} else {
		//console.log('SETT', arguments);
		//console.log('Setting cell value', cell, val);
		if(!this.cell_type(cell) === 'free'){
			throw Exception('Cannot set dependent cell!');
		}
		this.force_set(cell, val);
		//this.doRecursive(this.compute.bind(this), cell);
		//console.log('Cell values after set', this.cell_values);
	}
}
Hash.prototype.force_set = function(cell, val, omit_updating_children){
	this.set_cell_value(cell, val);
	if(omit_updating_children) return;
	this.cell_children(cell).eachKey((child_cell_name) => {
		this.doRecursive(this.compute.bind(this), child_cell_name, false, cell);
	});
}
Hash.prototype.cell_parents = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].parents : [];
}
Hash.prototype.cell_arg_num = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].arg_num : 0;
}
Hash.prototype.cell_children = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].children : {};
}
Hash.prototype.all_cell_children = function(cell, arr){
	if(!this.cell_types[cell]){
		return [];
	}
	arr = arr || [];
	this.cell_types[cell].children.eachKey((cl) => {
		arr.push(cl);
		this.all_cell_children(cl, arr);
	});
	return arr;
}
Hash.prototype.cell_func = function(cell){
	var a;
	if(a = this.cell_types[cell].func) {
		return a;
	} else {
		throw new Error('Cannot find cell func for cell '+cell);
	}
}
Hash.prototype.cell_type = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].type : [];
}
Hash.prototype.cell_has_type = function(cell, type){
	var types = this.cell_types[cell];
	if(types){
		return types.props[type];
	} else {
		return false;
	}
}
Hash.prototype.cell_type_props = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].props : {};
}
Hash.prototype.real_cell_name = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].real_cell_name : {};
}
Hash.prototype.cell_value = function(cell){
	switch(cell){
		case '$real_keys':
			return [...(new Set(Object.keys(this.plain_base).concat(Object.keys(this.plain_base.$init))))].filter((k) => {
				return k.match(/^(\w|\d|\_|\-)*$/);
			})
		break;
		case '$real_values':
			var res = {};
			[...(new Set(Object.keys(this.cell_values)
						.concat(Object.keys(this.init_values))))].filter((k) => {
				return k.match(/^(\w|\d|\_|\-)*$/);
			}).each((k, v) => {
				res[k] = this.cell_value(k);
			})
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
			if(this.cell_values.hasOwnProperty(cell)){
				return this.cell_values[cell];
			} else {
				return Firera.undef;
				//return this.cell_values[cell];
			}
	}
}
Hash.prototype.set_cell_value = function(cell, val){
	var same_song = val === this.cell_values[cell];
	this.cell_values[cell] = val;
	if(this.side_effects[cell]){	
		if(!side_effects[this.side_effects[cell]]) console.info('I SHOULD SET side-effect', cell, this.side_effects[cell], side_effects);
		side_effects[this.side_effects[cell]].func.call(this, cell, val);
		//console.log('Child', real_cell_name, 'val is', val);
	}
	//if(cell === 'text' || cell === '*') console.log('Set cell value', cell, val, this.dynamic_cell_links[cell]);
	var omit_list = this.all_cell_children('*');
	if(this.cell_types['*'] && cell !== '*' && omit_list.indexOf(cell) === -1){
		this.set('*', [cell, val]);
	}
	if(this.dynamic_cell_links[cell]){
		this.dynamic_cell_links[cell].each((links, hash_name) => {
			var own = hash_name === '__self';
			var hsh = own ? this : this.linked_hashes_provider.get(hash_name);
			//console.log('Updating dynamic cell links for cell', cell, links, hash_name, this.linked_hashes_provider, hsh);
			if(hsh){
				for(var link of links){
					//console.log('Writing dynamic cell link ' + link.cell_name, link.type === 'val', this.name);
					if(link.type === 'val'){
						hsh.set(link.cell_name, val);
					} else if(link.type === 'dynamic'){
						hsh.compute(link.cell_name, cell);
					} else {
						//log('Updating links', hash_name, link.cell_name, [hash_name !== '__self' ? this.name : cell, val]);
						hsh.set(link.cell_name, [own ? cell : this.name, val]);
					}
				}
			}
		})
	}
	this.app.linkManager.checkUpdate(this.id, cell, val);
}

var system_predicates = new Set([
	'is',
	'async',
	'closure',
	'funnel',
	'map',
	'hash',
	'dynamic',
	'nested'
]);
var side_effects = {
	'child': {
		func: function(cellname, val, type){
			if(val){
				this.linkHash(cellname, val);
			}
			if(val === false) {
				var link_as = cellname.replace('$child_', '');
				this.unlinkChild(link_as);
			}
		},
		regexp: /^\$child\_/,
	},
	children: {
		regexp: /^\$all\_children$/,
		func: function(__, deltas){
			if(!deltas || !deltas.eachKey){
				return;
			}
			deltas.eachKey((k) => {
				if(!deltas[k]) return;
				var [type, key, hashname, free_vals] = deltas[k];
				switch(type){
					case 'remove':
						this.unlinkChild(key);
					break;
					case 'add':
						this.linkHash(key, [hashname, null, null, free_vals]);
					break;
					case 'change':
						this.updateChildFreeValues(key, free_vals);
					break;
					default:
						throw new Error('Unknown action: ' + type);
					break;
				}
			})
		}
	}
};

var predefined_functions = {
	'=': {
		type: 'func', 
		func: function(a, b){ return a == b;}
	},
	'==': {
		type: 'func', 
		func: function(a, b){ return a === b;}
	},
	'!=': {
		type: 'func', 
		func: function(a, b){ return a != b;}
	},
	'!==': {
		type: 'func', 
		func: function(a, b){ return a !== b;}
	},
	'+': {
		type: 'func', 
		func: function(a, b){ return (a ? Number(a) : 0) + (b ? Number(b) : 0);}
	},
	'-': {
		type: 'func', 
		func: function(a, b){ return Number(a) - Number(b);}
	},
	'*': {
		type: 'func', 
		func: function(a, b){ return a*b;}
	},
	'/': {
		type: 'func', 
		func: function(a, b){ return a/b;}
	},
	'%': {
		type: 'func', 
		func: function(a, b){ return a%b;}
	},
	'$': {
		type: 'func', 
		func: function(a, b){ 
			console.log('Searching selector', b, 'in', a);
			return a.find(b); 
		}
	},
}

var get_app = function(packages){
	var app = new App(packages);
	apps.push(app);
	return app;
}

var init_from_path = function(obj, path, val) {
	if(!(path instanceof Array)){
		path = path.split('/');
	}
	for(let k in path){
		let key = path[k];
		if(key === '') continue;
		if(obj[key] === undefined){
			if(path[Number(k) + 1]){
				obj[key] = {};
			} else {
				obj[key] = val;
			}
		}
		if(!(obj[key] instanceof Object)){
			obj[key] = {};
		}
		obj = obj[key];
	}
}
var set_listening_type = function(cell, type){
	console.log('_______________ SLT', cell, type);
	return {
		//'change': ':', 
		'skip_same': '=',
		'passive': '-',
		'normal': ''
	}[type] + cell;
}

var can_be_set_to_html = (cellname, packages) => {
	return cellname !== '*' 
		&& (cellname.indexOf('/') === -1)
		&& !findMatcher(cellname, packages);
}

var unusual_cell = (cellname) => {
	return !(cellname.match(/^([a-zA-Z0-9\_]*)$/));
}

var findMatcher = (cellname, packages) => {
	for(var n in packages.cellMatchers){
		var m = packages.cellMatchers[n];
		var matches = cellname.match(m.regexp);
		if(matches){
			return [m, matches];
		}
	}
}

var parse_cellname = function(cellname, pool, context, packages, isDynamic){
	if(cellname.indexOf('/') !== -1){
		//console.log('Found cellname', cellname);
		// it's a path - link to other hashes
		var path = cellname.split('/');
		//console.log('Found', cellname, 'in', pool);
		if(!pool.initLinkChain){
			init_if_empty(pool, 'link_chains', {}, cellname, path);
		} else {
			pool.initLinkChain(cellname);
		}
		return;
	}
	var real_cellname = get_real_cell_name(cellname);
	for(var n in side_effects){
		var m = side_effects[n];
		var matches = real_cellname.match(m.regexp);
		if(matches){
			init_if_empty(pool, 'side_effects', {}, cellname, []);
			if(pool.side_effects[cellname].indexOf(n) === -1){
				pool.side_effects[cellname].push(n);
			}
		}
	}
	var matched = findMatcher(real_cellname, packages);
	if(matched){
		matched[0].func(matched[1], pool, context, packages);
	}
}

var get_random_name = (function(){
	// temp solution for Symbol
	var c = 1;
	return function(){
		return 'ololo123321@@@_' + (++c);
	}
})()

var parse_arr_funcstring = (a, key, pool, packages) => {
	var funcstring;
	a = a.slice();
	var funcname = a[0];
	if(packages.predicates.hasOwnProperty(funcname)){
		a = packages.predicates[funcname](a.slice(1));
		funcname = a[0];
		a = a.slice();
	}
	if(!funcname) {
		console.error('wrong func:', funcname);
	}
	var cc = split_camelcase(funcname);
	if(a.length === 1 && (typeof a[0] === 'string')){
		funcstring = ['is', id, a[0]];
	} else {
		if(funcname instanceof Function){
			// it's "is" be default
			funcstring = ['is'].concat(a);
		} else if(system_predicates.has(cc[0])){
			switch(funcname){
				case 'nested':
					var dependent_cells = a[2].map((cellname) => (key + '.' + cellname));
					init_if_empty(pool.plain_base, '$init', {});
					dependent_cells.each((name) => {
						pool.plain_base.$init[name] = null;
					})
					a.splice(2, 1);
					funcstring = a; 
				break;
				case 'map':
					funcstring = ['map', a[1]].concat(Object.keys(a[1]));
					if(a[2]){
						// default value
						init_if_empty(pool.plain_base, '$init', {});
						pool.plain_base.$init[key] = a[2];
					}
				break;
				default:
					funcstring = a; 
				break;
			}
		} else {
			if(funcname === 'just'){
				init_if_empty(pool.plain_base, '$init', {});
				pool.plain_base.$init[key] = a[1];
				return;
			} else {
				if(predefined_functions[funcname]){
					var fnc = predefined_functions[funcname];
					switch(fnc.type){
						case 'func':
							funcstring = ['is', fnc.func].concat(a.slice(1))
						break;
					}
				} else {
					throw new Error('Cannot find predicate: ' + funcname, a);
				}
			}
		}
	}
	return funcstring;
}

var parse_fexpr = function(a, pool, key, packages){
	var funcstring;
	//console.log('Parse fexpr', a, key);
	if(a instanceof Array){
		funcstring = parse_arr_funcstring(a, key, pool, packages);
		if(funcstring === undefined) return;
	} else {
		// it's primitive value
		init_if_empty(pool.plain_base, '$init', {});
		parse_cellname(key, pool, 'setter', packages);
		pool.plain_base.$init[key] = a;
		return;
	}
	if(!funcstring[2]){
		// function with no dependancy
		init_if_empty(pool, 'no_args_cells', {}, key, true);
	}
	for(let k = 2; k < funcstring.length; ++k){
		var cellname = funcstring[k];
		switch(typeof(cellname)){
			case 'string':
				parse_cellname(cellname, pool, null, packages);
			break;
			case 'object':
				if(cellname instanceof Array){
					var some_key = get_random_name();
					//console.log('Random name is', some_key);
					parse_fexpr(cellname, pool, some_key, packages);
					funcstring[k] = some_key;
				}
			break;
			default: 
				throw new Error('Not know how to handle this ' + typeof(cellname));
			break;
		}
	}
	parse_cellname(key, pool, 'setter', packages);
	//console.log('Got funcstring', funcstring);
	pool.plain_base[key] = funcstring;
}
var parse_fexpr2 = function(pool, packages, key, a){
	return parse_fexpr(a, pool, key, packages);
}

var get_cell_type = function(cellname, type, func, parents){
	//console.log('getting cell type', arguments);
	
	var real_cell_types = split_camelcase(type) || [];

	var map = real_cell_types.indexOf('map') !== -1;
	var closure = real_cell_types.indexOf('closure') !== -1;
	var async = real_cell_types.indexOf('async') !== -1;
	var nested = real_cell_types.indexOf('nested') !== -1;
	var funnel = real_cell_types.indexOf('funnel') !== -1;
	var dynamic = real_cell_types.indexOf('dynamic') !== -1;
	return {
		type, 
		func, 
		props: {map, closure, async, nested, funnel, dynamic}, 
		real_cell_name: cellname.replace(/^(\:|\-)/, ''),
		parents: parents || [], 
		arg_num: parents ? parents.length : 0,
		children: []
	}
}

var parse_cell_type = (i, row, pool, children) => {
	var cell_types = pool;
	let type = 'free';
	if(i === '$children'){
		return;
	}
	if(i === '$init'){
		//console.log('parsing free variables', pbs[i]);
		for(var j in row){
			cell_types[j] = get_cell_type(i, type);
		}
		//console.log('now cell_types j looks like', cell_types);
		return;
	}
	if(!(row instanceof Array)){
		cell_types[i] = get_cell_type(i, type);
		return;
	}
	var func = row[0];
	var parents = row.slice(1);
	if(func instanceof Function){
		// regular sync cell
		type = 'is';
	} else {
		// may be 'async', 'changes' or something else
		type = func;
		func = parents.shift();
	}
	cell_types[i] = get_cell_type(i, type, func, parents);
	for(var j in parents){
		var [listening_type, parent_cell_name] = cell_listening_type(parents[j]);
		if(listening_type !== 'passive'){
			init_if_empty(children, parent_cell_name, {});
			children[parent_cell_name][i] = true;
		} else {
			//console.info('Omit setting', i, 'as child for', parent_cell_name, ' - its passive!');
		}
	}
};

var parse_cell_types = function(pbs){
	var cell_types = {};
	var children = {};
	//console.log('PBS', pbs);
	for(let i in pbs){
		parse_cell_type(i, pbs[i], cell_types, children);
	}
	for(let cellname in children){
		if(!cell_types[cellname]){
			var r_type = is_special(cellname) ? 'free' : 'fake';
			cell_types[cellname] = get_cell_type(cellname, r_type);
		} 
		cell_types[cellname].children = children[cellname];
	}
	//console.log('Parsed cell types', cell_types);
	return cell_types;
}

var parse_pb = function(res, packages){
	for(var key in res.plain_base) {
		if(key === '$init'){
			continue;
		}
		if(key === '$children'){
			var value = res.plain_base.$children;
			if(value instanceof Array || typeof value === 'string'){
				// its dynamic children
				parse_fexpr(value, res, '$all_children', packages);
			} else {
				value.each((hash_type, link_as) => {
					if(hash_type instanceof Array){
						key = '$child_' + link_as;
						//console.log('Child', hash_type, link_as, key);
						parse_fexpr(hash_type, res, key, packages);
					} else {
						if(typeof hash_type === 'string'){
							res.hashes_to_link[link_as] = hash_type;
						} else if(!hash_type.add && !hash_type.remove){
							res.hashes_to_link[link_as] = hash_type.type;
						} else {
							// console.log('Adding cells for managing dynamic hash', hash_type);
							var obj = {};
							if(hash_type.add){
								obj[hash_type.add] = function(){
									return {type: hash_type.type, action: 'add'};
								}
							}
							if(hash_type.remove){
								obj[hash_type.remove] = function(){
									return {action: 'remove'};
								}
							}
							parse_fexpr(['map', obj], res, '$child_' + link_as, packages);
						}
					}
				})
			}
			continue;
		}
		parse_fexpr(res.plain_base[key], res, key, packages);
	}
	return res;
}

var parse_external_links_and_$init = function(pool, key){

}


window.Firera = function(config){
	if(arguments.length > 1){
		// it's a set of grids we should join
		config = Firera.join.apply(null, arguments);
	}
	var start = performance.now();
	var app = get_app(config.$packages);
	// getting real pbs
	app.cbs = config.map(app.parse_cbs.bind(app), {except: ['$packages']});
	// now we should instantiate each pb
	if(!app.cbs.__root){
		// no root hash
		throw new Error('Cant find root app!');
	}
	//console.log(app);
	//var compilation_finished = performance.now();
	app.root = new Hash(app, '__root', false, {$app_id: app.id}, null, null, '/');
	Firera.hashCreated(app, app.root.id, app.root.path, null);
	//var init_finished = performance.now();
	//if(1 > 0){
	//	console.info('App run, it took ' + (init_finished - compilation_finished).toFixed(3) + ' milliseconds.'
	//	);
	//}
	return app;
};

var onHashCreatedStack = {};
Firera.hashCreated = function(app, grid_id, path, parent){
	if(onHashCreatedStack[app.id]){
		for(let cb of onHashCreatedStack[app.id]){
			cb(app, grid_id, path, parent);
		}
	}
}

var type_map = {
	'is': 'formula',
	'free': 'free',
	'fake': 'fake',
}

var get_grid_struct = (grid) => {
	var cells_1 = Object.keys(grid.cell_types);
	var cells_2 = Object.keys(grid.cell_values);
	var cells_3 = cells_1.concat(cells_2).unique();
	var cells = [];
	for(let cell of cells_3){
		let types, type;
		if(!grid.cell_types[cell]){
			// probably, nested cell child
		    types = ['free'];
		    type = 'free';
		} else {
		    types = split_camelcase(grid.cell_types[cell].type);
		    type = grid.cell_types[cell].type;
		}
		var props = {};
		var once = false;
		for(let subtype of types){
			if(system_predicates.has(subtype) && subtype !== 'is'){
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
	var by_types = group_by(cells, (obj) => {
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
var get_vals = (grid) => {
	var res = Object.assign({}, grid.cell_values);
	for(let child_name in grid.linked_hashes){
		if(child_name === '..') continue;
		let child_id = grid.linked_hashes[child_name];
		let child = grid.app.getGrid(child_id);
		res[child_name] = get_vals(child);
	}
	return res;
}

Firera.undef = new function(){};
Firera.noop = new function(){};
Firera.apps = apps;
Firera.run = Firera;
Firera.getAppStruct = function() {
	return Firera.apps.map(get_app_struct);
}
Firera.loadPackage = function(pack) {
	root_package_pool.load(pack);
}
Firera.join = function(...args){
	var join = (a, b) => {
		for(let i in b){
			a[i] = b[i];
		}
	}
	var res = Object.assign({}, args[0]);
	for(let key in args){
		var grid = args[key];
		if(key === 0) continue;
		for(let k in grid){
			if(k === '$packages'){
				init_if_empty(res, k, []);
				res.$packages = res.$packages.concat(grid[k]);
				continue;
			}
			init_if_empty(res, k, {});
			join(res[k], grid[k]); 
		}
	}
	return res;
}

var arr_changes_to_child_changes = function(item_hash, arr_change){
	//console.log('beyond the reals of death', item_hash, arr_change);
	if(!arr_change){
		return;
	}
	return arr_change.map((val, key) => {
		var new_val = val.slice();
		new_val[3] = new_val[2];
		new_val[2] = item_hash;
		return new_val;
	});
}

var get_arr_changes = () => {
	var arr = [];
	var id = -1;
	var map = {};
	return (new_arr) => {
		var changes = [];
		arr_different(new_arr, arr, (key) => {
			// create new element
			map[key] = ++id;
			changes.push(['add', id, new_arr[key]]);
		})
		//console.log('Computing changes between new an old arrays', new_arr, arr);
		arr_different(arr, new_arr, (key) => {
			// create new element
			changes.push(['remove', map[key]]);
			delete map[key];
		})
		arr_common(arr, new_arr, (key) => {
			changes.push(['change', map[key], new_arr[key]]);
		})
		arr = new_arr;
		return changes;
	}
}

var core = {
	cellMatchers: {
		prevValue: {
			// ^foo -> previous values of 'foo'
			name: 'PrevValue',
			regexp: new RegExp('^(\-|\:)?\\^(.*)', 'i'),
			func: function(matches, pool, context, packages){
				if(context == 'setter') return;
				var cellname = matches[2];
				parse_fexpr(['closure', function(){
					var val;
					//console.log('Returning closure func!');
					return function(a){
						//console.log('getting prev val');
						var old_val = val;
						val = a;
						return [old_val, a];
					}
				}, cellname], pool, '^' + cellname, packages);
			}
		}
	},
	predicates: {
		interval: (fs) => {
			var [interval_ms, flag] = fs;
			if(flag){
				return ['asyncClosure', () => {
					var intervalId;
					var prev = false;
					return function(cb, start_stop){
						if(start_stop === prev){
							return;
						}
						if(Firera.is_def(start_stop) && start_stop){
							intervalId = setInterval(cb, interval_ms);
						} else {
							clearInterval(intervalId);
						}
						prev = start_stop;
					}
				}, flag]
			} else {
				return ['asyncClosure', () => {
					return function(cb){
						setInterval(cb, interval_ms);
					}
				}]
			}
		},
		toggle: (fs) => {
			var [cell, def] = fs;
			return ['closure', () => {
				var now = def !== undefined ? def : true;
				return function(cb){
					if(now){
						now = false
					} else {
						now = true;
					}
					return now;
				}
			}, cell];
		},
		skipIf: (fs) => {
			var [compare_func, func, ...args] = fs;
			return ['asyncClosure', () => {
				var prev = [];
				return function(cb, ...inner_args){
					if(compare_func(prev, inner_args)){
						var res = func.apply(null, inner_args);
						prev = inner_args;
						cb(res);
					}
				}
			}, ...args];
		},
		transist: (fs) => {
			var func;
			if(fs[0] instanceof Function){
				func = fs.shift();
			}
			return [(cellA, cellB) => {
				if(cellA){
					return func ? func(cellB) : cellB;
				} else {
					return Firera.noop;
				}
			}].concat(fs);
		},
		transistAll: (fs) => {
			var [func, ...rest] = fs;
			return [(cellA, ...restArgs) => {
				if(cellA){
					return func.apply(restArgs);
				} else {
					return Firera.noop;
				}
			}].concat(rest);
		},
		'&&': (fs) => {
			return [(cellA, cellB) => {
				return cellA && cellB;
			}].concat(fs);
		},
		'==': (fs) => {
			return [(cellA, cellB) => {
				return cellA == cellB;
			}].concat(fs);
		},
		'!': (fs) => {
			return [(a) => !a].concat(fs);
		},
		equal: (fs) => {
			return [(a, b) => a === b].concat(fs);
		},
		accum: (funcstring) => {
			return ['closure', () => {
				var arr = [];
				return (a) => {
					arr.push(a);
					return arr;
				}
			}, funcstring[0]];
		},
		first: function(funcstring){
			return [(a) => a, ...funcstring]
		},
		second: function(funcstring){
			return [(a, b) => b, ...funcstring]
		},
		firstDefined: function(funcstring){
			return [function(){
					for(var i in arguments){
						if(arguments[i] !== undefined) return arguments[i];
					}
			}, ...funcstring]
		},
		firstTrue: function(funcstring){
			return [function(){
					//console.log('Looking for firstTrue', arguments);
					for(var i in arguments){
						if(arguments[i]) return arguments[i];
					}
			}, ...funcstring]
		},
		valMap: function(funcstring){
			var valMap;
			if(funcstring[0] instanceof Object && !(funcstring[0] instanceof Array)){
				valMap = funstring.shift();
			} else {
				// true/false by default
				valMap = {};
				valMap[funcstring[0]] = true;
				valMap[funcstring[1]] = false;
			}
			var func = (cell, val) => {
				return valMap[cell];
			}
			return ['funnel', func, ...funcstring];
		},
		firstTrueCb: function(funcstring){
			var cb = funcstring[0];
			var fncstr = funcstring.slice(1);
			return [function(){
					//console.log('Looking for firstTrue', arguments);
					for(var i in arguments){
						if(cb(arguments[i])) return arguments[i];
					}
			}, ...fncstr]
		},
		asArray: function(funcstring){
			var subscribe_to = '*/*';
			if(funcstring[0] instanceof Array){
				// its an array of fields
				var fields = funcstring[0].map((a) => '*/' + a);
				subscribe_to = ['funnel', ids, ...fields];
			}
			return ['closureFunnel', () => {
					var arr = [];
					//console.log('Returning closure');
					return (cell, values) => {
						if(cell === '$arr_data.changes'){
							for(let i in values){
								var [type, index, _, val] = values[i];
								if(type === 'add'){
									var added_obj = {};
									for(let fieldname of fields){
										fieldname = fieldname.replace("*/", "");
										added_obj[fieldname] = val[fieldname];
									}
									arr[index] = added_obj;
								} else if(type === 'remove'){
									delete arr[index];
									//arr.splice(index, 1);
								}
							}
						} else {
							if(values){
								let [fieldname, val] = values;
								fieldname = fieldname.replace("*/", "");
								if(val){
									//console.log('?', val, arr, fieldname, arr[val[0]]);
									arr[val[0]][fieldname] = val[1];
								}
							}
						}
						return arr_fix_keys(arr);
					}
			}, subscribe_to, '$arr_data.changes']
		},
		indices: function(funcstring){
			var func = funcstring[0];
			var field = '*/' + funcstring[1];
			if(!funcstring[1]){
				field = '*/' + func;
				func = id;
			}
			return ['closureFunnel', () => {
				var indices = new Set();
				return (fieldname, vl) => {
					if(field === fieldname){
						var [index, val] = vl;
						var res = func(val);
						if(res){
							indices.add(index);
						} else {
							indices.delete(index);
						}
					} else {
						if(!vl) return indices;
						for(let [change_type, index] of vl){
							if(change_type === 'remove') {
								indices.delete(index);
							}
						}
					}
					return indices;
				}
			}, field, '$arr_data.changes'];
		},
		reduce: function(funcstring){
			var field = '*/' + funcstring[0];
			var config = funcstring[1];
			var res = config.def;
			var vals = {};
			return ['closureFunnel', () => {
				return (cell, chng) => {
					var key, val;
					if(cell === '$arr_data.changes'){
						if(chng instanceof Array){
							for(let i in chng) {
								if(!chng[i] instanceof Array) return;
								var type = chng[i][0];
								key = chng[i][1];
								val = chng[i][3] ? chng[i][3][funcstring[0]] : undefined;
								if(type === 'add'){
									res = config.add(val, res);
									vals[key] = val;
								}
								if(type === 'remove'){
									res = config.add(vals[key], res);
									delete vals[key];
								}
							}
						}
					} else {
						if(chng){
							[key, val] = chng;
							res = config.change(val, vals[key], res);
							vals[key] = val;
						}
					}
					return res;
				}
			}, field, '$arr_data.changes']
		},
		count: function(funcstring){
			var fieldname = funcstring[0];
			var pieces = fieldname.split('/');
			fieldname = pieces.pop();
			var prefix = pieces.length ? pieces.join('/') + '/' : '';
			if(fieldname === '*'){
				// just count all
				return [ prefix + '$arr_data.length'];
			}
			return ['closureFunnel', () => {
				var count = 0;
				var vals = {};
				return (cell, chng) => {
					if(path_cellname(cell) == '$arr_data.changes'){
						// finding deletion
						chng.filter((a) => {
							return a[0] === 'remove';
						}).each((a) => {
							if(vals[a[1]]){
								//console.log('Removing one');
								count--;
							}
							delete vals[a[1]];
						})
						return count;
					}
					if(!chng) return count;
					var [key, val] = chng;
					var prev_val = vals[key];
					if(prev_val === undefined) {
						if(val) count++
					} else {
						if(prev_val !== val){
							if(val){
								count++
							} else {
								count--;
							}
						}
					}
					vals[key] = val;
					//console.log('Now count', count);
					return count;
				}
			}, prefix + '*/' + fieldname, prefix + '$arr_data.changes']
		},
		join: function(funcstring){
			return ['funnel', second].concat(funcstring);
		},
		list: function(funcstring){
			var props = funcstring[0];
			if(!props instanceof Object){
				console.error('List properties should be an object!');
			}
			var item_type = props.type;
			if(!props.push && !props.datasource && !props.deltas && !props.data && !funcstring[1]){
				console.warn('No item source provided for list', funcstring);
			}
			//console.log('List properties', props);
			var deltas_func;
			if(props.push){ 
				deltas_func = ['map', {
					$push: (val) => {
						if(val){
							return [['add', null, val]];
						}
					},
					$pop: (key) => {
						if(key || key === 0 || key === '0'){
							if(key instanceof Array || key instanceof Set){
								var arr = [];
								for(let k of key){
									arr.push(['remove', k]);
								}
								return arr;
							}
							return [['remove', key]];
						}
					}
				}]
			} else if(props.deltas) {
				deltas_func = [id, props.deltas];
			} else if(props.data) {
				deltas_func = ['closure', get_arr_changes, ['just', props.data]];
			} else {
				deltas_func = ['closure', get_arr_changes, '$datasource']
			}
			var all_lists_mixin = {
				$no_auto_template: true,
				$deltas: deltas_func,
				/*$init: {
					$template: "<div>Ololo</div>"
				},*/
				'$arr_data': [
					'nestedClosure',
					() => {
						var id = -1;
						var length = 0;
						return (cb, changes) => {
							if(!changes || !changes.length) return;
							var chngs = arr_changes_to_child_changes(item_type, changes);
							//console.log('Got changes:', frozen(chngs), 'from', changes);
							chngs.forEach((one) => {
								switch(one[0]){
									case 'add':
										one[1] = String(id < 1000000 ? ++id : -1);
										++length;
									break;
									case 'remove': 
										--length;
									break;
								}
							})
							cb('changes', chngs);
							cb('length', length);
						};
					},
					'$deltas'
				],
				$list_template_writer: ['nestedClosure', () => {
					var index_c = 3;
					var index_map = {};
					return function(cb, deltas, $el){
						if($el === Firera.undef) return;
						if(!$el) return;
						for(var i in deltas){
							var type = deltas[i][0];
							var key = deltas[i][1];
							switch(type){
								case 'add':
									$el.append('<div data-fr="' + (++index_c) + '" data-fr-name="' + key + '"></div>');
									index_map[key] = index_c;
									// I domt know...
								break
								case 'remove':
									$el.children('[data-fr=' + index_map[key] + ']').remove();
								break
							}
						}
						cb('dummy', true);
						cb('index_map', index_map);
						return true;
					}
				}, '$arr_data.changes', '$real_el'],
				$htmlbindings: ['closure', () => {
					return ($el, map) => {
						if(!$el || !map) return;
						var res = map.map((n, i) => {
							return get_by_selector(map[i], $el);
						})
						return res;
					}
				}, '$real_el', '$list_template_writer.index_map'],
				$children: ['$arr_data.changes']
			};
			if(props.push){
				all_lists_mixin.$push = props.push;
			}
			if(props.pop){
				all_lists_mixin.$pop = props.pop;
			}
			if(props.datasource){
				all_lists_mixin.$datasource = props.datasource;
			}
			var fnc;
			var list_own_type = Object.assign(all_lists_mixin, props.self || {});
			if(props.create_destroy){
				fnc = [(a) => { 
					if(a){ 
						return list_own_type;
					} else {
						return false;
					}
				}, props.create_destroy];
			} else {
				fnc = [_F.always(list_own_type)];
			}
			return fnc;
		},
		arr_deltas: function(funcstring){
			var cell = funcstring[0];
			return ['closure', function(){
				var val = [];
				return function(new_arr){
					var deltas = arr_deltas(val, new_arr);
					val = new_arr;
					//console.info('deltas are', deltas);
					return deltas;
				}
			}, cell]
		}
	}
} 


var get_by_selector = function(name, $el, children = false){
	if(name === null) return null;
	if(name === '__root') return $('body');
	var method = children ? 'children' : 'find';
	var res = $el 
			? $el[method]('[data-fr=' + name + ']')
			: null;
	//console.info("GBS", '[data-fr=' + name + ']', res ? res.length : null, $el ? $el.html() : '');
	return res;''
}
var search_fr_bindings = function($el){
	var res = {};
	if(!is_def($el)) return res;
	$el.find('[data-fr]').each(function(){
		var name = $(this).attr('data-fr-name');
		if(!name){
			name = $(this).attr('data-fr');
		}
		res[name] = $(this);
	})
	return res;
}

var write_changes = function(){
	var pool = {};
	return (cell, val) => {
		if(cell === '*'){
			pool[val[0]] = val[1];
		} else {
			// htmlbindings, obviously
			for(let i in pool){
				if(val && val[i]){
					val[i].html(pool[i]);
				}
			}
		}
	}
}

var simpleHtmlTemplates = {
	eachHashMixin: {
		$el: ['closure', () => {
			var prev_el;
			return (name, map) => {
				return map ? map[name] : null;
			}
		}, '$name', '../$htmlbindings'],
		'$real_el': ['firstDefined', '$el'],
		'$html_template': [
			'skipIf',
			([$prev_el], [$el]) => {
				if(is_def($prev_el) && is_def($el) && $prev_el[0] && $el[0] && $prev_el[0] === $el[0]){
					return false;
				} else {
					return true;
				}
			},
			function($el){
				var str = '';
				if(is_def($el)){
					str = $el.html();
					if(str) str = str.trim();
				}
				return str;
			}, 
			'$real_el'
		],
		'$template_writer': [
			function(real_templ, $html_template, no_auto, keys, $el){
				if(is_def(real_templ) && is_def($el)){
						$el.html(real_templ);
						return true;
				}	
				if(!$html_template && is_def($el) && keys && !no_auto){
					var auto_template = keys.map((k) => {
						return '<div>' + k + ':<div data-fr="' + k + '"></div></div>';
					}).join(' ');
					$el.html(auto_template);
				}
			}, '$template', '$html_template', '$no_auto_template', '-$real_keys', '-$real_el'
		],
		'$html_skeleton_changes': [id, '$template_writer'],
		'$htmlbindings': [search_fr_bindings, '-$real_el', '$template_writer'],
		'$writer': ['closureFunnel', write_changes, '$htmlbindings', '*']
	}
}
var htmlPipeAspects = {
	attr: (el, attr) => {
		if(!el) return;
		return $(el).attr(attr);
	}
}
var filter_attr_in_path = (e) => {
	return true;
}
var filter_attr_in_parents = (parent_node, index, el) => {
	for(;;){
		el = el.parentElement;
		if(!el) return true;
		if(el.hasAttribute('data-fr')){
			return el === parent_node;
		}
	}
}

var htmlCells = {
	cellMatchers: {
		HTMLAspects: {
			// ^foo -> previous values of 'foo'
			name: 'HTMLAspects',
			regexp: new RegExp('^(\-|\:)?([^\|]*)?\\|(.*)', 'i'),
			func: function(matches, pool, context, packages){
				var get_params = (aspect) => {
					var params = aspect.match(/([^\(]*)\(([^\)]*)\)/);
					if(params && params[1]){
						aspect = params[1];
						params = params[2].split(',');
					}  
					return [aspect, params || []];
				}
				var cellname = matches[0];
				var aspects = matches[3].split('|');
				//console.log('Got following aspects', aspects);
				var aspect = aspects[0];
				var pipe = aspects.slice(1);
				if(pipe.length){
					pipe = pipe.map(get_params);
				}
				
				var make_resp = !pipe.length ? (cb, val) => { 
					return cb(val);
				} : function(cb, e){
					var res = e.target;
					for(const [asp, pars] of pipe){
						if(!htmlPipeAspects[asp]){
							console.error('Unknown pipe aspect:', asp);
							continue;
						}
						res = htmlPipeAspects[asp](res, ...pars);
					}
					return cb(res);
				}
				var selector = matches[2];
				var func, params;
				var setters = new Set(['visibility', 'display', 'setval', 'hasClass', 'css']);
                [aspect, params] = get_params(aspect);
				//console.info('Aspect:', aspect, context, params, matches[2]);
				//if(context === null && setters.has(aspect)) context = 'setter';
				if(
					(context === 'setter' && !setters.has(aspect))
					||
					(context !== 'setter' && setters.has(aspect))
				){
					return;
				}
				switch(aspect){
					case 'getval':
						func = function(cb, vals){
							var onch = (el) => {
								var type = el.attr('type');
								var val;
								if(type == 'checkbox'){
									val = el.prop('checked');
								} else {
									val = el.val();
								}
								//console.log('CHange', el, val, selector);
								make_resp(cb, val);
							}
							var onChange = function(e){
								if(!filter_attr_in_path(e)){
									return;
								}
								onch($(this));
							};
							var onKeyup = function(e){
								if(!filter_attr_in_path(e)){
									return;
								}
								var el = $(this);
								var type = el.attr('type');
								var val;
								if(type == 'checkbox'){
									return;
								} else {
									val = el.val();
								}
								make_resp(cb, val);
							};
							var [$prev_el, $now_el] = vals;
							//console.log('Assigning handlers for ', cellname, arguments, $now_el.find(selector));
							if(is_def($prev_el)){
								$prev_el.off('keyup', selector);
								$prev_el.off('change', selector);
							}
							if(is_def($now_el)){
								$now_el.on({keyup: onKeyup, change: onChange}, selector);
							}
						}
					break;
					case 'click':
						if(selector === 'other'){
							func = function(cb, vals){
								if(!vals) return;
								var [$prev_el, $now_el] = vals;
								if(!$now_el) return;
								if($now_el === Firera.undef) return;
								$(document).click(function(e, originalTarget){
									var is_other = !$.contains($now_el.get()[0], originalTarget);
									if(is_other){
										make_resp(cb, true);
									}
								})
							}
						} else {
							func = function(cb, vals){
								if(!vals) return;
								var [$prev_el, $now_el] = vals;
								if(!$now_el) return;
								if($now_el === Firera.undef) return;
								//console.log('Assigning handlers for ', cellname, arguments, $now_el);
								if($prev_el && $prev_el !== Firera.undef){
									$prev_el.off('click', selector);
								}
								if($now_el.length === 0){
									console.warn('Assigning handlers to nothing', $now_el);
								}
								$now_el.on('click', selector, (e) => {
									if(!filter_attr_in_path(e)){
										return;
									}
									make_resp(cb, e);
									if(e.originalEvent && e.originalEvent.target){
										$(document).trigger('click', e.originalEvent.target);
									}
									return false;
								});
							}
						}
					break;
					case 'focus':
						func = function(cb, vals){
							if(!vals) return;
							var [$prev_el, $now_el] = vals;
							if(!$now_el) return;
							if($prev_el){
								$prev_el.off('focus', selector);
							}
							if($now_el.length === 0){
								console.log('Assigning handlers to nothing', $now_el);
							}
							$now_el.on('focus', selector, (e) => {
								if(!filter_attr_in_path(e)){
									return;
								}
								make_resp(cb, e);
								return false;
							});
						}
					break;
					case 'press':
						func = function(cb, vals){
							var [$prev_el, $now_el] = vals;
							if(!$now_el) return;
							//console.log('Assigning handlers for ', cellname, arguments, $now_el);
							if($prev_el){
								$prev_el.off('keyup', selector);
							}
							$now_el.on('keyup', selector, function(e){
								if(!filter_attr_in_path(e)){
									return;
								}
								var btn_map = {
									'13': 'Enter',
									'27': 'Esc',
								}
								if(params.indexOf(btn_map[e.keyCode]) !== -1){
									make_resp(cb, e);
								}
							});
						}
					break;
					case 'hasClass':
						func = function($el, val){
							if(!is_def($el)) return;
							if(!is_def(val)){
								val = false;
							}
							var [classname] = params;
							$el.toggleClass(classname, val);
						}
					break;
					case 'enterText':
						func = function(cb, vals){
							var [$prev_el, $now_el] = vals;
							if(!$now_el) return;
							if($prev_el){
								$prev_el.off('keyup', selector);
							}
							//$now_el.on('keyup', selector, function(e){
							//});
							var el = $now_el[0];
							el.onkeyup = function(e) {
								if(e.target === $now_el.find(selector)[0]){
									if(!filter_attr_in_path(e)){
										return;
									}
									if(e.keyCode == 13){
										make_resp(cb, e.target.value);
									}
								}
							};
						}
					break;
					case 'visibility':
						func = function($el, val){
							if(!$el){
								return;
							}
							if(val === undefined){
								return;
							}
							if(val){
								$el.css('visibility', 'visible');
							} else {
								$el.css('visibility', 'hidden');
							}
						}
					break;
					case 'css':
						var [property] = params;
						func = function($el, val){
							//console.log('running css setter', $el);
							$el.css(property, val);
						}
					break;
					case 'display':
						func = function($el, val){
							if(!$el || val === undefined){
								return;
							}
							if(val){
								$el.css('display', 'block');
							} else {
								$el.css('display', 'none');
							}
						}
					break;
					case 'setval':
						func = function($el, val){
							$el.val(val);
						}
					break;
					default:
						throw new Error('unknown HTML aspect: ' + aspect);
					break;
				}
				if(context === 'setter'){
					parse_fexpr([func, [(a) => {
						if(!is_def(a)) return $();
						if(!selector) return a;
						if(selector === 'other') return a;
						return a.find(selector)
								.filter(filter_attr_in_parents.bind(null, a.get()[0]));
					}, '-$real_el', '$html_skeleton_changes'], cellname], pool, get_random_name(), packages);
					//console.log('OLOLO2', Object.keys(pool.cell_types.$real_el.children), packages);
				} else {
					parse_fexpr(['asyncClosure', () => {
						var el;
						return (cb, val) => {
							func(cb, [el, val]);
							el = val;
						}
					}, '-$real_el', '$html_skeleton_changes'], pool, cellname, packages);
				}
			}
		}
	}
}

Firera.Ozenfant = Ozenfant;

var get_ozenfant_template = (str, context) => {
	if(str){
		var template = new Ozenfant(str);
		var filtered_context = {};
		for(let k in context){
			if(context[k] instanceof Object){
				// dont write objects to html!
			} else {
				filtered_context[k] = context[k];
			}
		}
		//template.state = filtered_context;
		return template;
	}
}

var get_fields_map = function(){
	var map = {};
	return ([key, val]) => {
		map[key] = val;
		return val;
	}
} 

var write_ozenfant_changes = function(change, template){
	if(!template) return;
	var [k, v] = change;
	if(unusual_cell(k)) return;
	if(v instanceof Object){
		// lol dont write objects to html!
		return;
	}
	template.set(...change);
}

var collect_map = () => {
	var map = {};
	return ([key, val]) => {
		map[key] = val;
		return map;
	} 
}

var Tree = function(){
	this.template_hash = {};
	this.template_tree = {};
	this.bindings = {};
	this.onUpdateBindingsCbs = {};
}

Tree.prototype.getHTML = function(path, node){
	if(!node) return;
	if(node instanceof Ozenfant){
		// its final template
		return this.template_hash[path].getHTML();
	} else {
		var template;
		if(template = this.template_hash[path]){
			// its object
			for(let key in node){
				var new_path = path == '/' ? path + key : path + '/' + key;
				template.set(key, this.getHTML(new_path, node[key]));
			}
			return template.getHTML();
		} else {
			// its array
			var res = [];
			for(let key in node){
				var new_path = path == '/' ? path + key : path + '/' + key;
				res.push('<div data-fr="' + key + '" data-fr-name="' + key + '">'
						+ this.getHTML(new_path, node[key])
						+ '</div>'
						)
			}
			return res.join(' ');
		}
	}
}

Tree.prototype.onUpdateBinding = function(path, cb){
	this.onUpdateBindingsCbs[path] = cb;
}

Tree.prototype.updateBindings = function(path, struct, el = false){
	var template = this.template_hash[path];
	if(el){
		this.bindings[path] = el;
	}
	if(!template){
		// its list
		for(var child of el.children){
			var num = child.getAttribute('data-fr-name');
			if(struct[num]){
				var new_path = path == '/' ? path + num : path + '/' + num;
				this.updateBindings(new_path, struct[num], child);
			}
		}
		return;
	}
	if(el){
		template.setRoot(el);
	}
	template.updateBindings();
	if(this.onUpdateBindingsCbs[path]){
		this.onUpdateBindingsCbs[path]($(this.template_hash[path].root));
	}
	if(!(struct instanceof Object) || (struct instanceof Ozenfant)){
		return;
	}
	for(let key in struct){
		var new_path = path == '/' ? path + key : path + '/' + key;
		if(template.bindings[key]){
			this.updateBindings(new_path, struct[key], template.bindings[key]);
		} else {
			//console.log('bindings not found!', template.bindings, key);
		}
	}
}



Tree.prototype.getBindingsRec = function(path){
	//console.log('Look for bindings!', path);
	var parent = path.split('/');
	var key = parent.pop();
	var parent = parent.join('/');
	if(parent === ''){
		parent = '/';
	}
	var template = this.template_hash[parent];
	if(template){
		return template.bindings[key];
	} else {
		var bnd = this.bindings[parent];
		if(!bnd){
			if(parent){
				bnd = this.getBindingsRec(parent);
			}
		}
		var bv = $(bnd).children('[data-fr=' + key + ']');
		if(!bv.length){
			bv = $("<div/>").attr('data-fr', key).appendTo(bnd);
		}
		return bv.get()[0];
	}
}

Tree.prototype.render = function(root_path){
	//timer('render', root_path);
	var branch = get_branch(this.template_tree, root_path);
	var res = this.getHTML(root_path, branch);
	var root_el = this.template_hash[root_path] ? this.template_hash[root_path].root : false;
	if(!root_el){
		root_el = this.bindings[root_path];
	}
	if(!root_el){
		root_el = this.getBindingsRec(root_path);
	}
	if(!root_el){
		console.warn('Root DOM node($el) is undefined');
		return;
		// oh god...
	}
	root_el.innerHTML = res;
	//timer('update Bindings', root_path);
	this.updateBindings(root_path, branch, root_el);
	//timer('--- render finished', root_path);
}

Tree.prototype.refresh = function(){
	var root_path;
	if(this.refreshPrefixPath){
		root_path = this.refreshPrefixPath.join('/');
		this.refreshPrefixPath = false;
		root_path = root_path == '' ? '/' : root_path;
		if(root_path[0] !== '/'){
			root_path = '/' + root_path;
		}
	} else {
		root_path = '/';
	}
	this.render(root_path);
}

Tree.prototype.addToRefreshPool = function(path, pth){
	if(!this.refreshPrefixPath){
		this.refreshPrefixPath = pth;
	} else {
		for(var key in pth){
			if(this.refreshPrefixPath[key] !== pth[key]){
				break;
			}
		}
		this.refreshPrefixPath = this.refreshPrefixPath.slice(0, key);
	}
}

Tree.prototype.removeLeaf = function(path, skip_remove_node){
	var skip_further = true;
	if(!skip_remove_node){
		if(this.template_hash[path] && this.template_hash[path].root){
			this.template_hash[path].root.remove();
		} else {
			skip_further = false;
		}
	}
	delete this.template_hash[path];
	delete this.bindings[path];
	var struct = get_branch(this.template_tree, path);
	for(var key in struct){
		var new_path = path + '/' + key;
		this.removeLeaf(new_path, skip_further);
	}
} 

var get_parent_path = (path) => {
	var p = path.split('/');
	var name = p.pop();
	if(Number(name) == name){
		p.pop();
	}
	var parent = p.join('/');
	if(parent == ''){
		parent = '/';
	}
	return [name, parent];
}

Tree.prototype.setTemplate = function(path, template, context, el){
	var pth = path.split('/'); 
	if(pth[0] === ''){
		pth = pth.slice(1);
	}
	if(pth[0] === ''){
		pth = pth.slice(1);
	}
	var tmpl = new Ozenfant(template);
	tmpl.state = context;
	if(el){
		tmpl.root = el;
	}
	this.template_hash[path] = tmpl;
	init_from_path(this.template_tree, path, {});
	this.addToRefreshPool(path, pth);
	var [name, parent] = get_parent_path(path);
	if(this.template_hash[parent] && !((Number(name) == name) && name.length)){
		this.refresh(); 
	}
}

var ozenfant_trees = {};

var get_branch = (tree, path) => {
	var pth = path.split('/');
	for(let k of pth){
		if(k === '') continue;
		if(!tree[k]){
			break;
		}
		tree = tree[k];
	}
	return tree;
}

var get_tree = (app_id) => {
	var tree;
	if(!ozenfant_trees[app_id]){
		ozenfant_trees[app_id] = tree = new Tree();
	} else {
		tree = ozenfant_trees[app_id];
	}
	return tree;
}

var ozenfant_new = {
	eachHashMixin: {
		'$real_el': ['asyncClosure', () => {
			var hashname, template;
			return (cb, template, path, app_id, context, el) => {
				if(!app_id) return;
				var pth = path === '/' ? '' : path;
				var tree = get_tree(app_id);
				tree.onUpdateBinding(path, cb);
				tree.setTemplate(path, template, context, is_def(el)? el.get()[0] : false);
			}
		}, '$template', '-$path', '-$app_id', '-$real_values', '-$el'],
		'$ozenfant.list_render': [
			(_, path, app_id) => {
				var parent = get_parent_path(path)[1];
				var tree = get_tree(app_id);
				if(tree.bindings[parent]){
						tree.render(parent);
				}				
			}, 
			'$all_children', '-$path', '-$app_id'],
		'$ozenfant.writer': [([cell, val], template_path, app_id) => {
				if(!template_path || !app_id || !ozenfant_trees[app_id]) return;
				var pth = template_path;
				var template = get_tree(app_id).template_hash[pth];
				if(!template) {
					return;
				}
				template.set(cell, val);
		}, '*', '-$path', '-$app_id'],
		'$html_skeleton_changes': ['$real_el'],
		'$ozenfant.remover': [(_, path, app_id) => {
				ozenfant_trees[app_id].removeLeaf(path);
		}, '$remove', '-$path', '-$app_id']
	}
}

var ozenfant = {
	eachHashMixin: {
		'$ozenfant_el': [(searcher, name) => {
				var res;
				if(searcher instanceof Function){
					res = searcher(name);
				}
				return res ? $(res) : false;
		}, '../$ozenfant.bindings_search', '$name'],
		'$list_el': [(name, $el, map) => {
				//console.log('search list', name, $el, map);
				if(name === null || name === undefined || !map) return;
				var num = map[name];
				return get_by_selector(num, $el, true);
		}, '$name', '../$real_el', '../$list_template_writer.index_map'],
		'$real_el': ['firstTrueCb', ($el) => { return $el && $el.length }, '$el', '$list_el', '$ozenfant_el'],
		'$ozenfant_template2': [get_ozenfant_template, '$template', '-$real_values'],
		'$ozenfant': ['nested', (cb, template, $el, context) => {
				if(!template || !is_def($el)) return;
				var filtered_context = {};
				for(let k in context){
					if(context[k] instanceof Object){
						// dont write objects to html!
					} else {
						filtered_context[k] = context[k];
					}
				}
				if($el){
					template.render($el.get(0), filtered_context);
				}
				cb('bindings_search', (str) => {
					return template.bindings ? template.bindings[str] : false;
				})
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
		'$ozenfant_first_render': [(_, struct, $el) => {
				//var html = ozenfant_to_html_rec(struct);
				//console.log('First render!', struct, $el, html);
				//$el.html(html);				
		}, '$inited', '-$ozenfant_something', '-$real_el'],
		//'$templates_map': ['closure', collect_map, '*/$ozenfant_something'],
		'$html_skeleton_changes': ['$ozenfant.html'],
		'$ozenfant_remove': [function(_, $el){
			if($el){
				$el.html('');
			}
		}, '$remove', '-$real_el']
	}
}

var che_package = {
	predicates: {
		che: function(expr){
			var [expr, cbs] = expr;
			cbs = cbs || [];
			var succ_cb;
			var obj = che.create(expr, {
				onOutput: function(key, val){
					console.log('outputting from che', key, val);
				},
				onSuccess: function(){
					console.log('che scenario successfully finished', succ_cb, obj.state);
					succ_cb(obj.state);
				}
			}, ...cbs);
			var str = ['asyncClosureFunnel', () => {
				return (cb, cell, val) => {
					console.log('something dripped', cb, cell, val);
					succ_cb = cb;
					obj.drip(cell, val);
					return 'a';
				}
			}, ...obj.needed_events]
			console.log('getting che expr', str);
			return str;
		}
	}
} 

var rendered = {};
var templates = {};

var parse_rec = (app, grid_id, cell) => {
	var grid = app.getGrid(grid_id);
	var res = {
		val: grid.cell_values[cell],
		grid_id,
		children: {},
	};
	for(let gridname in grid.linked_hashes){
			var gr_id = grid.linked_hashes[gridname];
			res.children[gridname] = parse_rec(app, gr_id, cell);
	}
	return res;

}
var render_rec = (app, struct) => {
	var grid = app.getGrid(struct.grid_id);
	init_if_empty(rendered, app.id, {}, grid.id, true);
	if(struct.val){
		var context = Object.create(grid.cell_values);
		for(let key in struct.children){
				context[key] = render_rec(app, struct.children[key])
		}
		init_if_empty(templates, app.id, {});
		templates[app.id][grid.path] = struct.tmpl = new Firera.Ozenfant(struct.val);
		return struct.tmpl.getHTML(context);
	} else {
		var res = [];
		for(let key in struct.children){
				res.push(render_rec(app, struct.children[key]));
		}
		return res.join('');
	}
}
var set_bindings_rec = (app, struct, el) => {
	if(!struct) debugger;
	var grid = app.getGrid(struct.grid_id);
	if(struct.tmpl){
		grid.set('$el', $(el));
		struct.tmpl.setRoot(el).updateBindings();
		for(let key in struct.children){
			let el = struct.tmpl.bindings[key];
			set_bindings_rec(app, struct.children[key], el);
		}
	} else {
		el.children.each((node, key) => {
			if(el.children.hasOwnProperty(key)){
				set_bindings_rec(app, struct.children[key], node);
			}
		})
	}
}
var render = function(app, start, node){
		var struct = parse_rec(app, start.id, '$template');
		var html = render_rec(app, struct);
		if(!node) debugger; 
		node.innerHTML = html;
		set_bindings_rec(app, struct, node);
		//console.log('html', html);
}

var neu_ozenfant = {
	onHashCreated: (app, grid_id, path, parent) => {
		if(!parent){
			var self = app.getGrid(grid_id);
			var node = self.cell_values.$el.get()[0];
			render(app, self, node);
		}
		if(rendered[app.id] && rendered[app.id][parent]){
			var self = app.getGrid(grid_id);
			var parent_path = app.getGrid(parent).path;
			var parent_tmpl = templates[app.id][parent_path];
			//if(!parent_tmpl) debugger;
			var node = parent_tmpl.bindings[self.name];
			render(app, self, node);
		}
		//console.log('hash created', path, parent_path);
	}
}

Firera.is_def = is_def;
Firera.loadPackage(core);
Firera.loadPackage(che_package);
Firera.packagesAvailable = {simpleHtmlTemplates, htmlCells, ozenfant, ozenfant_new, neu_ozenfant, che: che_package};
//Firera.loadPackage(html);
Firera.func_test_export = {parse_pb, parse_fexpr};
Firera._F = _F;

module.exports = Firera;
