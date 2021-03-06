var _F = Firera.utils;

const app_template = `
.
	h1
		"Todo MVC"
	.
		text(name: new-todo, placeholder: What needs to be done?, val: $clear_add_todo)
	.
		a.make-completed(hasClass inactive: $all_completed)
			"Mark all as completed"
	ul.todos$
	.footer
		.
			span$incomplete
			span
				"item{{plural}} left"
		.display-buttons
			a.all
				"All"
			a.undone
				"Active"
			a.done
				"Completed"
		. 
			a.clear-completed(href: #)
				"Clear completed"

`;
const todo_template = `
li.todo-item(hasClass completed: $completed, show: $shown)
	.checked
	.
		? $isEditing
			text(name: todo-text, value: $text)
		: 
			.text$
	.remove
`;
const todos = [
	{"text":"Save the world","completed":false},
	{"text":"Have a beer","completed":false},
	{"text":"Go to sleep","completed":false}
]
const init_data = (localStorage.getItem('todos') ? JSON.parse(localStorage.getItem('todos')) : false) || todos;

const root_component = {
	$init: {
		incomplete: 0,
		$el: document.querySelector('#todo-app'),
		$template: app_template,
	},
	'add_todo': [(text) => {
		return text.length ? {text, completed: false} : Firera.skip;
	}, 'input[name="new-todo"]|enterText'],
	remove_todo: [_F.ind(0), '**/remove_todo'],
	'~make_completed': ['.make-completed|click'],
	'all_completed': [_F.eq(0), 'incomplete'],
	'plural': [_F.ifelse(_F.eq(1), '', 's'), 'incomplete', '$start'],
	arr_todos: ['toArrDeltas', {
		push: 'add_todo', 
		pop: 'remove_todo',
	}],
	'clear_add_todo': [_F.always(''), 'add_todo'],
	display: [_F.fromMap({
		all: '*',
		undone: true,
		done: false,
	}), '.display-buttons > *|click|attr(class)'],
	'~clear_completed': ['.clear-completed|click'],
	incomplete: ['count', 'todos/completed', _F.not],
	data: ['asArray', 'todos', ['completed', 'text']],
	$toLocalStorage: ['closure', _F.closureThrottle((data) => {
		localStorage.setItem('todos', JSON.stringify(data));
	}, 100), 'data'],
	$child_todos: ['list', {
		type: 'todo',
		deltas: '../arr_todos',
		self: {
			active_todo: [_F.ind(1), '*/edited_todo'],
		}
	}]
}
const todo_component = {
	$init: {
		$template: todo_template,
	},
	completed: ['mapPrev', {
		'.checked|click': (_, prev) => !prev, 
		'^^/make_completed': true
	}],
	text: ['input[name=todo-text]|enterText'],
	edited_todo: ['transist', '.text|dblclick', '-$i'],
	i_am_edited: ['=', '-$i', '../active_todo'],
	isEditing: ['map', {
		'i_am_edited': _F.id,
		'text': false,
		'input[name=todo-text]|press(Esc)': false
	}],
	remove_todo: [
		'transist',
		['join', 
			'.remove|click', 
			[_F.first, '-completed', '^^/clear_completed']
		], 
		'-$name'
	],
	'shown': ['!=', '^^/display', 'completed'],
}

const app = Firera({
	$packages: ['htmlCells', 'ozenfant'],
	$root: root_component,
	todo: todo_component
});
app.set('arr_todos', _F.arrDeltas([], init_data));

window.app = app;
