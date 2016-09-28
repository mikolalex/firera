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


var app = Firera({
		__root: {
				$template: `
								h1
										"Trains"
								.trains$
								.
										.
												"Edit train"
										.edit-train-form$edit_train_form
				`,
				$el: $(".test-trains2"),
				trains_arr: ['just', [
						{
								number: 117,
								id: 1,
						},
						{
								number: 148,
								id: 2,
						},
						{
								number: 49,
								id: 3,
						},
				]],
				$children: {
						trains: ['list', 'train', '../trains_arr'],
						edit_train_form: {
								type: 'edit_train_form',
								add: 'edit_train',
								remove: 'edit_train_form/close'
						}
				},
				edit_train: [function([num, data]){
								console.log('Click!', num, data);
				}, 'trains/*/edit_train']
		},
		edit_train_form: {
				$template: `
				.
						"editing train..."
						a.close(href: ololo)
								"Close"
				`,
				close: ['.close|click']
		},
		train: {
				$template: `
						li
								.
										"Train #"
										span.number$
								.
										a.edit(href: #)
												"Edit"
						`,
				edit_train: ['second', '.edit|click', '-$real_values']
		},
		$packages: ['ozenfant', 'htmlCells']
 })