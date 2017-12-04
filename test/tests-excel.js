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

var formula_parser = (formula, pos_determ) => {
	formula = String(formula);
	var parts = formula.match(/([A-Z][0-9]{1,2})(\+|\-|\*|\/)([A-Z][0-9]{1,2})/);
	if(parts){
		var [__, cell1, operation, cell2] = parts;
		var grid1 = pos_determ(cell1);
		var grid2 = pos_determ(cell2);
		var formula1 = [operation, '../' + grid1 + '/val', '../' + grid2 + '/val'];
		console.log('got formula', formula1);
		return formula1;
	}
	return [always(formula)];
}

var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
var generate_table = (x, y) => {
	var res = [];
	for(var i = 0; i < x; i++){
		for(var j = 1; j <= y; j++){
			res.push({
				title: letters[i] + j
			})
		}
	}
	return res;
}

var get_position_determinant = (x, y) => {
	return (cellname) => {
		var a = letters.indexOf(cellname[0]);
		var b = cellname.slice(1);
		var num = (a * y) + Number(b);
		return num;
	}
}

var excel_app = {
	$root: {
		$child_cells: ['list', {
			type: 'cell',
			deltas: '../cells_diff'
		}],
		active_cell: [first, 'cells/*/become_active'],
		get_formula: ['.formula|getval'],
		cells_arr: [generate_table, 'sizeX', 'sizeY'],
		pos_determ: [get_position_determinant, 'sizeX', 'sizeY'],
		cells_diff: ['arrDeltas', 'cells_arr'],
		'.formula|setval': [second, 'cells/*/set_formula'],
		/*zzz: [(a) => { 
			console.log('active_cell', a);
		}, 'active_cell'],*/
	},
	cell: {
		'|hasClass(cell)': true,
		'|hasClass(active)': ['is_active'],
		'|css(float)': 'left',
		become_active: ['join', '|click', '|focus'],
		set_formula: ['transist', 'is_active', '-formula'],
		is_active: ['equal', '../../active_cell', '$name'],
		val: ['dynamic', formula_parser, 'formula', '../../pos_determ'],
		$init: {formula: 42},
		formula: ['transist', '-is_active', '../../get_formula'],
		/*zzz: [(a) => { 
				console.log('im active?', a);
			}, 'is_active'],
		yyy: [(a) => { 
				console.log('become_active', a);
			}, 'become_active'],*/
	},
	$packages: ['ozenfant', 'htmlCells']
}

describe('Excel', ()=>{
	it('Building table', () => {
		var app = Firera(excel_app, {
			$root: {
				$el: $('.test-excel'),
				sizeX: 3,
				sizeY: 4,
			},
			cell: {
				$template: `
					.$title
					.$val
				`,
			},
		});
		console.log('________________________________________________app', app);
		app.set('formula', 'C1+C3', 'cells/2/');
		console.log('________________________________________________Links', app.linkManager);
		//console.log('diff', app.get('cells_diff'));
		
		//app.set('[data-fr=cells] > *|css(float)', 'left');
		
	})
})