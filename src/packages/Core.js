import Parser from '../Parser';
import utils from '../utils';
const Obj = utils.Obj;
const Arr = utils.Arr;

const get_by_selector = function (name, $el, children = false) {
	if (name === null)
		return null;
	if (name === '$root')
		return document.querySelector('body');
	$el = utils.raw($el);
	if (!$el)
		return null;
	for (let c of $el.children) {
		if (c.getAttribute('data-fr') == name) {
			return c;
		}
	}
	return null;
}

const arr_changes_to_child_changes = function (item_hash, arr_change) {
	//console.log('beyond the reals of death', item_hash, arr_change);
	if (!arr_change) {
		return;
	}
	return arr_change.map((val, key) => {
		const new_val = val.slice();
		new_val[3] = new_val[2];
		new_val[2] = item_hash;
		return new_val;
	});
}

const get_arr_changes = () => {
	var arr = [];
	var id = -1;
	const map = {};
	return (new_arr) => {
		const changes = [];
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
			func(matches, context) {
				if (context == 'setter')
					return;
				const cellname = matches[2];
				return {
					['^' + cellname]: ['closure', function () {
						var val;
						//console.log('Returning closure func!');
						return function (a) {
							//console.log('getting prev val');
							const old_val = val;
							val = a;
							return [old_val, a];
						}
					}, cellname]
				};
			}
		},
		popstate: {
			// ^foo -> previous values of 'foo'
			name: 'popstate',
			regexp: new RegExp('^history\.popstate$', 'i'),
			func(matches, context) {
				if (context == 'setter') {
					return;
				}
				const cellname = matches[0];
				return {
					[cellname]: ['async', function (cb) {
						window.onpopstate = cb;
					}, '$start']
				};
			}
		}
	},
	macros: {
		interval: (fs) => {
			const [interval_ms, flag] = fs;
			if (flag) {
				return ['asyncClosure', () => {
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
						}
					}, flag]
			} else {
				return ['asyncClosure', () => {
						return function (cb) {
							setInterval(cb, interval_ms);
						}
					}]
			}
		},
		asMap: (fs) => {
			return ['closureFunnel', () => {
					var map = {};
					return (cell, val) => {
						map[cell] = val;
						return map;
					}
				}, ...fs];
		},
		toggle: (fs) => {
			const [cell, def] = fs;
			return ['closure', (init_val) => {
					var now = def !== undefined ? def : init_val;
					return function () {
						if (now) {
							now = false
						} else {
							now = true;
						}
						return now;
					}
				}, cell];
		},
		promise: (fs) => {
			const [func, ...args] = fs;
			return ['async', (cb, ...inner_args) => {
					func.apply(null, inner_args).then(cb);
				}, ...args];
		},
		skipIf: (fs) => {
			const [compare_func, func, ...args] = fs;
			return ['asyncClosure', () => {
					var prev = [];
					return function (cb, ...inner_args) {
						if (compare_func(prev, inner_args)) {
							const res = func.apply(null, inner_args);
							prev = inner_args;
							cb(res);
						}
					}
				}, ...args];
		},
		skipN: (fs) => {
			var n = fs[0];
			fs = fs.slice(1);
			return ['closure', () => {
					var c = 0;
					return (val) => {
						if (++c <= n) {
							return Firera.skip;
						} else {
							return val;
						}
					}
				}, ...fs];
		},
		transist: (fs) => {
			var func;
			if (fs[0] instanceof Function) {
				func = fs.shift();
			}
			return [(cellA, cellB) => {
					if (Firera.is_def(cellA) && cellA) {
						return func ? func(cellB) : cellB;
					} else {
						return Firera.skip;
					}
				}].concat(fs);
		},
		relay: (fs) => {
			var func;
			if (fs[0] instanceof Function) {
				func = fs.shift();
			}
			return [(cellA, cellB) => {
					if (Firera.is_def(cellA) && cellA) {
						return func ? func(cellB) : cellB;
					} else {
						return Firera.skip;
					}
				}].concat(fs);
		},
		map: (fs) => {
			const [map] = fs;
			const cells = Object.keys(map);
			const func = (cellname, val) => {
				if (!(map[cellname] instanceof Function)) {
					return map[cellname];
				}
				return map[cellname](val);
			}
			return ['funnel', func, ...cells];
		},
		mapPrev: (fs) => {
			const [map, def_value] = fs;
			const cells = Object.keys(map);
			const func = (init_val) => {
				var prev = def_value === undefined ? init_val : def_value;
				return (cellname, val) => {
					if (!(map[cellname] instanceof Function)) {
						prev = map[cellname];
					} else {
						prev = map[cellname](val, prev);
					}
					return prev;
				}
			}
			return ['closureFunnel', func, ...cells];
		},
		arr: (fs) => {
			const [config] = fs;
			const args = [];
			if (config.push) {
				args.push(config.push);
			}
			if (config.pop) {
				args.push(config.pop);
			}
			var st = ['closureFunnel', (init_val) => {
					var arr = init_val || [];
					return (cell, val) => {
						if (cell === config.push) {
							arr.push(val);
						}
						if (cell === config.pop) {
							arr.splice(val, 1);
						}
						return arr;
					};
				}, ...args];
			return st;
		},
		toArrDeltas: (fs) => {
			const [config] = fs;
			const args = [];
			if (config.push) {
				args.push(config.push);
			}
			if (config.pop) {
				args.push(config.pop);
			}
			var st = ['funnel', (cell, val) => {
					const deltas = [];
					if (cell === config.push) {
						deltas.push(['add', null, val]);
					}
					if (cell === config.pop) {
						deltas.push(['remove', val]);
					}
					return deltas;
				}, ...args];
			return st;
		},
		transistAll: (fs) => {
			//const [func, ...rest] = fs;
			var func;
			if (fs[0] instanceof Function) {
				func = fs.shift();
			}
			return [(cellA, ...restArgs) => {
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
		relayAll: (fs) => {
			//const [func, ...rest] = fs;
			var func;
			if (fs[0] instanceof Function) {
				func = fs.shift();
			}
			return [(cellA, ...restArgs) => {
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
		'changed': ([cellname]) => {
			return ['closure', () => {
					var val;
					return (vl) => {
						if (vl !== val) {
							val = vl;
							return true;
						} else {
							return Firera.skip;
						}
					}
				}, cellname]
		},
		nextTick: (fs) => {
			var func = a => a;
			if (fs[0] instanceof Function) {
				func = fs[0];
				fs = fs.slice(1);
			}
			return ['async', (cb, val) => {
					setTimeout(() => {
						cb(func(val));
					}, 1);
				}, ...fs];
		},
		'&&': (fs) => {
			return [(cellA, cellB) => {
					return !Firera.is_falsy(cellA) && !Firera.is_falsy(cellB);
				}].concat(fs);
		},
		'||': (fs) => {
			return [(cellA, cellB) => {
					return !Firera.is_falsy(cellA) || !Firera.is_falsy(cellB);
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
					const arr = [];
					return (a) => {
						arr.push(a);
						return arr;
					}
				}, funcstring[0]];
		},
		first(funcstring) {
			return [(a) => a, ...funcstring]
		},
		join(funcstring) {
			return [(cell, val) => val, ...funcstring]
		},
		second(funcstring) {
			return [(a, b) => b, ...funcstring]
		},
		firstDefined(funcstring) {
			return [function () {
					for (let i in arguments) {
						if (arguments[i] !== undefined)
							return arguments[i];
					}
				}, ...funcstring]
		},
		firstTrue(funcstring) {
			return [function () {
					//console.log('Looking for firstTrue', arguments);
					for (let i in arguments) {
						if (arguments[i])
							return arguments[i];
					}
				}, ...funcstring]
		},
		valMap(funcstring) {
			var valMap;
			if (funcstring[0] instanceof Object && !(funcstring[0] instanceof Array)) {
				valMap = funstring.shift();
			} else {
				// true/false by default
				valMap = {};
				valMap[funcstring[0]] = true;
				valMap[funcstring[1]] = false;
			}
			const func = (cell, val) => {
				return valMap[cell];
			}
			return ['funnel', func, ...funcstring];
		},
		firstTrueCb(funcstring) {
			const cb = funcstring[0];
			const fncstr = funcstring.slice(1);
			return [function () {
					//console.log('Looking for firstTrue', arguments);
					for (let i in arguments) {
						if (cb(arguments[i]))
							return arguments[i];
					}
				}, ...fncstr]
		},
		asArray(funcstring) {
			var list_name = '';
			if (funcstring[1] || (!funcstring[0] instanceof Array)) {
				list_name = funcstring[0] + '/';
				funcstring = funcstring.slice(1);
			}
			var subscribe_to = list_name + '*/*';
			if (funcstring[0] instanceof Array) {
				// its an array of fields
				var fields = funcstring[0].map((a) => list_name + '*/' + a);
				subscribe_to = ['funnel', utils.ids, ...fields];
			}
			return ['closureFunnel', () => {
					var arr = [];
					//console.log('Returning closure');
					return (cell, values) => {
						if (cell === list_name + '$arr_data.changes') {
							for (let i in values) {
								const [type, index, _, val] = values[i];
								if (type === 'add') {
									const added_obj = {};
									for (let fieldname of fields) {
										fieldname = fieldname.replace(list_name + "*/", "");
										added_obj[fieldname] = val[fieldname];
									}
									arr[index] = added_obj;
								} else if (type === 'remove') {
									delete arr[index];
									//arr.splice(index, 1);
								}
							}
						} else {
							if (values) {
								let [fieldname, val] = values;
								if (!fieldname.replace)
									debugger;
								fieldname = fieldname.replace(list_name + "*/", "");
								if (val && arr[val[0]]) {
									//console.log('?', val, arr, fieldname, arr[val[0]]);
									arr[val[0]][fieldname] = val[1];
								}
							}
						}
						const fixed_array = utils.arr_fix_keys(arr);
						return fixed_array;
					}
				}, subscribe_to, list_name + '$arr_data.changes']
		},
		indices(funcstring) {
			var func = funcstring[0];
			var field = '*/' + funcstring[1];
			if (!funcstring[1]) {
				field = '*/' + func;
				func = utils.id;
			}
			return ['closureFunnel', () => {
					const indices = new Set();
					return (fieldname, vl) => {
						if (field === fieldname) {
							const [index, val] = vl;
							const res = func(val);
							if (res) {
								indices.add(index);
							} else {
								indices.delete(index);
							}
						} else {
							if (!vl)
								return indices;
							for (let [change_type, index] of vl) {
								if (change_type === 'remove') {
									indices.delete(index);
								}
							}
						}
						return indices;
					}
				}, field, '$arr_data.changes'];
		},
		reduce(funcstring) {
			const field = '*/' + funcstring[0];
			const config = funcstring[1];
			var res = config.def;
			const vals = {};
			return ['closureFunnel', () => {
					return (cell, chng) => {
						var key, val;
						if (cell === '$arr_data.changes') {
							if (chng instanceof Array) {
								for (let i in chng) {
									if (!chng[i] instanceof Array)
										return;
									const type = chng[i][0];
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
			var fnc = funcstring[1] ? funcstring[1] : utils.id;
			const pieces = fieldname.split('/');
			fieldname = pieces.pop();
			const prefix = pieces.length ? pieces.join('/') + '/' : '';
			if (fieldname === '*') {
				// just count all
				return [prefix + '$arr_data.length'];
			}
			return ['closureFunnel', () => {
					var count = 0;
					const vals = {};
					return (cell, chng) => {
						if (utils.path_cellname(cell) == '$arr_data.changes') {
							// finding deletion
							Obj.each(chng.filter((a) => {
								return a[0] === 'remove';
							}), (a) => {
								if (vals[a[1]]) {
									//console.log('Removing one');
									count--;
								}
								delete vals[a[1]];
							})
							return count;
						}
						if (!chng)
							return count;
						var [key, val] = chng;
						val = fnc(val);
						const prev_val = vals[key];
						if (prev_val === undefined) {
							if (val)
								count++
						} else {
							if (prev_val !== val) {
								if (val) {
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
			var f = utils.second;
			if (funcstring[0] instanceof Function) {
				var new_f = funcstring[0];
				f = (a, b) => {
					return new_f(b);
				}
				funcstring = funcstring.slice(1);
			}
			return ['funnel', f].concat(funcstring);
		},

		list(funcstring) {
			const props = funcstring[0];
			if (!props instanceof Object) {
				utils.error('List properties should be an object!');
			}
			const item_type = props.type;
			if (!props.push && !props.datasource && !props.deltas && !props.data && !funcstring[1]) {
				utils.warn('No item source provided for list', funcstring);
			}
			//console.log('List properties', props);
			var deltas_func;
			if (props.push) {
				deltas_func = ['map', {
						$push: (val) => {
							if (val) {
								return [['add', null, val]];
							}
						},
						$pop: (key) => {
							if (key || key === 0 || key === '0') {
								if (key instanceof Array || key instanceof Set) {
									const arr = [];
									for (let k of key) {
										arr.push(['remove', k]);
									}
									return arr;
								}
								return [['remove', key]];
							}
						}
					}]
			} else if (props.deltas) {
				deltas_func = [utils.id, props.deltas];
			} else if (props.data) {
				deltas_func = ['closure', get_arr_changes, ['just', props.data]];
			} else {
				deltas_func = ['closure', get_arr_changes, '$datasource']
			}
			const all_lists_mixin = {
				$init: { 
					$no_auto_template: true,
					$is_list: true, 
				},
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
							if (!changes || !changes.length)
								return;
							const chngs = arr_changes_to_child_changes(item_type, changes);
							//console.log('Got changes:', utils.frozen(chngs), 'from', changes);
							chngs.forEach((one) => {
								switch (one[0]) {
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
				$children: ['$arr_data.changes']
			};
			if (props.push) {
				all_lists_mixin.$push = props.push;
				if (!props.push instanceof Array) {
					utils.error('List\'s PUSH property should be a F-expression(array), given', props.push);
				}
			}
			if (props.pop) {
				all_lists_mixin.$pop = props.pop;
				if (!props.pop instanceof Array) {
					utils.error('List\'s POP property should be a F-expression(array), given', props.pop);
				}
			}
			if (props.datasource) {
				all_lists_mixin.$datasource = props.datasource;
			}
			var fnc;
			const list_own_type = Object.assign(all_lists_mixin, props.self || {});
			if (props.create_destroy) {
				fnc = [(a) => {
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
		arrDeltas(funcstring) {
			const cell = funcstring[0];
			return ['closure', function () {
					var val = [];
					return function (new_arr) {
						const deltas = utils.arrDeltas(val, new_arr);
						val = new_arr;
						//console.info('deltas are', deltas);
						return deltas;
					}
				}, cell]
		}
	}
}

