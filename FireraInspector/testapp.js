var $root = $("#content");

var app_struct = {
	__root: {
		$el: $root,
		$template: `
		h2
			"Test list item adding"
			ul$items
		
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
	packages: ['ozenfant_new', 'htmlCells']
}
