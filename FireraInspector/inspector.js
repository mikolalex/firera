var timer = (function(){
	var start = performance.now();
	var pool = [];
	window.timer_results = () => {
			for(let a of pool){
					console.log(a[0], a[1]);
			}
	}
	return (str, force) => {
			var time = performance.now() - start;
			//if(force){
					console.log('___________________', str, new Array(30 - str.length).join('_'), time);
			//}
			pool.push([str, time]);
	}
})()


var ttimer_pool = {};
var ttimer = {
		start: function(key){
				if(!ttimer_pool[key]){
						ttimer_pool[key] = {
								sum: 0,
						}
				}
				ttimer_pool[key].current = performance.now();
		},
		stop: function(key){
				ttimer_pool[key].sum += performance.now() - ttimer_pool[key].current;
		},
}


var order_obj = function(order, obj){
		var new_obj = {};
		for(var k of order){
				if(obj[k] !== undefined){
					new_obj[k] = obj[k];
				}
		}
		return new_obj;
}

var adder = (a) => {
		return (b) => {
				return b + a;
		}
}

var cell_types_order = ['free', 'linked', 'system', 'formula', 'funnel', 'DOM', 'children'];

var always = (a) => {
	return () => a;
}

var typf = a => typeof a;


var grids_from_data = (data, parent_path) => {
	var res = [];
	for(var key in data){
		var path = Firera.is_def(parent_path) ? parent_path + '/' + key : '/' + key;
		var grid = Object.assign({f_name: key, f_path: path}, data[key], {cells: order_obj(cell_types_order, data[key].cells)});
		res.push(grid);
	}
	return res;
}

var cell_types_from_data = (data) => {
	var res = [];
	for(var key in data){
		res.push(Object.assign({f_name: key, cells: data[key]}));
	}
	return res;
}

var prep = Firera.Ozenfant.prepare;

var templates = {
	main: prep(`
			h1 
				"FireraInspector"
			.$grids
	`),
	grid: prep(`
			.grid
				.expand-collapse
					"+"
				h2.$f_name
				.expandable
					.cell_types$
					.grids$
		`),

}
var obj_or_scalar_template = prep(`
.level
	span.name$(font-weight: bold)
	.(display: inline-block)
			span.typef$
			? typeof($val) === 'number'
				? $isEditing
					text.number(value: $val)
					button.change
						"Change"
				:
						span.justvalue.numberval$val
			* typeof($val) === 'string'
				? $isEditing
					text.string(value: $val)
					button.change
						"Change"
				:
					span.stringval.justvalue
						"{{val}}"
			* typeof($val) === 'object'
				? $isOpened
					span.close(href: #)
						""
					.keys$
				:
					span.open(href: #)
					""
			:
				span.val$
`);
console.log('oos', obj_or_scalar_template);
var eq = (a) => {
	return (b) => {
		return b === a;
	}
}
var iof = (a) => {
	return (b) => {
		return b instanceof a;
	}
}
var toString = (a) => a.toString();

var app_struct_devtool = {
	__root: {
		$el: $("#content-devtool"),
		$template: templates.main,
		f_path: '/',
		$child_grids: ['list', {
			type: 'grid',
			datasource: ['../data'],
			self: {
				f_path: ['../f_path'],
			}
		}],
		'new_val_set': [(a, app) => {
			var [val, path, cellname] = a[0];
			path = Firera.is_def(path) ? path : '/';
			path = path.substr(1);
			if(path === '') path = false;
			app.set(cellname, val, path);
		}, '**/set_new_val', '-app']
	},
	grid: {
		$template: templates.grid,
		r_name: ['$name'],
		$init: {
			'.expandable|display': true,
		},
		'.expandable|display': ['toggle', '.expand-collapse|click'],
		$child_grids: ['list', {
				type: 'grid',
				self: {
					f_path: ['../f_path'],
				},
				datasource: [grids_from_data, '../children', '../f_path']
		}],
		$child_cell_types: ['list', {
				type: 'cell_type',
				self: {
					f_path: ['../f_path'],
				},
				datasource: [cell_types_from_data, '../cells']
		}],
	},
	cell_type: {
		$template: prep(`
			.cell_type(data-type: $f_name)
				h3$f_name
				.$cells
		`),
		f_path: ['../f_path'],
		$child_cells: ['list', {
			type: 'cell',
			self: {
				f_path: ['../f_path'],
			},
			datasource: ['../cells']
		}]
	},
	cell: {
			$template: prep(`
					.cell
							div.cellname$name
							.obj$
							.parents_list{$parents_list}
								span.parent-name$.
							.wrong_link_messages$
			`),
			parents_list: [
				(a) => { 
					if(!a.length){
						return [];
					}
					return toString(a).split(',');
				},
				'parents'
			],
			'wrong_link_messages': [(wl) => {
				var htmls = Firera._.Obj.map(wl, (v, k) => {
					return '<div class="warn">' + k + '</div>';
				})
				var res = Firera._.Obj.join(htmls, '');
				return res;
			}, 'wrong_links'],
			$child_obj: [() => {  
					return ['obj_or_scalar', {}, {val: 'val'}]
			}, 'val'],
			f_path: ['../f_path'],
	},
	obj_or_scalar: {
			$init: {
					isOpened: false,
			},
			$template: obj_or_scalar_template,
			'isEditing': ['valMap', '.justvalue|click', 'button.change|click'],
			'val_changed': ['map', {
				'val': false,
				'input[type=text]|getval': true,
			}],
			f_path: ['../f_path'],
			'val': ['new_val'],
			'cellname': ['../name'],
			'new_val': ['transist', (a) => {
				// try to keep original data type
				if(Number(a) == a){
					a = Number(a);
				}
				return a;
			}, ['&&', 'button.change|click', '-val_changed'], '-input[type=text]|getval'],
			'set_new_val': [(a, b, c) => {
					return [a, b, c];
			}, 'new_val', '-f_path', '-cellname'],
			'typef': [(a) => {
					var b = typeof a;
					if(a === null){
						b = 'null';
					}
					if(a === undefined){
						b = 'undefined';
					}
					return b;
			}, 'val'],
			'type': [typf, 'val'],
			'$child_keys': ['list', {
				self: {
					level: ['../level'],
				},
				type: 'obj_or_scalar',
				datasource: [
						(a) => {
								var res = [];
								for(var i in a){
										res.push({name: i, val: a[i]});
								}
								return res;
						}, 
						'../val'],
				create_destroy: ['isOpened']
			}],
			'isOpened': ['funnel', (cell, val) => {
				return cell === '.open|click';
			}, '.open|click', '.close|click'],
	},
	$packages: ['ozenfant_new', 'htmlCells']
}