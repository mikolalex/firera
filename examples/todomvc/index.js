var _F = Firera.utils;

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
	arr_todos: ['arrDeltas', {
		push: 'add_todo', 
		pop: 'remove_todo',
	}],
	'input[name="new-todo"]|setval': [_F.always(''), 'add_todo'],
	$child_todos: ['list', {
		type: 'todo',
		deltas: '../arr_todos',
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
/*
var arr_1 = ['ene', 'bene', 'raba'];
var arr_2 = ['ene', 'bene', 'raba', 'kvinter', 'finter'];
var arr_3 = ['ene', 'bene', 'raba', 'kvinter', '______', 'zhaba'];
console.log(JSON.stringify(_F.arr_deltas(arr_1, arr_2)));
console.log(JSON.stringify(_F.arr_deltas(arr_2, arr_1)));
console.log(JSON.stringify(_F.arr_deltas(arr_2, arr_3)));*/

console.log('App', app);
/*

		trackChanges: true,//['pos_y', 'top_offset'],
		trackChangesType: 'log',
 
 */