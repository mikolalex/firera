'use strict';

var Ozenfant = require('../ozenfant/ozenfant');
var che = require('../shche/shche');
var $ = require('jquery');
var LinkManager = require('./LinkManager');
var Parser = require('./Parser');
var App = require('./App');
var PackagePool = require('./PackagePool');
var utils = require('./utils');
var Obj = utils.Obj;
var Arr = utils.Arr;
var Hash = require("./Hash");


var is_def = (a) => {
	return (a !== undefined) && (a !== Firera.undef);
}



var noop = function(){
	console.log('Noop is called!');
};

var show_performance = function(){
	var res = [];
	for(var i = 1; i < arguments.length; ++i){
		res.push(i + ': ' + (arguments[i] - arguments[i - 1]).toFixed(3));
	}
	res.push('Total: ' + (arguments[i - 1] - arguments[0]).toFixed(3));
	return res.join(', ');
}

var get_app = function(packages){
	var app = new App(packages, root_package_pool);
	App.apps.push(app);
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
		&& !utils.path_cellname (cellname, packages);
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
	app.cbs = Obj.map(config, app.parse_cbs.bind(app), {except: ['$packages']});
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

var root_package_pool = new PackagePool();

Firera.undef = new function(){};
Firera.noop = new function(){};
Firera.apps = App.apps;
Firera.run = Firera;
Firera.getAppStruct = function() {
	return Firera.apps.map(App.get_app_struct);
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
				utils.init_if_empty(res, k, []);
				res.$packages = res.$packages.concat(grid[k]);
				continue;
			}
			utils.init_if_empty(res, k, {});
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
		indices: function(funcstring){
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
		join: function(funcstring){
			return ['funnel', utils.second].concat(funcstring);
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
				fnc = [utils.always(list_own_type)];
			}
			return fnc;
		},
		arr_deltas: function(funcstring){
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
		'$html_skeleton_changes': [utils.id, '$template_writer'],
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
					Parser.parse_fexpr([func, [(a) => {
						if(!is_def(a)) return $();
						if(!selector) return a;
						if(selector === 'other') return a;
						return a.find(selector)
								.filter(filter_attr_in_parents.bind(null, a.get()[0]));
					}, '-$real_el', '$html_skeleton_changes'], cellname], pool, Parser.get_random_name(), packages);
					//console.log('OLOLO2', Object.keys(pool.cell_types.$real_el.children), packages);
				} else {
					Parser.parse_fexpr(['asyncClosure', () => {
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
	utils.init_if_empty(rendered, app.id, {}, grid.id, true);
	if(struct.val){
		var context = Object.create(grid.cell_values);
		for(let key in struct.children){
				context[key] = render_rec(app, struct.children[key])
		}
		utils.init_if_empty(templates, app.id, {});
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
Firera.func_test_export = {parse_pb: Parser.parse_pb, parse_fexpr: Parser.parse_fexpr};
Firera._F = utils;

module.exports = Firera;
