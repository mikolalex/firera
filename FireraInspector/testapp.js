var triggerEnter = (el) => {
	var e = $.Event("keyup");
	e.which = 13; //choose the one you want
	e.keyCode = 13;
	e.target = el.get()[0];
	//console.log('trigger on', el);
	el.trigger(e);
}


var always = (a) => {
	return () => a;
}

var as = (propName, defValues = {}) => {
	return (val) => {
		if(val === undefined) return;
		var obj = {};
		obj[propName] = val;
		return Object.assign(obj, defValues);
	}
}
var ind = function(index = 0){
	return (arr) => {
		return arr instanceof Object ? arr[index] : null;
	}
}
var fromMap = function(map, def){
return (val) => {
	return (map[val] !== undefined) ? map[val] : def;
}
}

var $root = $("#content");
var type = (str) => {
	//console.log('type', str, $root.find('input[type=text]'));
	$root.find('input[type=text]').val(str);
}
var enter = () => {
	triggerEnter($root.find('input[type=text]'));
}

var main_template = `
	h1 
		"Todo MVC"
	.
		"Todos"
	ul$todos
	.
		"Display:"
		ul.display
			.all
				"All"
			.done
				"Done"
			.undone
				"Undone"
	.
		span
			"Completed: "
			span.completed_number$
	.
		span
			"Total: "
			span.all_number$
	.
		a.clear-completed(href: #)
			"Clear completed"
	.
		h2.add-todo
			"Add todo"
		.
			text.new-todo-text
`;
var todo_template = `
	.
		"This is todo"
	.$text
	.
		a.complete(href: #)
			"Complete"
	.
		a.remove(href: #)
			"Remove"
`;

var app_struct = {
	__root: {
		$template: main_template,
		$el: $root,
		$child_todos: ['list', {
			type: 'todo',
			push: [
				as('text', {complete: false}), 
				'../new_todos'
			],
			pop: ['join', 
				'done', 
				[ind(0), '*/.remove|click'], 
				[(a, b) => {
					return a ? b : a;
				}, '../remove_done', '-completed_indices']
			],
			self: {
				'display': [fromMap({
					all: '*',
					undone: true,
					done: false,
				}), '../display'],
				'completed_indices': ['indices', 'complete'],
			}
		}],
		'remove_done': ['.clear-completed|click'],
		'new_todos': ['.new-todo-text|enterText'],
		'display': ['.display > *|click|attr(class)'],
		'.new-todo-text|setval': [always(''), 'new_todos'],
		'completed_number': ['count', 'todos/complete'],
		'all_number': ['count', 'todos/*'],
	},
	todo: {
		'|visibility': ['!=', '../display', 'complete'],
		'|hasClass(completed)': ['complete'],
		$template: todo_template,
		complete: ['toggle', '.complete|click', false],
		'c': ['+', 'a', 'b']
	},
	$packages: ['ozenfant_new', 'htmlCells']
}
