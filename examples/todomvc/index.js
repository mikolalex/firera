const app_template = `
		.
			h1
				"Todo MVC"
			ul.todos$
			.
				text(name: new-todo)

`;
const todo_template = `
    li.todo-item
        .checked
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
var _F = Firera.utils;

const root_component = {
	$init: {
		arr_todos: todos
	},
	$el: document.querySelector('#todo-app'),
	$template: app_template,
	add_todo: [(text) => {
		return {text, completed: false};
	}, 'input[name="new-todo"]|enterText'],
	remove_todo: [_F.ind(0), '**/remove_todo'],
	arr_todos: ['arr', {
		push: 'add_todo', 
		pop: 'remove_todo',
	}],
	'input[name="new-todo"]|setval': [_F.always(''), 'add_todo'],
	$child_todos: ['list', {
		type: 'todo',
		datasource: ['../arr_todos'],
	}]
}
const todo_component = {
	$template: todo_template,
	completed: ['toggle', '.checked|click', false],
	'|hasClass(completed)': ['completed'],
	remove_todo: [_F.second, '.remove|click', '-$i'],
}

const app = Firera({
		__root: root_component,
		todo: todo_component
	}, {
		packages: ['htmlCells', 'neu_ozenfant'],
	}
);

console.log('App', app);
/*

		trackChanges: true,//['pos_y', 'top_offset'],
		trackChangesType: 'log',
 
 */