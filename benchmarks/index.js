var Firera = require('../firera');
var $ = require('jquery');
var Benchmark = require('benchmark');

var $root = $(".some-list");

var run_test = (cb, str) => {
	var a = performance.now();
	cb();
	var b = performance.now();
	console.log('total for', str + ':', b-a);
}

window.app = Firera({
	__root: {
		$el: $root,
		$template: `
		h2
			"Test list item adding"
		ul.al$items
		
		`,
		$child_items: ['list', {
			type: 'item',
			push: ['../add_item'],
		}]
	},
	item: {
		$template: `
			li
				"I am an item"
		`
	},
	$packages: [
		'neu_ozenfant', 
		//'ozenfant_new', 
		'htmlCells'
	]
})

var test1 = () => {
	for(var c = 0; c <= 100; c++){
		app.set('add_item', {});
	}
}

run_test(test1, 'Add item');