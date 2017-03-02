const app_template = `
		.
			h1
				"Todo MVC"
			ul.todos$

`;
const todo_template = `
    li
        .text$
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
	$el: document.querySelector('#todo-app'),
	$template: app_template,
	$child_todos: ['list', {
		type: 'todo',
		data: todos,
	}]
}
const todo_component = {
	$template: todo_template,
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