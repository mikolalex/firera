var Firera = require('../firera');
var che = require('../che/che');
var Ozenfant = require('../ozenfant/ozenfant');

var id = a => a;
var not = a => !a;
var always = (a) => {
	return () => a;
}

var excel_app = {
	__root: {
		$child_cells: ['list', {
			type: 'cell',
			deltas: '../cells_diff'
		}],
		sizeX: 3,
		sizeY: 4,
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
			return res;
		}, 'sizeX', 'sizeY'],
		cells_diff: ['arr_deltas', 'cells_arr']
	},
	cell: {
		'|hasClass(cell)': true,
		'|css(float)': 'left',
		val: 0,
		formula: null
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