'use strict';

var Ozenfant = require('./ozenfant/ozenfant');

var always = (a) => {
	return () => a;
}
var log = console.log.bind(console);

var frozen = (a) => JSON.parse(JSON.stringify(a));

var id = (a) => a;
var ids = function(){
	return arguments;
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

Object.defineProperty(Object.prototype, 'map', {
	enumerable: false,
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
	var m = str.match(/^(\:|\-)/);
	return [{
		//':': 'change', 
		'-': 'passive', 
		'val': 'normal'
	}[m ? m[1] : 'val'], str.replace(/^(\:|\-)/, '')];
}
var get_real_cell_name = function(str){
	return cell_listening_type(str)[1];
}


var PackagePool = function(proto = {}){
	this.cellMatchers = Object.create(proto.cellMatchers || {});
	this.predicates = Object.create(proto.predicates || {});
	this.eachHashMixin = Object.create(proto.eachHashMixin || {});
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

var root_package_pool = new PackagePool();

var apps = [];
var App = function(packages){
	this.packagePool = new PackagePool(root_package_pool);
	if(packages){
		for(let pack of packages){
			this.packagePool.load(pack);
		}
	}
};
var noop = function(){
	console.log('Noop is called!');
};
App.prototype.get = function(cell, path){
	return this.root.get(cell, path);
}
App.prototype.set = function(cell, val, child){
	this.root.set(cell, val, child);
}
App.prototype.parse_cbs = function(a){
	var eachMixin = Object.assign({}, this.packagePool.eachHashMixin);
	var res = {
		plain_base: Object.assign(eachMixin, a), 
		cell_links: {},
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

var show_performance = function(){
	var res = [];
	for(var i = 1; i < arguments.length; ++i){
		res.push(i + ': ' + (arguments[i] - arguments[i - 1]).toFixed(3));
	}
	res.push('Total: ' + (arguments[i - 1] - arguments[0]).toFixed(3));
	return res.join(', ');
}

var Hash = function(app, parsed_pb_name, name, free_vals, init_later){
	////////////////////////////////////////////////////////////////////////
	var t0 = performance.now();
	////////////////////////////////////////////////////////////////////////
	this.app = app;
	this.name = name || '__root';
	var parsed_pb = typeof parsed_pb_name === 'string' 
					? app.cbs[parsed_pb_name]
					: app.parse_cbs(parsed_pb_name);
	//console.log('________________________________________________________');
	//console.log('CREATING HASH ' + parsed_pb_name, parsed_pb);
	// creating cell values obj
	this.cell_types = parsed_pb.cell_types;
	this.cell_links = parsed_pb.cell_links;
	this.side_effects = parsed_pb.side_effects;
	this.hashes_to_link = parsed_pb.hashes_to_link;
	this.plain_base = parsed_pb.plain_base;
	this.linked_hashes = {};
	// for "closure" cell type
	this.cell_funcs = {};
	this.dirtyCounter = {};
	this.dynamic_cell_links = {};
	if(parsed_pb.cell_types['*']){
		var omit_list = this.all_cell_children('*');
		for(let cell in this.cell_types){
			if(omit_list.indexOf(cell) === -1 && can_be_set_to_html(cell, this.app)){
				init_if_empty(this.dynamic_cell_links, cell, {}, '__self', []);
				this.dynamic_cell_links[cell].__self.push({
					cell_name: '*',
					type: ''
				});
			}
		}
		//console.log('Now dynamic links look like', this.dynamic_cell_links);
	}
	this.cell_values = Object.create(parsed_pb.plain_base.$init || {});
	this.hashes_to_link.each((hash_name, link_as) => this.linkChild(hash_name, link_as));
	////////////////////////////////////////////////////////////////////////
	var t1 = performance.now();
	////////////////////////////////////////////////////////////////////////
	// @todo: refactor, make this set in one step
	this.init_values = Object.assign({}, parsed_pb.plain_base.$init, free_vals || {});
	//console.log('Setting $init values', this.init_values);
	if(parsed_pb_name === '__root'){
		this.init_values.$name = '__root';
	}
	if(parsed_pb.plain_base.$init && !init_later){
		//console.log('Setting init', parsed_pb.plain_base.$init, Object.keys(this.dynamic_cell_links.completed || {}));
		this.init();
	}
	if(parsed_pb.no_args_cells){
		parsed_pb.no_args_cells.eachKey((cellname) => {
			this.doRecursive((cell, parent_cell_name) => {
				this.compute(cell, parent_cell_name);
			}, cellname)
		})
	}
	////////////////////////////////////////////////////////////////////////
	var t2 = performance.now();
	////////////////////////////////////////////////////////////////////////
	//console.log('Initings hash: ', show_performance(t0, t1, t2, t3));
}

Hash.prototype.init = function(){
	this.set(this.init_values);
}
Hash.prototype.updateChildFreeValues = function(childName, values){
	this.linked_hashes[childName].set(values);
}

Hash.prototype.linkHash = function(cellname, val){
	//console.log('RUNNING SIDE EFFECT', this, val);         
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
	this.linkChild(hash, cellname, free_vals);
	if(link1){
		//console.info('Linking by link1 hash', link1);
		link1.each((his_cell, my_cell) => {
			this.linkTwoCells(his_cell, my_cell, cellname, '..', 'val');
		})
	}
	if(link2){
		//console.info('Linking by link2 hash', link2);
		link2.each((his_cell, my_cell) => {
			this.linked_hashes[cellname].linkTwoCells(his_cell, my_cell, '..', cellname, 'val');
		})
	}
}

Hash.prototype.linkChild = function(type, link_as, free_vals){
	if(this.linked_hashes[link_as]){
		this.unlinkChild(link_as);
	}
	var child = new Hash(this.app, type, link_as, Object.assign({
		$name: link_as
	}, free_vals), true);
	this.linked_hashes[link_as] = child;
	child.linked_hashes['..'] = this;
	this.linkCells(link_as, '..');
	child.linkCells('..', link_as);
	child.init();
	//console.info('Successfully linked ', type, 'as', link_as);
}
Hash.prototype.cellExists = function(cellname){
	return this.cell_types[cellname] !== undefined;
}
Hash.prototype.unlinkChild = function(link_as){
	var child = this.linked_hashes[link_as];
	this.unlinkCells(link_as);
	child.unlinkCells('..');
	delete this.linked_hashes[link_as];
	//console.info('Successfully linked ', type, 'as', link_as);
}

Hash.prototype.linkTwoCells = function(parent_cell, child_cell, hash_name, my_name_for_that_hash, type = 'val'){
	var other_hash = this.linked_hashes[hash_name];
	var pool = other_hash.dynamic_cell_links;
	if(!other_hash.cellExists(parent_cell)){
		if(unusual_cell(parent_cell)){
			// try to init this cell in hash
			//console.log('creating cellname on the fly', parent_cell, other_hash);
			parse_cellname(parent_cell, other_hash, 'getter', this.app.packagePool);
			other_hash.cell_types = parse_cell_types(other_hash.plain_base);
		} else {
			//console.warn('Linking to unexisting cell:', parent_cell, ', trying to link to', child_cell);
		}
	}
	init_if_empty(pool, parent_cell, {});
	init_if_empty(pool[parent_cell], my_name_for_that_hash, []);
	pool[parent_cell][my_name_for_that_hash].push({
		cell_name: child_cell,
		type: type
	});
	this.set(child_cell, this.linked_hashes[hash_name].cell_value(parent_cell));
}
Hash.prototype.unlinkTwoCells = function(parent_cell, child_cell, hash_name, my_name_for_that_hash){
	var other_hash = this.linked_hashes[hash_name];
	var pool = other_hash.dynamic_cell_links;
	pool[parent_cell][my_name_for_that_hash].forEach((lnk, key) => {
		//console.log('Searching links...', lnk, child_cell);
		if(lnk.cell_name === child_cell){
			delete pool[parent_cell][my_name_for_that_hash][key];
			//console.log('Deleting', child_cell);
		}
	});
	// ? maybe this.set(child_cell, undefined);
}

Hash.prototype.linkCells = function(hash_name, my_name_for_that_hash){
	var links;
	if(links = this.cell_links[hash_name]){
		links.each((parent_cell, child_cell) => { 
			this.linkTwoCells(parent_cell, child_cell, hash_name, my_name_for_that_hash); 
		});
	}
	if(links = this.cell_links['*']){
		links.each((parent_cell, child_cell) => { 
			this.linkTwoCells(parent_cell, child_cell, hash_name, my_name_for_that_hash, 'val_and_hashname'); 
		});
	}
}
Hash.prototype.unlinkCells = function(hash_name){
	this.dynamic_cell_links.each((hashes) => {
		delete hashes[hash_name];
	})
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
	if(this.cell_type(cell) === 'async' && !run_async) {
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
	var [listening_type, real_cell_name] = cell_listening_type(cell);
	var val;
	var real_cell_types = split_camelcase(this.cell_type(real_cell_name)) || []	;

	var map = real_cell_types.indexOf('map') !== -1;
	var closure = real_cell_types.indexOf('closure') !== -1;
	var async = real_cell_types.indexOf('async') !== -1;
	var nested = real_cell_types.indexOf('nested') !== -1;
	var funnel = real_cell_types.indexOf('funnel') !== -1;

	var func;
	// getting func
	if(map){
		if(!parent_cell_name){
			throw new Error('Cannot calculate map cell value - no parent cell name provided!');
		}
		var func = this.cell_func(real_cell_name);
		if(!func[parent_cell_name]){
			throw new Error('Cannot compute MAP cell: parent cell func undefined or not function!');
		}
		func = func[parent_cell_name];
	} else if(closure){
		if(!this.cell_funcs[real_cell_name]){
			var new_func = this.cell_func(real_cell_name)();
			//console.log('Setting closure function', new_func);
			this.cell_funcs[real_cell_name] = new_func;
		}
		func = this.cell_funcs[real_cell_name];
	} else {
		func = this.cell_func(real_cell_name);//this.cell_funcs[real_cell_name];
	}
	// getting arguments
	var args = this.cell_parents(real_cell_name).map((parent_cell_name) => {
		return this.cell_value(get_real_cell_name(parent_cell_name))
	});
	if(funnel){
		if(!parent_cell_name){
			throw new Error('Cannot calculate map cell value - no parent cell name provided!');
		}
		parent_cell_name = get_real_cell_name(parent_cell_name);
		args = [parent_cell_name, this.cell_value(parent_cell_name)];
	}
	if(nested){
		args.unshift((cell, val) => {
			//console.log('NESTED callback called!', cell, val, real_cell_name); 
			var cell_to_update = real_cell_name + '.' + cell;
			this.set_cell_value(cell_to_update, val);
			this.doRecursive(this.compute.bind(this), cell_to_update, true);
		});
	} else if(async){
		args.unshift((val) => {
			//console.log('ASYNC callback called!',val); 
			this.set_cell_value(real_cell_name, val);
			this.doRecursive(this.compute.bind(this), real_cell_name, true, null, {}, true);
		});
	}
	// counting value
	if(map){
		var val = func instanceof Function 
					  ? func(this.cell_value(get_real_cell_name(parent_cell_name)))
					  : func;
	} else {
		var val = func.apply(null, args);
	}
	if(async || nested){

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
		var child = this.linked_hashes[childname];
		if(!child){
			console.warn('Cannot set - no such path', path);
			return;
		}
		var child_path = path[1] ? path.slice(1).join('/') : undefined;
		return child.get(cell, child_path);
	} else {
		return this.cell_values[cell];
	}
}

Hash.prototype.set = function(cell, val, child){
	if(child){
		// setting value for some linked child hash
		//log('Trying to set', child, cell, val);
		var path = child.split('/');
		var childname = path[0];
		var child = this.linked_hashes[childname];
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
			} else {
				//console.log('Cell ', cell, 'is not ready', this.dirtyCounter);
			}
		}));
	} else {
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
Hash.prototype.cell_children = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].children : [];
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
Hash.prototype.cell_value = function(cell){
	if(cell === '$real_keys'){
		return [...(new Set(Object.keys(this.plain_base).concat(Object.keys(this.plain_base.$init))))].filter((k) => {
			return k.match(/^(\w|\d|\_|\-)*$/);
		})
	}
	if(cell === '$real_values'){
		var res = {};
		[...(new Set(Object.keys(this.plain_base)
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
	this.cell_values[cell] = val;
	//log('Setting', cell, val, this.dynamic_cell_links[cell]);
	if(this.side_effects[cell]){
		//console.info('I SHOULD SET side-effect', val);
		side_effects[this.side_effects[cell]].func.call(this, cell, val);
		//console.log('Child', real_cell_name, 'val is', val);
	}
	//if(cell === 'text' || cell === '*') console.log('Set cell value', cell, val, this.dynamic_cell_links[cell]);
	if(this.dynamic_cell_links[cell]){
		this.dynamic_cell_links[cell].each((links, hash_name) => {
			var own = hash_name === '__self';
			var hsh = own ? this : this.linked_hashes[hash_name];
			if(hsh){
				for(var link of links){
					//console.log('Writing dynamic cell link ' + link.cell_name, link.type === 'val', this.name);
					if(link.type === 'val'){
						hsh.set(link.cell_name, val);
					} else {
						//log('Updating links', hash_name, link.cell_name, [hash_name !== '__self' ? this.name : cell, val]);
						hsh.set(link.cell_name, [own ? cell : this.name, val]);
					}
				}
			}
		})
	}
}

var system_predicates = new Set([
	'is',
	'async',
	'closure',
	'funnel',
	'map',
	'hash',
	'nested'
]);
var side_effects = {
	'child': {
		func: function(cellname, val){
			this.linkHash(cellname, val);
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
}
var set_listening_type = function(cell, type){
	return {
		//'change': ':', 
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

var parse_cellname = function(cellname, pool, context, packages){
	if(cellname.indexOf('/') !== -1){
		// it's a path - link to other hashes
		var path = cellname.split('/');
		init_if_empty(pool.cell_links, path[0], {});
		pool.cell_links[path[0]][cellname] = path.slice(1).join('/');
		return;
	}
	var real_cellname = get_real_cell_name(cellname);
	for(var n in side_effects){
		var m = side_effects[n];
		var matches = real_cellname.match(m.regexp);
		if(matches){
			//console.info('Cell', cellname, 'matches regexp', m.regexp, pool);
			init_if_empty(pool, 'side_effects', {}, cellname, []);
			pool.side_effects[cellname].push(n);
		}
	}
	//console.log('looking for matches', packages);
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

var parse_fexpr = function(a, pool, key, packages){
	var funcstring;
	if(typeof a === 'string'){
		// just link to other cell
		a = [id, a];
	}
	if(a instanceof Object){
		if(a instanceof Array){
			a = a.slice();
			var funcname = a[0];
			var cc = split_camelcase(funcname);
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
					default:
						funcstring = a; 
					break;
				}
			} else {
				if(funcname === 'just'){
					init_if_empty(pool.plain_base, '$init', {});
					pool.plain_base.$init[key] = a[1];
					return;
				} 
				if(predefined_functions[funcname]){
					var fnc = predefined_functions[funcname];
					switch(fnc.type){
						case 'func':
							funcstring = ['is', fnc.func].concat(a.slice(1))
						break;
					}
				} else {
					//console.log('Having predicates', predicates, funcname, pool);
					if(packages.predicates[funcname]){
						funcstring = packages.predicates[funcname](a.slice(1));
						//console.log('Using package predicate', funcstring, key);
						return parse_fexpr(funcstring, pool, key, packages);
					} else {
						//console.log('Error', arguments, funcname instanceof Function);
						throw new Error('Cannot find predicate: ' + funcname);
					}
				}
			}
		} else {
			funcstring = ['map', a].concat(Object.keys(a));
			//console.log('Parsing MAP fexpr', a, ' -> ', funcstring);
		}
	} else {
		throw new Error('Cannot parse primitive value as fexpr: ' + a);
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

var get_cell_type = function(type, func, parents){
	//console.log('getting cell type', arguments);
	return {type, func, parents: parents || [], children: []}
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
			cell_types[j] = get_cell_type(type);
		}
		//console.log('now cell_types j looks like', cell_types);
		return;
	}
	if(!(row instanceof Array)){
		console.log('pbsi', pbs, i, row);
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
	cell_types[i] = get_cell_type(type, func, parents);
	//console.log('Cell', i, 'parent', parents);
	for(var j in parents){
		var [listening_type, parent_cell_name] = cell_listening_type(parents[j]);
		//console.log('real cell name:', parents[j], '->', parent_cell_name, listening_type);
		if(listening_type !== 'passive'){
			init_if_empty(children, parent_cell_name, {});
			children[parent_cell_name][set_listening_type(i, listening_type)] = true;
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
	//console.log('Got following children after parsing', children, cell_types);
	for(let i in children){
		//console.log('resi', res, i);
		if(!cell_types[i]){
			cell_types[i] = get_cell_type('free');
		}
		cell_types[i].children = children[i];
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
						//console.log('Child', link_as, hash_type);
						parse_fexpr(hash_type, res, key, packages);
					} else {
						res.hashes_to_link[link_as] = hash_type;
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


var Firera = function(config){
	var start = performance.now();
	var app = get_app(config.__packages);
	// getting real pbs
	app.cbs = config.map(app.parse_cbs.bind(app), {except: ['__packages']});
	// now we should instantiate each pb
	if(!app.cbs.__root){
		// no root hash
		throw new Error('Cant find root app!', packages);
	}
	//console.log(app);
	var compilation_finished = performance.now();
	app.root = new Hash(app, '__root');
	var init_finished = performance.now();
	if(1 < 0){
		console.info('App run', packages.root
			//, 'it took ' + (compilation_finished - start).toFixed(3) + '/' + (init_finished - compilation_finished).toFixed(3) + ' milliseconds.'
		);
	}
	return app;
};
Firera.apps = apps;
Firera.run = Firera,
Firera.loadPackage = function(pack) {
	root_package_pool.load(pack);
}

var arr_diff = function(a, b){
	var diff = [];
	for(var i in a){
		if(!b[i]) diff.push(i);
	}
	return diff;
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
									arr.splice(index, 1);
								}
							}
						} else {
							if(values){
								let [fieldname, val] = values;
								fieldname = fieldname.replace("*/", "");
								if(val){
									arr[val[0]][fieldname] = val[1];
								}
							}
						}
						return arr;
					}
			}, subscribe_to, '$arr_data.changes']
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
			return ['closureFunnel', () => {
				var count = 0;
				var vals = {};
				return (cell, chng) => {
					if(cell == '$arr_data.changes'){
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
						return count;;
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
			}, '*/' + funcstring[0], '$arr_data.changes']
		},
		list: function(funcstring){
			var item_type = funcstring.shift();
			//var deltas = restruct_list_sources(funcstring[0]);
			var mix_to_list = funcstring[0] || {};
			//console.log('Deltas', deltas);
			if(typeof mix_to_list === 'string'){
				// it's datasource
				mix_to_list = {$datasource: mix_to_list};
			}
			if(!mix_to_list.$add && !mix_to_list.$datasource){
				console.warn('No item source provided for list', mix_to_list);
			}
			var deltas_func = mix_to_list.$add ? {
				$add: (val) => {
					if(val){
						return [['add', null, val]];
					}
				},
				$remove: (key) => {
					if(key !== undefined){
						return [['remove', key]];
					}
				}
			} : ['closure', () => {
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
			}, '$datasource'];
			var all_lists_mixin = {
				$deltas: deltas_func,
				$init: {
					$template: "<div>Ololo</div>"
				},
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
				$list_template_writer: [function(deltas, $el){
					//console.log('Delta come', deltas, $el);
					if(!$el) return;
					for(var i in deltas){
						var type = deltas[i][0];
						var key = deltas[i][1];
						switch(type){
							case 'add':
								$el.prepend('<div data-fr="' + key + '"></div>');
								// I domt know...
							break
							case 'remove':
								$el.children('[data-fr=' + key + ']').remove();
							break
						}
					}
				}, '$arr_data.changes', '$real_el'],
				$children: '$arr_data.changes'
			};
			return [always([Object.assign(mix_to_list, all_lists_mixin)])];
		},
		arr_deltas: function(funcstring){
			var cell = funcstring[0];
			return ['closure', function(){
				var val = [];
				return function(new_arr){
					var new_ones = arr_diff(new_arr, val);
					var remove_ones = arr_diff(val, new_arr);
					var changed_ones = new_arr.mapFilter((v, k) => {
						if(val[k] !== v && val[k] !== undefined){
							 return k;
						}
					})
					//console.log('CHANGED ONES', changed_ones);
					val = new_arr;
					var deltas = [].concat(
						 new_ones.map((key) => ['add', key, new_arr[key]]),
						 remove_ones.map((key) => ['remove', key]),
						 changed_ones.map((key) => ['change', key, new_arr[key]])
					)
					//console.info('deltas are', deltas);
					return deltas;
				}
			}, cell]
		}
	}
}


var get_by_selector = function(name, $el){
	if(name === null) return null;
	if(name === '__root') return $('body');
	var res=$el 
			? $el.find('[data-fr=' + name + ']')
			: null;
	//console.info("GBS", res ? res.length : null, $el ? $el.html() : '');
	return res;''
}
var search_fr_bindings = function($el){
	var res = {};
	if(!$el) return res;
	$el.find('[data-fr]').each(function(){
		var name = $(this).attr('data-fr');
		res[name] = $(this);
	})
	//console.log('Found HTML bindings', res);
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
		'$el': [get_by_selector, '$name', '../$real_el'],
		'$real_el': ['firstDefined', '$el'],
		'$html_template': [function($el){
			var str = '';
			if($el){
				str = $el.html();
				if(str) str = str.trim();
			}
			return str;
		}, '$real_el'],
		'$template_writer': [
			function(real_templ, $html_template, keys, $el){
				//console.log('Writing template', arguments);
				if(real_templ && $el){
						$el.html(real_templ);
						return;
				}	
				if(!$html_template && $el && keys){
					var auto_template = keys.map((k) => {
						return '<div>' + k + ':<div data-fr="' + k + '"></div></div>';
					}).join(' ');
					//console.info('generating auto template', auto_template);
					$el.html(auto_template);
				}
			}, '$template', '$html_template', '-$real_keys', '-$real_el'
		],
		'$htmlbindings': [search_fr_bindings, '-$real_el', '$template_writer'],
		'$writer': ['closureFunnel', write_changes, '$htmlbindings', '*']
	}
}
var htmlCells = {
	cellMatchers: {
		HTMLAspects: {
			// ^foo -> previous values of 'foo'
			name: 'HTMLAspects',
			regexp: new RegExp('^(\-|\:)?([^\|]*)\\|(.*)', 'i'),
			func: function(matches, pool, context, packages){
				var cellname = matches[0];
				var aspect = matches[3];
				var selector = matches[2];
				var func;
				var setters = ['visibility', 'setval'];
				setters.has = function(str){
					return this.indexOf(str) !== -1;
				}

				var params = aspect.match(/([^\(]*)\(([^\)]*)\)/);
				if(params && params[1]){
					aspect = params[1];
					params = params[2].split(',');
				}                    
				//console.info('Aspect:', aspect, setters.has(aspect), context);
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
								cb(val);
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
								cb(val);
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
							var [$prev_el, $now_el] = vals;
							if(!$now_el) return;
							//console.log('Assigning handlers for ', cellname, arguments, $now_el);
							if($prev_el){
								$prev_el.off('click', selector);
							}
							$now_el.on('click', selector, (e) => {cb(e); return false});
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
									cb(e);
								}
							});
						}
					break;
					case 'visibility':
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
						debugger;
						throw new Error('unknown HTML aspect: ' + aspect);
					break;
				}
				if(context === 'setter'){
					parse_fexpr(['is', func, [(a) => a.find(selector), '$real_el'], cellname], pool, get_random_name(), packages);
				} else {
					parse_fexpr(['async', func, '^$real_el'], pool, cellname, packages);
				}
			}
		}
	}
}
var get_ozenfant_template = (cb, str, $el, context) => {
	if(!$el || !str) return;
	var template = new Ozenfant(str);
	template.render($el.get(0), context);
	cb('template', template);
	cb('bindings_search', (str) => {
		return template.bindings[str];
	})
}
var write_changes = function(change, template){
	if(!template) return;
	var [k, v] = change;
	if(unusual_cell(k)) return;
	template.set(...change);
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
		'$list_el': [get_by_selector, '$name', '../$real_el', '../$list_template_writer'],
		'$real_el': ['firstTrueCb', ($el) => { return $el && $el.length }, '$el', '$list_el', '$ozenfant_el'],
		'$ozenfant': ['nested', get_ozenfant_template, ['template', 'bindings_search'], '$template', '$real_el', '-$real_values'],
		'$ozenfant_writer': [write_changes, '*', '-$ozenfant.template']
	}
}


Firera.loadPackage(core);
Firera.packagesAvailable = {simpleHtmlTemplates, htmlCells, ozenfant};
//Firera.loadPackage(html);
Firera.func_test_export = {parse_pb, parse_fexpr};

module.exports = Firera;