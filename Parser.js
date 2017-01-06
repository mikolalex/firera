var utils = require('./utils');
var Obj = utils.Obj;
var Arr = utils.Arr;

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

var get_random_name = (function(){
	// temp solution for Symbol
	var c = 1;
	return function(){
		return 'ololo123321@@@_' + (++c);
	}
})()

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

var real_cell_name = (str) => str.replace(/^(\:|\-|\=|\~)/, '');

var findMatcher = (cellname, packages) => {
	for(var n in packages.cellMatchers){
		var m = packages.cellMatchers[n];
		var matches = cellname.match(m.regexp);
		if(matches){
			return [m, matches];
		}
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

var get_cell_type = function(cellname, type, func, parents, additional_type){
	//console.log('getting cell type', arguments);
	var real_cell_types = utils.split_camelcase(type) || [];

	var map = real_cell_types.indexOf('map') !== -1;
	var closure = real_cell_types.indexOf('closure') !== -1;
	var async = real_cell_types.indexOf('async') !== -1;
	var nested = real_cell_types.indexOf('nested') !== -1;
	var funnel = real_cell_types.indexOf('funnel') !== -1;
	var dynamic = real_cell_types.indexOf('dynamic') !== -1;
	return {
		type,
		additional_type,
		func, 
		props: {map, closure, async, nested, funnel, dynamic}, 
		real_cell_name: cellname.replace(/^(\:|\-)/, ''),
		parents: parents || [], 
		arg_num: parents ? parents.length : 0,
		children: []
	}
}


var parse_cell_type = (i, row, pool, children) => {
	var additional_type;
	if(i !== get_real_cell_name(i)){
		additional_type = i[0];
		i = get_real_cell_name(i);
	}
	var cell_types = pool;
	let type = 'free';
	if(i === '$children'){
		return;
	}
	if(i === '$init'){
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
	cell_types[i] = get_cell_type(i, type, func, parents, additional_type);
	for(var j in parents){
		var [listening_type, parent_cell_name] = cell_listening_type(parents[j]);
		if(listening_type !== 'passive'){
			utils.init_if_empty(children, parent_cell_name, {});
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
	var already = {};
	for(let i in pbs){
		let rc = get_real_cell_name(i);
		if(already[rc]) continue;
		parse_cell_type(i, pbs[i], cell_types, children);
		already[rc] = true;
	}
	for(let cellname in children){
		if(!cell_types[cellname]){
			var r_type = utils.is_special(cellname) ? 'free' : 'fake';
			cell_types[cellname] = get_cell_type(cellname, r_type);
		} 
		cell_types[cellname].children = children[cellname];
	}
	//console.log('Parsed cell types', cell_types);
	return cell_types;
}

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
	var cc = utils.split_camelcase(funcname);
	if(a.length === 1 && (typeof a[0] === 'string')){
		funcstring = ['is', utils.id, a[0]];
	} else {
		if(funcname instanceof Function){
			// it's "is" be default
			funcstring = ['is'].concat(a);
		} else if(system_predicates.has(cc[0])){
			switch(funcname){
				case 'nested':
					var dependent_cells = a[2].map((cellname) => (key + '.' + cellname));
					utils.init_if_empty(pool.plain_base, '$init', {});
					Obj.each(dependent_cells, (name) => {
						pool.plain_base.$init[name] = null;
					})
					a.splice(2, 1);
					funcstring = a; 
				break;
				case 'map':
					funcstring = ['map', a[1]].concat(Object.keys(a[1]));
					if(a[2]){
						// default value
						utils.init_if_empty(pool.plain_base, '$init', {});
						pool.plain_base.$init[key] = a[2];
					}
				break;
				default:
					funcstring = a; 
				break;
			}
		} else {
			if(funcname === 'just'){
				utils.init_if_empty(pool.plain_base, '$init', {});
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
			if(!deltas || !(deltas instanceof Object)){
				return;
			}
			Obj.eachKey(deltas, (k) => {
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

var get_real_cell_name = function(str){
	return(str[0] === '-' 
		   ? 
				str.slice(1) 
		   : 
				(str[0] === '=' 
				? 
					str.slice(1) 
				: 
					(str[0] === '~' 
					? 
					   str.slice(1) 
					: 
					   str)));
}

var parse_cellname = function(cellname, pool, context, packages, isDynamic){
	if(cellname.indexOf('/') !== -1){
		//console.log('Found cellname', cellname);
		// it's a path - link to other hashes
		var path = cellname.split('/');
		//console.log('Found', cellname, 'in', pool);
		if(!pool.initLinkChain){
			utils.init_if_empty(pool, 'link_chains', {}, cellname, path);
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
			utils.init_if_empty(pool, 'side_effects', {}, cellname, []);
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
				Obj.each(value, (hash_type, link_as) => {
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

var parse_fexpr = function(a, pool, key, packages){
	var funcstring;
	key = get_real_cell_name(key);
	if(a instanceof Array){
		funcstring = parse_arr_funcstring(a, key, pool, packages);
		if(funcstring === undefined) return;
	} else {
		// it's primitive value
		utils.init_if_empty(pool.plain_base, '$init', {});
		parse_cellname(key, pool, 'setter', packages);
		pool.plain_base.$init[key] = a;
		return;
	}
	if(!funcstring[2]){
		// function with no dependancy
		utils.init_if_empty(pool, 'no_args_cells', {}, key, true);
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
App.system_predicates = system_predicates; 
module.exports = App;