var Firera = require('../firera');
var $ = require('jquery');

var $root = $(".some-list");

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
	$packages: ['ozenfant_new', 'htmlCells']
})

for(var c = 0; c <= 100; c++){
	app.set('add_item', {});
}

console.log('app', app);