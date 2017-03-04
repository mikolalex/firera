var _F = Firera.utils;

const app_template = `
	.
		h1
			"Todo MVC"
		.
			text(name: new-todo, placeholder: What needs to be done?)
		ul.todos$
		.footer
			.
				span$incomplete
				"items left"
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
    li.todo-item
        .checked
        .
			? $isEditing
				text(name: todo-text, value: $text)
			: 
				.text$
        .remove
`;
const todos = [
	{
		text: 'Save the world',
		completed: false,
	}, 
	{
		text: 'Have a beer',
		completed: false,
	}, 
	{
		text: 'Go to sleep',
		completed: false,
	}
];

const root_component = {
	$init: {
		arr_todos: _F.arr_deltas([], todos)
	},
	$el: document.querySelector('#todo-app'),
	$template: app_template,
	add_todo: [(text) => {
		return {text, completed: false};
	}, 'input[name="new-todo"]|enterText'],
	remove_todo: [_F.ind(0), '**/remove_todo'],
	all_complete: [_F.eq(0), 'incomplete'],
	incomplete: ['closure', () => { 
		var count = 0;
		return ([val]) => {
			if(val){
				count--;
			} else {
				count++;
			}
			return count;
		}
	}, '**/completed'],
	arr_todos: ['arrDeltas', {
		push: 'add_todo', 
		pop: 'remove_todo',
	}],
	'input[name="new-todo"]|setval': [_F.always(''), 'add_todo'],
	display: [_F.fromMap({
		all: '*',
		undone: true,
		done: false,
	}), '.display-buttons > *|click|attr(class)'],
	clear_completed: ['.clear-completed|click'],
	$child_todos: ['list', {
		type: 'todo',
		deltas: '../arr_todos',
	}]
}
const todo_component = {
	$template: todo_template,
	completed: ['toggle', '.checked|click', false],
	text: ['input[name=todo-text]|enterText'],
	isEditing: ['map', {
		'.text|dblclick': true,
		'text': false,
		'input[name=todo-text]|press(Esc)': false
	}],
	//'$remove': ['^^/clear_completed'],
	'|hasClass(completed)': ['completed'],
	remove_todo: [_F.second, '.remove|click', '-$i'],
	'|display': ['!=', '../../display', 'completed'],
}

const app = Firera({
		__root: root_component,
		todo: todo_component
	}, {
		packages: ['htmlCells', 'neu_ozenfant'],
		//trackChanges: true,//['pos_y', 'top_offset'],
		//trackChangesType: 'log',
	}
);

window.app = app;