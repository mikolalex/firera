'use strict';

var Ozenfant = require('../ozenfant/ozenfant');
var che = require('shche');
var $ = require('jquery');

var always = (a) => {
	return () => a;
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

var group_by = (arr, prop_or_func) => {
	var res = {};
	for(let obj of arr){
		init_if_empty(res, prop_or_func instanceof Function ? prop_or_func(obj) : obj[prop_or_func], []).push(obj);
	}
	return res;
}

var frozen = (a) => JSON.parse(JSON.stringify(a));

var id = (a) => a;
var ids = function(){
	return arguments;
}

var arr_remove = (arr, el) => {
	var pos = arr.indexOf(el);
	if(pos !== -1){
		arr.splice(pos, 1);
	}
}

var arr_different = function(arr1, arr2, cb){
	for(var i in arr1){
		if(arr2[i] === undefined){
			cb(i);
		}
	}
}
var arr_common = function(arr1, arr2, cb){
	for(var i in arr1){
		if(arr2[i] !== undefined){
			cb(i);
		}
	}
}

var arr_deltas = (old_arr, new_arr) => {
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

var arr_fix_keys = (a) => {
	var fixed_arr = [];
	for(let i of a){
		if(i !== undefined){
			fixed_arr.push(i);
		}
	}
	return fixed_arr;
}

var path_cellname = (a) => a.split('/').pop();

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

function copy(from, to){
	for(var i in from){
		to.push(from[i]);
	}
}
function kcopy(from, to){
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
	return cell_listening_type(str)[1];
}

var real_cell_name = (str) => str.replace(/^(\:|\-|\=)/, '');


var PackagePool = function(proto = {}){
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
}

var LinkManager = function(app){
	this.app = app;
	this.links = [];
	this.linkStruct = {};
	this.workingLinks = {};
	this.pointers = {};
};

LinkManager.prototype.onNewHashAdded = function(parent_hash_id, child_id){
	//console.log('new hash added to', parent_hash_id, 'as', child_id, this.pointers[parent_hash_id]);
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
		if(val === undefined){
			return;
		}
		var lnks = this.workingLinks[master_hash_id][master_cell];
		for(var slave_hash_id in lnks){
			for(var slave_cellname in lnks[slave_hash_id]){
				var cell_val = val;
				var link_data = lnks[slave_hash_id][slave_cellname];
				//console.log('lnk id', link_id);
				var data = this.links[link_data.link_id];
				for(var i = data.path.length - 1; i > -1; i--){
					if(data.path[i] === '*'){
						//console.log('A', i, data.path, link_data.path[i+1]);
						cell_val = [link_data.path[i+1], cell_val];
					}
				}
				//console.log('SET', slave_hash_id, slave_cellname, cell_val);
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
}



var root_package_pool = new PackagePool();

var apps = [];
var App = function(packages){
	this.packagePool = new PackagePool(root_package_pool);
	if(packages){
		for(let pack of packages){
			this.packagePool.load(pack);
		}
	}
	this.hashes = {};
	this.hashIds = 0;
	this.linkManager = new LinkManager(this);
};
var noop = function(){
	console.log('Noop is called!');
};
App.prototype.get = function(cell, path){
	return this.root.get(cell, path);
}
App.prototype.getGrid = function(id){
	return this.hashes[id];
}
App.prototype.set = function(cell, val, child){
	this.root.set(cell, val, child);
}
App.prototype.parse_cbs = function(a){
	var eachMixin = Object.assign({}, this.packagePool.eachHashMixin);
	var res = {
		plain_base: Object.assign(eachMixin, a), 
		side_effects: {},
		hashes_to_link: {},
		no_args_cells: {},
	}
	parse_pb(res, this.packagePool);
	init_if_empty(res.plain_base, '$init', {}, '$name', null);
	//res.plain_base.$init['$name'] = null;
	res.cell_types = parse_cell_types(res.plain_base);
	return res;
}

App.prototype.loadPackage = function(pack) {
	this.packagePool.load(pack);
}

App.prototype.setHash = function(id, hash){
	this.hashes[id] = hash;
}

App.prototype.createHash = function(type, link_as, free_vals, parent_id) {
	var child = new Hash(this, type, link_as, Object.assign({
				$name: link_as
			}, free_vals), true, parent_id); 
	child.setLevels();
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
				console.warn('removing unexisting hash!', name);
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

var Hash = function(app, parsed_pb_name, name, free_vals, init_later, parent_id){
	var self = this;
	var id = ++app.hashIds;
	app.setHash(id, this);
	this.id = id;
	this.parent = parent_id;
	this.app = app;
	this.name = name || '__root';
	var parsed_pb = typeof parsed_pb_name === 'string' 
					? app.cbs[parsed_pb_name]
					: app.parse_cbs(parsed_pb_name);
	if(!parsed_pb){
		console.error('Cannot find hash to parse:', parsed_pb_name);
		return;
	}
	this.cell_types = parsed_pb.cell_types;
	this.side_effects = parsed_pb.side_effects;
	this.hashes_to_link = parsed_pb.hashes_to_link;
	this.plain_base = Object.create(parsed_pb.plain_base);
	this.link_chains = Object.create(parsed_pb.link_chains || {});
	this.setLevels();
	this.linked_hashes_provider = create_provider(app, self);
	this.linked_hashes = {};
	// for "closure" cell type
	this.cell_funcs = {};
	this.dirtyCounter = {};
	this.dynamic_cell_links = {};
	this.dynamic_cells_props = {};
	if(this.cell_types['*']){
		var omit_list = this.all_cell_children('*');
		for(let cell in this.cell_types){
			if(omit_list.indexOf(cell) === -1 && can_be_set_to_html(cell, this.app)){
				add_dynamic_link(this.dynamic_cell_links, cell, '__self', '*', '');
			}
		}
	}
	this.cell_values = Object.create(this.plain_base.$init || {});
	this.hashes_to_link.each((hash_name, link_as) => this.linkChild(hash_name, link_as));
	// @todo: refactor, make this set in one step
	this.init_values = Object.assign({}, this.plain_base.$init, free_vals || {});
	//console.log('Setting $init values', this.init_values);
	if(parsed_pb_name === '__root'){
		this.init_values.$name = '__root';
	}
	if(this.plain_base.$init && !init_later){
		this.init();
	}
	if(parsed_pb.no_args_cells){
		//this.set(parsed_pb.no_args_cells);
		parsed_pb.no_args_cells.eachKey((cellname) => {
			this.doRecursive((cell, parent_cell_name) => {
				this.compute(cell, parent_cell_name);
			}, cellname)
		})
	}
	if(this.link_chains){
		for(let link in this.link_chains){
			this.initLinkChain(link);
		}
	}
}

Hash.prototype.initIfSideEffectCell = function(cell){
	if(!this.cellExists(cell) && unusual_cell(cell)){
		parse_cellname(cell, this, 'getter', this.app.packagePool, this);
		this.cell_types = parse_cell_types(this.plain_base);
		this.setLevels();
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

Hash.prototype.linkChild = function(type, link_as, free_vals){
	if(this.linked_hashes_provider.isLinked(link_as)){
		this.unlinkChild(link_as);
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
	//if(run_async) debugger;
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
		});
	}
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
				if(!func) debugger;
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
		return this.cell_values[cell];
	}
}


Hash.prototype.setLevelsRec = function(cellname, already_set){
	var max_level = 1;
	for(var cell of this.cell_parents(cellname)){
		cell = real_cell_name(cell);
		if(cell[0] === '-') debugger;
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
Hash.prototype.setLevelsIterable = function(cellname, pool){
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

Hash.prototype.setLevels = function(){
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
}



Hash.prototype.set = function(cells, val, child, no_args){
	//console.log('levels', this.levels, this.cell_types);
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
		child.set(cells, val, child_path);
		return;
	}
	if(!(cells instanceof Object)){
		/*if(!this.cell_type(cells) === 'free'){
			throw Exception('Cannot set dependent cell!');
		}
		this.force_set(cells, val);
		return;*/
		var a = {};
		a[cells] = val;
		cells = a;
	}
	var set = Object.keys(cells);
	var already = new Set();
	var start_level = 100000;
	var levels = {};
	for(let cell in cells){
		if(!no_args){
			this.set_cell_value(cell, cells[cell]);
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
	//console.log('!!!!!!!!!!!!!!!!!!!!!! start level', start_level, levels);
	var x = start_level;
	var parents = {};
	while(levels[x] !== undefined){
		//var new_set = [];
		for(let cell of levels[x]){
			var skip = false;
			var needed_lvl = x+1;
			var children = this.cell_children(cell);
			var ct = this.cell_type(cell);
			//console.log('CT',cell, ct);
			if(
				!this.cell_has_type(cell, 'free')
				&& (cells[cell] === undefined || no_args)
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
				//console.log('_______child', child, lvl);
				if(!levels[lvl]){
					levels[lvl] = new Set();
				}
				if(!cells[child]){
					levels[lvl].add(child);
				}
				parents[child] = cell;
				for(var j = lvl - 1; j > x; j--){
					//console.log('add intermediate level', j);
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
		//console.log('~~~', x);
		x++;
		//set = new_set;
	}
	//console.log('levels was', levels);
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
	if(cell === '$real_keys'){
		return [...(new Set(Object.keys(this.plain_base).concat(Object.keys(this.plain_base.$init))))].filter((k) => {
			return k.match(/^(\w|\d|\_|\-)*$/);
		})
	}
	if(cell === '$real_values'){
		var res = {};
		[...(new Set(Object.keys(this.cell_values)
					.concat(Object.keys(this.init_values))))].filter((k) => {
			return k.match(/^(\w|\d|\_|\-)*$/);
		}).each((k, v) => {
			res[k] = this.cell_value(k);
		})
		return res;
	}
	/*if(cell === '$vals'){
		return Object.create(this.cell_values);
	}*/
	//console.log('Getting cell value', cell, this.cell_values, this.cell_values[cell]);
	return this.cell_values[cell];
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
						//console.log('Removing hash', key);
						this.unlinkChild(key);
					break;
					case 'add':
						//console.log('Adding hash', deltas[k]);
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

var init_if_empty = function(obj/*key, val, key1, val1, ... */) {
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
			//console.info('Cell', cellname, 'matches regexp', m.regexp, pool);
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
			cell_types[cellname] = get_cell_type(cellname, 'free');
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
	app.root = new Hash(app, '__root');
	//var init_finished = performance.now();
	//if(1 > 0){
	//	console.info('App run, it took ' + (init_finished - compilation_finished).toFixed(3) + ' milliseconds.'
	//	);
	//}
	return app;
};

var type_map = {
	'is': 'formula',
	'free': 'free',
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

var arr_diff = function(a, b){
	var diff = [];
	for(var i in a){
		if(!b[i]) diff.push(i);
	}
	return diff;
}

var second = (__, a) => a;

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
			return [(cellA, cellB) => {
				if(cellA){
					return cellB;
				} else {
					return Firera.noop;
				}
			}].concat(fs);
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
			if(!props.push && !props.datasource && !props.deltas){
				console.warn('No item source provided for list', props.deltas);
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
			} else {
				deltas_func = ['closure', () => {
					var arr = [];
					return (new_arr) => {
						var changes = [];
						arr_different(new_arr, arr, (key) => {
							// create new element
							changes.push(['add', key, new_arr[key]]);
						})
						//console.log('Computing changes between new an old arrays', new_arr, arr);
						arr_diff(arr, new_arr, (key) => {
							// create new element
							changes.push(['remove', key]);
						})
						arr_common(arr, new_arr, (key) => {
							changes.push(['change', key, new_arr[key]]);
						})
						arr = new_arr;
						return changes;
					}
				}, '$datasource']
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
						var length = 0;
						return (cb, changes) => {
							if(!changes || !changes.length) return;
							var chngs = arr_changes_to_child_changes(item_type, changes);
							//console.log('Got changes:', frozen(chngs), 'from', changes);
							chngs.forEach((one) => {
								switch(one[0]){
									case 'add':
										one[1] = String(length);
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
			var list_own_type = Object.assign(all_lists_mixin, props.self || {});
			//console.log('List looks like', list_own_type);
			return [always(list_own_type)];
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
	if(!$el) return res;
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
				if($prev_el && $el && $prev_el[0] && $el[0] && $prev_el[0] === $el[0]){
					return false;
				} else {
					return true;
				}
			},
			function($el){
				var str = '';
				if($el){
					str = $el.html();
					if(str) str = str.trim();
				}
				return str;
			}, 
			'$real_el'
		],
		'$template_writer': [
			function(real_templ, $html_template, no_auto, keys, $el){
				if(real_templ && $el){
						$el.html(real_templ);
						return true;
				}	
				if(!$html_template && $el && keys && !no_auto){
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
				var setters = new Set(['visibility', 'setval', 'hasClass', 'css']);
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
							var onChange = function(){
								var el = $(this);
								var type = el.attr('type');
								var val;
								if(type == 'checkbox'){
									val = el.prop('checked');
								} else {
									val = el.val();
								}
								//console.log('CHange', el, val, selector);
								make_resp(cb, val);
							};
							var onKeyup = function(){
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
							if($prev_el){
								$prev_el.off('keyup', selector);
								$prev_el.off('change', selector);
							}
							if($now_el){
								$now_el.on({keyup: onKeyup, change: onChange}, selector);
							}
						}
					break;
					case 'click':
						func = function(cb, vals){
							if(!vals) return;
							var [$prev_el, $now_el] = vals;
							if(!$now_el) return;
							//console.log('Assigning handlers for ', cellname, arguments, $now_el);
							if($prev_el){
								$prev_el.off('click', selector);
							}
							if($now_el.length === 0){
								//debugger;
								console.warn('Assigning handlers to nothing', $now_el);
							}
							$now_el.on('click', selector, (e) => {
								make_resp(cb, e);
								return false
							});
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
								make_resp(cb, e);
								return false
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
							if(!$el) return;
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
							$now_el.on('keyup', selector, function(e){
								if(e.keyCode == 13){
									make_resp(cb, e.target.value);
								}
							});
						}
					break;
					case 'visibility':
						func = function($el, val){
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
							if(val){
								$el.show();
							} else {
								$el.hide();
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
						if(!a) return $();
						return selector ? a.find(selector) : a;
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
var get_ozenfant_template = (cb, str, $el, context) => {
	if(!$el || !str) return;
	var template = new Ozenfant(str);
	var filtered_context = {};
	for(let k in context){
		if(context[k] instanceof Object){
			// dont write objects to html!
		} else {
			filtered_context[k] = context[k];
		}
	}
	template.render($el.get(0), filtered_context);
	cb('template', template);
	cb('bindings_search', (str) => {
		return template.bindings[str];
	})
}
var write_changes = function(change, template){
	if(!template) return;
	var [k, v] = change;
	if(unusual_cell(k)) return;
	if(v instanceof Object){
		// lol dont write objects to html!
		return;
	}
	template.set(...change);
}
var ozenfant = {
	eachHashMixin: {
		'$ozenfant_el': [(searcher, name) => {
				var res;
				if(searcher instanceof Function){
					res = searcher(name);
				}
				//console.log('counting ozenfant el', searcher, name, res);
				return res ? $(res) : false;
		}, '../$ozenfant.bindings_search', '$name'],
		'$list_el': [(name, $el, map) => {
				if(name === null || name === undefined || !map) return;
				var num = map[name];
				return get_by_selector(num, $el, true);
		}, '$name', '../$real_el', '../$list_template_writer.index_map'],
		'$real_el': ['firstTrueCb', ($el) => { return $el && $el.length }, '$el', '$list_el', '$ozenfant_el'],
		'$ozenfant': ['nested', get_ozenfant_template, ['template', 'bindings_search'], '$template', '$real_el', '-$real_values'],
		'$ozenfant_writer': [write_changes, '*', '-$ozenfant.template'],
		'$html_skeleton_changes': ['$ozenfant.template'],
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
					//console.log('outputting from che', key, val);
				},
				onSuccess: function(){
					//console.log('che scenario successfully finished', succ_cb, obj.state);
					succ_cb(obj.state);
				}
			}, ...cbs);
			var str = ['asyncClosureFunnel', () => {
				return (cb, cell, val) => {
					//console.log('something dripped', cb, cell, val);
					succ_cb = cb;
					obj.drip(cell, val);
				}
			}, ...obj.needed_events]
			return str;
		}
	}
}

Firera.loadPackage(core);
Firera.loadPackage(che_package);
Firera.packagesAvailable = {simpleHtmlTemplates, htmlCells, ozenfant, che: che_package};
//Firera.loadPackage(html);
Firera.func_test_export = {parse_pb, parse_fexpr};

module.exports = Firera;
