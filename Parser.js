import utils from './utils';
const Obj = utils.Obj;
const Arr = utils.Arr;

const system_macros = new Set([
	'is',
	'async',
	'closure',
	'funnel',
	'dynamic',
	'nested'
]);

const get_random_name = (function(){
	// temp solution for Symbol
	var c = 1;
	return function(){
		return '@@@_' + (++c);
	}
})()

const err = (text) => {
	utils.error(text);
}

const predefined_functions = {
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

const real_cell_name = (str) => str.replace(/^(\:|\-|\=|\~)/, '');

const findMatcher = (cellname, packages) => {
	for(let n in packages.cellMatchers){
		const m = packages.cellMatchers[n];
		const matches = cellname.match(m.regexp);
		if(matches){
			return [m, matches];
		}
	}
}


const cell_listening_type = function(str){
	if(!str.match) debugger;
	const m = str.match(/^(\:|\-|\=)/);
	return [{
		//':': 'change', 
		'=': 'skip_same',
		'-': 'passive', 
		'val': 'normal'
	}[m ? m[1] : 'val'], str.replace(/^(\:|\-|\=)/, '')];
}

const get_cell_type = function(cellname, type, func, parents, additional_type){
	//console.log('getting cell type', arguments);
	const real_cell_types = utils.split_camelcase(type) || [];

	const closure = real_cell_types.indexOf('closure') !== -1;
	const async = real_cell_types.indexOf('async') !== -1;
	const nested = real_cell_types.indexOf('nested') !== -1;
	const funnel = real_cell_types.indexOf('funnel') !== -1;
	const dynamic = real_cell_types.indexOf('dynamic') !== -1;
	if((async && nested) || (dynamic && nested)){
		err('Incompatible cell types: ' + real_cell_types.join(', '));
	}
	return {
		type,
		additional_type,
		func, 
		props: {closure, async, nested, funnel, dynamic}, 
		real_cell_name: cellname.replace(/^(\:|\-)/, ''),
		parents: parents || [], 
		arg_num: parents ? parents.length : 0,
		children: []
	}
}


const parse_cell_type = (i, row, pool, children) => {
	var additional_type;
	if(i !== get_real_cell_name(i)){
		additional_type = i[0];
		i = get_real_cell_name(i);
	}
	const cell_types = pool;
	let type = 'free';
	if(i === '$children'){
		return;
	}
	if(i === '$init'){
		for(let j in row){
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
	const parents = row.slice(1);
	if(func instanceof Function){
		// regular sync cell
		type = 'is';
	} else {
		// may be 'async', 'changes' or something else
		type = func;
		func = parents.shift();
	}
	cell_types[i] = get_cell_type(i, type, func, parents, additional_type);
	for(let j in parents){
		var [listening_type, parent_cell_name] = cell_listening_type(parents[j]);
		if(listening_type !== 'passive'){
			utils.init_if_empty(children, parent_cell_name, {});
			children[parent_cell_name][i] = true;
		} else {
			//console.info('Omit setting', i, 'as child for', parent_cell_name, ' - its passive!');
		}
	}
};

const parse_cell_types = function(pbs){
	const cell_types = {};
	const children = {};
	//console.log('PBS', pbs);
	const already = {};
	for(let i in pbs){
		let rc = get_real_cell_name(i);
		if(already[rc]) continue;
		parse_cell_type(i, pbs[i], cell_types, children);
		already[rc] = true;
	}
	for(let cellname in children){
		if(!cell_types[cellname]){
			const r_type = utils.is_special(cellname) ? 'free' : 'fake';
			cell_types[cellname] = get_cell_type(cellname, r_type);
		} 
		cell_types[cellname].children = children[cellname];
	}
	//console.log('Parsed cell types', cell_types);
	return cell_types;
}

const parse_arr_funcstring = (a, key, pool, packages) => {
	var funcstring;
	a = a.slice();
	var funcname = a[0];
	if(packages.macros.hasOwnProperty(funcname)){
		a = packages.macros[funcname](a.slice(1));
		funcname = a[0];
		a = a.slice();
	}
	if(!funcname) {
		console.error('wrong func:', funcname);
	}
	const cc = utils.split_camelcase(funcname);
	if(a.length === 1 && (typeof a[0] === 'string')){
		funcstring = ['is', utils.id, a[0]];
	} else {
		if(funcname instanceof Function){
			// it's "is" be default
			funcstring = ['is'].concat(a);
		} else if(system_macros.has(cc[0])){
			switch(funcname){
				case 'nested':
					const dependent_cells = a[2].map((cellname) => (key + '.' + cellname));
					utils.init_if_empty(pool.plain_base, '$init', {});
					Obj.each(dependent_cells, (name) => {
						pool.plain_base.$init[name] = null;
					})
					a.splice(2, 1);
					funcstring = a; 
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
					const fnc = predefined_functions[funcname];
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

const side_effects = {
	'child': {
		func: function(cellname, val, type){
			if(val){
				this.linkGrid(cellname, val);
			}
			if(val === false) {
				const link_as = cellname.replace('$child_', '');
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
				const [type, key, gridname, free_vals] = deltas[k];
				switch(type){
					case 'remove':
						this.unlinkChild(key);
					break;
					case 'add':
						this.linkGrid(key, [gridname, null, null, free_vals]);
					break;
					case 'change':
						this.updateChildFreeValues(key, free_vals, true);
					break;
					default:
						throw new Error('Unknown action: ' + type);
					break;
				}
			})
		}
	}
};

const get_real_cell_name = function(str){
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

const parse_cellname = function(cellname, pool, context, packages, isDynamic){
	if(cellname.indexOf('/') !== -1){
		//console.log('Found cellname', cellname);
		// it's a path - link to other grids
		const path = cellname.split('/');
		//console.log('Found', cellname, 'in', pool);
		if(!pool.initLinkChain){
			utils.init_if_empty(pool, 'link_chains', {}, cellname, path);
		} else {
			pool.initLinkChain(cellname);
		}
		return;
	}
	const real_cellname = get_real_cell_name(cellname);
	for(let n in side_effects){
		const m = side_effects[n];
		const matches = real_cellname.match(m.regexp);
		if(matches){
			utils.init_if_empty(pool, 'side_effects', {}, cellname, []);
			if(pool.side_effects[cellname].indexOf(n) === -1){
				pool.side_effects[cellname].push(n);
			}
		}
	}
	const matched = findMatcher(real_cellname, packages);
	if(matched){
		matched[0].func(matched[1], pool, context, packages);
	}
}

const parse_pb = function(res, packages){
	for(let key in res.plain_base) {
		if(key === '$init'){
			continue;
		}
		if(key === '$children'){
			const value = res.plain_base.$children;
			if(value instanceof Array || typeof value === 'string'){
				// its dynamic children
				parse_fexpr(value, res, '$all_children', packages);
			} else {
				Obj.each(value, (grid_type, link_as) => {
					if(grid_type instanceof Array){
						key = '$child_' + link_as;
						//console.log('Child', grid_type, link_as, key);
						parse_fexpr(grid_type, res, key, packages);
					} else {
						if(typeof grid_type === 'string'){
							res.grids_to_link[link_as] = grid_type;
						} else if(!grid_type.add && !grid_type.remove){
							res.grids_to_link[link_as] = grid_type.type;
						} else {
							// console.log('Adding cells for managing dynamic grid', grid_type);
							const obj = {};
							if(grid_type.add){
								obj[grid_type.add] = function(){
									return {type: grid_type.type, action: 'add'};
								}
							}
							if(grid_type.remove){
								obj[grid_type.remove] = function(){
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

const parse_fexpr = function(a, pool, key, packages){
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
		const cellname = funcstring[k];
		switch(typeof(cellname)){
			case 'string':
				parse_cellname(cellname, pool, null, packages);
			break;
			case 'object':
				if(cellname instanceof Array){
					const some_key = get_random_name();
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
const parse_fexpr2 = function(pool, packages, key, a){
	return parse_fexpr(a, pool, key, packages);
}

const App = {};
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