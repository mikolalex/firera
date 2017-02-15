var Parser = require('../Parser');
var utils = require('../utils');
var Obj = utils.Obj;
var Arr = utils.Arr;

var get_by_selector = function(name, $el, children = false){
	if(name === null) return null;
	if(name === '__root') return document.querySelector('body');
	var method = children ? 'children' : 'find';
	$el = utils.raw($el);
	if(!$el) return null;
	for(var c of $el.children){
		if(c.getAttribute('data-fr') == name){
			return c;
		}
	}
	return null;
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
		utils.arr_different(new_arr, arr, (key) => {
			// create new element
			map[key] = ++id;
			changes.push(['add', id, new_arr[key]]);
		})
		//console.log('Computing changes between new an old arrays', new_arr, arr);
		utils.arr_different(arr, new_arr, (key) => {
			// create new element
			changes.push(['remove', map[key]]);
			delete map[key];
		})
		utils.arr_common(arr, new_arr, (key) => {
			changes.push(['change', map[key], new_arr[key]]);
		})
		arr = utils.sh_copy(new_arr);
		return changes;
	}
}

module.exports = {
	cellMatchers: {
		prevValue: {
			// ^foo -> previous values of 'foo'
			name: 'PrevValue',
			regexp: new RegExp('^(\-|\:)?\\^(.*)', 'i'),
			func(matches, pool, context, packages) {
				if(context == 'setter') return;
				var cellname = matches[2];
				Parser.parse_fexpr(['closure', function(){
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
	macros: {
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
		map: (fs) => {
			var [map] = fs;
			var cells = Object.keys(map);
			var func = (cellname, val) => {
				if(!(map[cellname] instanceof Function)){
					return map[cellname];
				}
				return map[cellname](val);
			}
			return ['funnel', func, ...cells];
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
		'+': (fs) => {
			return [(a, b) => {
					return Number(a) + Number(b)
			}].concat(fs);
		},
		'-': (fs) => {
			return [(a, b) => {
					return a - b;
			}].concat(fs);
		},
		'*': (fs) => {
			return [(a, b) => {
					return a * b;
			}].concat(fs);
		},
		'/': (fs) => {
			return [(a, b) => {
					return a / b;
			}].concat(fs);
		},
		'%': (fs) => {
			return [(a, b) => {
					return a % b;
			}].concat(fs);
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
		first(funcstring) {
			return [(a) => a, ...funcstring]
		},
		second(funcstring) {
			return [(a, b) => b, ...funcstring]
		},
		firstDefined(funcstring) {
			return [function(){
					for(var i in arguments){
						if(arguments[i] !== undefined) return arguments[i];
					}
			}, ...funcstring]
		},
		firstTrue(funcstring) {
			return [function(){
					//console.log('Looking for firstTrue', arguments);
					for(var i in arguments){
						if(arguments[i]) return arguments[i];
					}
			}, ...funcstring]
		},
		valMap(funcstring) {
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
		firstTrueCb(funcstring) {
			var cb = funcstring[0];
			var fncstr = funcstring.slice(1);
			return [function(){
					//console.log('Looking for firstTrue', arguments);
					for(var i in arguments){
						if(cb(arguments[i])) return arguments[i];
					}
			}, ...fncstr]
		},
		asArray(funcstring) {
			var subscribe_to = '*/*';
			if(funcstring[0] instanceof Array){
				// its an array of fields
				var fields = funcstring[0].map((a) => '*/' + a);
				subscribe_to = ['funnel', utils.ids, ...fields];
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
						return utils.arr_fix_keys(arr);
					}
			}, subscribe_to, '$arr_data.changes']
		},
		indices(funcstring) {
			var func = funcstring[0];
			var field = '*/' + funcstring[1];
			if(!funcstring[1]){
				field = '*/' + func;
				func = utils.id;
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
		reduce(funcstring) {
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
		count(funcstring) {
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
					if(utils.path_cellname(cell) == '$arr_data.changes'){
						// finding deletion
						Obj.each(chng.filter((a) => {
							return a[0] === 'remove';
						}), (a) => {
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
		join(funcstring) {
			return ['funnel', utils.second].concat(funcstring);
		},
		list(funcstring) {
			var props = funcstring[0];
			if(!props instanceof Object){
				utils.error('List properties should be an object!');
			}
			var item_type = props.type;
			if(!props.push && !props.datasource && !props.deltas && !props.data && !funcstring[1]){
				utils.warn('No item source provided for list', funcstring);
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
							//console.log('Got changes:', utils.frozen(chngs), 'from', changes);
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
									$el.insertAdjacentHTML('beforeend', '<div data-fr="' + (++index_c) + '" data-fr-name="' + key + '"></div>');
									index_map[key] = index_c;
									// I domt know...
								break
								case 'remove':
									$el.querySelector('[data-fr="' + index_map[key] + '"]').remove();
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
						var res = Obj.map(map, (n, i) => {
							return get_by_selector(map[i], $el);
						})
						return res;
					}
				}, '$real_el', '$list_template_writer.index_map'],
				$children: ['$arr_data.changes']
			};
			if(props.push){
				all_lists_mixin.$push = props.push;
				if(!props.push instanceof Array){
					console.error('List\'s PUSH property should be a F-expression(array), given', props.push);
				}
			}
			if(props.pop){
				all_lists_mixin.$pop = props.pop;
				if(!props.pop instanceof Array){
					console.error('List\'s POP property should be a F-expression(array), given', props.pop);
				}
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
				fnc = [utils.always(list_own_type)];
			}
			return fnc;
		},
		arr_deltas(funcstring) {
			var cell = funcstring[0];
			return ['closure', function(){
				var val = [];
				return function(new_arr){
					var deltas = utils.arr_deltas(val, new_arr);
					val = new_arr;
					//console.info('deltas are', deltas);
					return deltas;
				}
			}, cell]
		}
	}
} 

