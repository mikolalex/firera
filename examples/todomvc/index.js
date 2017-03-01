const app_template = `

    h1
        "Todo MVC"
    ul.todos$

`;
const todo_template = `
    li
        .text$
`;
const todos = [{text: 'Save the world'}, {text: 'Have a beer'}, {text: 'Go to sleep'}];
const todo_base = {
    __root: {
        $el: document.querySelector('#todo-app'),
		$template: app_template,
        $child_todos: ['list', {
            type: 'todo',
            data: todos,
        }]
    },
    todo: {
		$template: todo_template,
    }
}

const app = Firera(todo_base, {
    packages: ['htmlCells', 'neu_ozenfant'],
	trackChanges: true,//['pos_y', 'top_offset'],
	trackChangesType: 'log',
});

console.log('App', app);