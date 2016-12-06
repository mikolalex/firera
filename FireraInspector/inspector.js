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

var get_data = (cb, url) => {
	$.get(url, (data) => {
		for(var d of data){
				d.cells = order_obj(cell_types_order, d.cells);
		}
		cb(data);
	})
}

var grids_from_data = (data) => {
	var res = [];
	for(var key in data){
		res.push(Object.assign({f_name: key}, data[key], {cells: order_obj(cell_types_order, data[key].cells)}));
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
var app_struct_devtool = {
	__root: {
		$el: $("#content-devtool"),
		$template: templates.main,
		$child_grids: ['list', {
			type: 'grid',
			datasource: ['../data']
		}],
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
				datasource: [grids_from_data, '../children']
		}],
		$child_cell_types: ['list', {
				type: 'cell_type',
				datasource: [cell_types_from_data, '../cells']
		}],
	},
	cell_type: {
		$template: prep(`
			.cell_type(data-type: $f_name)
				h3$f_name
				.$cells
		`),
		$child_cells: ['list', {
			type: 'cell',
			datasource: ['../cells']
		}]
	},
	cell: {
			$template: prep(`
					.cell
							div.cellname$name
							.obj$
			`),
			$child_obj: [() => {  
					return ['obj_or_scalar', {}, {val: 'val'}]
			}, 'val'],
	},
	obj_or_scalar: {
			$init: {
					isOpened: false,
			},
			$template: prep(`
					.level
						span.name$(font-weight: bold)
						div.$isNumber?(display: inline-block)
							span.numberval$val
						:
							div.$isString?(display: inline-block)
								span 
									"&quot;"
								span.stringval$val
								span 
									"&quot;"
							:
								span.type$(font-weight: bold)
								span
									": "
								span.$isObj?
									span.$isOpened?
										span.close(href: #)
											""
										.keys$
									:
										span.open(href: #)
											""
								:
									span.val$

			`),
			'isObj': [a => {
				return a instanceof Object;
			}, 'val'],
			'isString': [a => {
				return typeof a === 'string';
			}, 'val'],
			'isNumber': [a => {
				return typeof a === 'number';
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