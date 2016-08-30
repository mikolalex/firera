var Firera = require('../firera');
var che = require('../che/che');
var Ozenfant = require('../ozenfant/ozenfant');

var id = a => a;
var not = a => !a;
var always = (a) => {
	return () => a;
}
var first = (a) => { return a[0] };
var second = (a) => { return a[1] };
var first_arg = (a) => { return a; };
var second_arg = (a, b) => { 
	return b; 
};

var formula_parser = (formula) => {
	return [always(formula)];
}

var excel_app = {
	__root: {
		$child_cells: ['list', {
			type: 'cell',
			deltas: '../cells_diff'
		}],
		sizeX: 3,
		sizeY: 4,
		active_cell: [first, 'cells/*/become_active'],
		zzz: [(a) => { 
			console.log('active_cell', a);
		}, 'active_cell'],
		get_formula: ['.formula|getval'],
		cells_arr: [(x, y) => {
			var res = [];
			var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
			for(var i = 0; i < x; i++){
				for(var j = 1; j <= y; j++){
					res.push({
						title: letters[i] + j
					})
				}
			}
			console.log('_)_______________________ ARR', res);
			return res;
		}, 'sizeX', 'sizeY'],
		cells_diff: ['arr_deltas', 'cells_arr'],
		'.formula|setval': [second, 'cells/*/set_formula']
	},
	cell: {
		'|hasClass(cell)': true,
		'|hasClass(active)': ['is_active'],
		'|css(float)': 'left',
		become_active: ['join', '|click', '|focus'],
		set_formula: ['transistA', 'is_active', 'formula'],
		is_active: ['equal', '../../active_cell', '$name'],
		zzz: [(a) => { 
				console.log('im active?', a);
			}, 'is_active'],
		yyy: [(a) => { 
				console.log('become_active', a);
			}, 'become_active'],
		val: ['dynamic', formula_parser, 'formula'],
		$init: {formula: 42},
		formula: ['transistB', '-is_active', '../../get_formula'],
	},
	$packages: ['ozenfant', 'htmlCells']
}

describe('Excel', ()=>{
	it('1', () => {
		var app = Firera(excel_app, {
			__root: {
				$el: $('.test-excel'),
			},
			cell: {
				$template: `
					.$title
					.$val
				`,
			},
		});
		console.log('app', app);
		//console.log('cells', app.get('cells_arr'));
		//app.set('sizeX', 3);
		//console.log('diff', app.get('cells_diff'));
		
		//app.set('[data-fr=cells] > *|css(float)', 'left');
		
	})
})