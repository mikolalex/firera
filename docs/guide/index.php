<?php

$chapter = isset($_GET['chapter']) ? $_GET['chapter'] : '';

function chapter($name, $caption){
    global $chapters;
    global $chapter;
    $chapters[$name] = $caption;
    if($name === $chapter) return true;
}

ob_start();

?>
<?php if(chapter('', 'Getting started')){ ?>
				<div>
				<h2 id="getting-started">Getting started: declarative FRP</h2>
				<div>Let's start with a simple example:</div>
<code>
const base = {
	a: 10,
	b: 20,
	c: [(n, m) => n + m, 'a', 'b']
}
// Create a Firera app instance
const app = Firera({
	__root: base
})
app.get('c'); // 30

// Here comes a FRP magic
app.set('b', 32);
app.get('c'); // 42
</code>
	<div>
		This is a simple example for introducing functional reactive programming principles.
		Here 'a' and 'b' are <i>observable</i> values, and 'c' is a <i>computable</i> value.
		Both a, b, and c are called <i>cells</i>. This is because they act like cells in Excel: 
		some cells just have values, while
		the other cells are computed automatically according to their formulas.
		In this case, "a" and "b" have just static values, and the value of "c" is a sum of "a" and "b".
		Hence "c" depends on values of "a" and "b".
	</div><div>	
		The value of "c" will <b>always</b> be the sum of "a" and "b", we don't need to update it manually.
		There is no proactive intrusion: you cannot change the value of "c" arbitrary, it's changed based
		on the values of other cells(in this case "a" and "b").
		Here a, b and c are called <i>data streams</i> as their values can change over time.
	</div><div>
		What's special about Firera is that it has pretty declarative syntax.
		While other FRP libraries(Rx, Most) use method chains, the Firera app is described as a plain object(POJO: 
		plain old JS object) and pure functions. It gives a lot of advantages that will be discussed later.
	</div><div>
		We instantiate a Firera app by passing this object to Firera function. Then we can change some 
		input values(like "a" or "b") with <span class="mn">set(key, val)</span> method.
	</div><div class="nb">
		Note that you couldn't change "c", because it violates the main FRP principle: a computable cell value should be 
		calculated only based on it's arguments, and never set manually.
	</div><div>
		In Firera language, "base" variable is called <i>plain base</i>, "a", "b", "c" are <i>cells</i>, 
		the expression [(n, m) => n + m, 'a', 'b'] is called <i>F-expression</i>, 
		and the function used in F-expression is called <i>formula</i>.
		Cells "a" and "b" relatively to cell "c" are called <i>arguments</i>.
		Cells which can be manually changed, like a or b, are called <i>free</i>.
		A set of cells is called <i>grid</i>(in all examples at the beginning we'll have only one grid called "__root". 
		This is a conventional name which indicates this grid is the root grid of the app).
	</div><div>
		How Firera works is pretty easy to understand: when some of the observable cells changes, the values of <i>arguments</i>
		are being taken and passed to <i>formula</i>.
		The result of the formula invocation becomes the value of the cell.
		</div><div>
		This is what happens when we run "app.set('b', 32);":
		<ul>
			<li>
				Firera sets the values of cell "b" to 32
			</li>
			<li>
				Firera looks for the cells who depend on "b". In this case this is only one cell - "c"
			</li>
			<li>
				Firera wants to calculate the value of "c" according to the new value of "b":
				<ul>
					<li>
						Firera founds that we need values of "a" and "b" to compute the value of "c"
					</li>
					<li>
						Firera takes the values of "a"(10) and "b"(32) and passes it to the <i>formula</i> of "c"
					</li>
					<li>
						As the formula of "c" is "(n, m) => n + m", and we pass "10" as the first argument and "32" as the second,
						we got ther result of "42"
					</li>
				</ul>
			</li>
			<li>
				Firera sets the current value of "c" to "42"
			</li>
		</ul>
		<div>
			One computable cell can depend on other computable cell also.
<code>
const base = {
	a: 10,
	b: 20,
	c: [(n, m) => n + m, 'a', 'b'],
<span class="add">	exp: 2,</span>
<span class="add">	d: [Math.pow, 'c', 'exp']</span>
}
// Create a Firera app instance
const app = Firera({
	__root: base
})
app.get('d'); // 900
</code>
		Here "d" depends both on "free" and "computable" cells("exp" and "c" respectively).
		If you change the value of "a", Firera will compute the other cells in following order: c, d.
		
		</div>
		<div>
			A sef of cells, described with one plain base, is called <b>grid</b>. In our example we have only one 
			grid which is called "__root".
			It can be visualized like this:<br>
			<img src="img/grid_1.png" alt=""/>
			The lines display dependencies between cells. Squares mean "free" cells, rounds are "computable".
		</div>
		<div>
			The grid could be as big as you need. E.g. something like this:
			<img src="img/grid_2.png" alt=""/>
			The idea of Firera is you can build the whole app as a big grid of computable cells.
		</div>
	</div><!--<ul class="pq">
		<li>
			<div class="q">Why do you call it "data stream"?</div>
			<div class="answer">
				Because
			</div>
		</li>
		<li>
			<div class="q">Why do you write "__root: ..."?</div>
			<div class="answer">
				Because
			</div>
		</li>
		
	</ul>-->
	</div>
                                    <? } 
                                    if(chapter('dom', 'Working with DOM')){
                                    ?>
	<div>
	<h2 id="work-with-dom">Working with DOM</h2>
	<div>
		Let's move to more real-world examples.
		Say we need to validate adding a new comment to a comments' list. User enters his login, email and comment 
		text and presses submit button.
		Let's start with validating login.
	</div>
	<div>
		At first glance, for getting a stream of what user inputs as a login, we could write something like this:
<code>
// function to validate login by length
var is_long = a => a.length > 2;

var base = {
	login: '',
	is_login_valid: [is_long, 'login'],
}
var app = Firera({
	__root: base,
});
// assigning handler that will change the "login" cell
document.querySelector('input[name=login]')
	.addEventListener('change', function(e){
		app.set('login', e.target.value);
	})
</code>	
	Each time user changes the value of input, we update of cell "login". And the value of cell "is_login_valid" 
	will be true or false, depending on length of "login". 
	This will work as expected, but	it's a verbose and too imperative approach. We don't like to assign event handlers manually.
	</div><div>We can include special package to work with DOM, which is called HtmlCells instead. It allows us 
		to create event streams of DOM events in a declarative manner.
	HtmlCells is one of default Firera packages which are included in Firera dist, so we should just 
	add it's name to <span class="mn">packages</span> parameter of our app's config.
	</div>
<code>
// function to validate login by length
var is_long = a => a.length > 2;

var base = {
	$real_el: document.getElementById('fr-app'),
	login: ['input[name=login]|getval'],
	is_login_valid: [is_long, 'login'],
}
var app = Firera({
	__root: base,
}, {
	packages: ['HtmlCells']
});
</code>
	<div>
		A mandatory thing for HtmlCells to work is to define a cell named "$real_el" which should contain 
		the root DOM node of our app.
		Then we just mention the name of cell "'input[name=login]|getval" - and that's all! Firera automatically
		creates handler for the input.
		How it works step-by-step:
		<ul>
			<li>
				Firera founds the definition of "login" cell, which refers to the cell named "input[name=login]|getval"
			</li>
			<li>
				The cell "input[name=login]|getval" seems to be uninitialized(as there is no definition of it
				in our plain base), looks like Firera needs to create an empty free cell, but...
			</li>
			<li>
				HtmlCells parses each cell name by regexp: <selector>|<aspect>. "input[name=login]|getval" 
				matches this expression. <selector> is any valid CSS selector, and <aspect> appoints what
					exactly we want to listen from this DOM node(the full list os aspects see on the HtmlCells
					package page).
			</li>
			<li>
				HtmlCells package founds that we need to get values of DOM node by selector "input[name=login]".
				It assigns delegated event handler to $real_el, which listens 
				"change" and "keyup" events in all subtree.
			</li>
			<li>
				Each time user inputs something in input field, the DOM handler is fired and "input[name=login]"
				is updated with the value of input field.
			</li>
		</ul>
		
	</div>
	<div>
		There is two kinds of html cells: getters and setters. Getters listen for changes in DOM, e.g. events.
		Setters update the DOM with it's value.
		Let's add a class to form to indicate it's valid with a help of html setter.
<code>
var is_long = a => a.length > 2;

var base = {
	$real_el: document.getElementById('fr-app'),
	login: ['input[name=login]|getval'],
	is_login_valid: [is_long, 'login'],
	"form|hasClass(valid)": ['is_login_valid'],
}
var app = Firera({
	__root: base,
}, {
	packages: ['HtmlCells']
});
</code>
		"form|hasClass(valid)" is an example of setter. If the value of 'is_login_valid' cell is true,
		it will add class "valid" to nodes found with "form" selector in scope of "$real_el".
		It uses "hasClass" aspect, which requires one parameter: the name of class("valid").
	</div><div class="nb">
		Notice that if you write like this: <div class="subcode">login: 'input[name=login]|getval',</div> 
		Firera will consider "login" as static cell with the value of string 'input[name=login]|getval'.
		We need to listen the other cell instead, that's why we write it in brackets. All the primitive, 
		static values are written as is, and all the computable expressions are written in brackets.
	</div><div>
		Of course, we could write the same a bit simpler:
	</div>
<code class="js">
{
	$real_el: document.getElementById('fr-app'),
	"form|hasClass(valid)": [is_long, 'input[name=login]|getval'],
}
</code>
		<div>
			...but we require the field <span class="mn">is_login_valid</span> to be present to help us later.
		</div>
		<div>
			We write a small example that shows how to work with DOM without pain of assigning handlers etc.
			Our app is almost completely declarative. The only proactive intrusion is using html setter "hasClass",
			which changes the property of DOM node.
			We can escape from this later by using cool Ozenfant templates.
		</div>
		<ul class="pq">
			<li>
				<div class="q">Will it work without $real_el defined?</div>
				<div class="answer">
					No
				</div>
			</li>
		</ul>
	</div>
                                    <? } 
                                    if(chapter('total_frp', 'Total FRP')){
                                    ?>
	<div>
		<h2 id="total-frp">"Total FRP" concept</h2>
		<div>
			If you look closer to previous example, you can see that every values that depend on event is also an event stream!
			'input[name=login]|getval' is an original event stream of values of input node in DOM. 
			'login' field is also an event stream with equvivalent values, and 'is_login_valid' is an event stream too!
			(with Boolean values).
		</div><div>This table how the values of these cells change as user enters something into input:</div><div>
			<table class="tbl">
			<tr><td>"input[name=login]" DOM node value        </td><td>"input[name=login]" cell </td><td> "is_login_valid" cell </td></tr>
			<tr><td> M     </td><td> M </td><td> false </td></tr>
			<tr><td> My      </td><td>  My  </td><td>   false </td></tr>
			<tr><td> Myk </td><td> Myk   </td><td>    true </td></tr>
			<tr><td> Myko </td><td> Myko    </td><td>    true </td></tr>
			<tr><td> Mykol </td><td> Mykol    </td><td>    true </td></tr>
			<tr><td> Mykola </td><td> Mykola   </td><td>    true </td></tr>
			</table>
		</div>
		<div>
			This is an example how one stream depends on other with formula. I call this "Total FRP" concept,
			which means that all values in application should be event streams which depend on each other.
		</div>
	</div>
                                    <? } 
                                    if(chapter('streams', 'Managing streams')){
                                    ?>
	<div>
		<h2 id="managing-streams">Managing streams</h2>
		<div>
			We need to validate also user's email(with RegExp). If the form is valid, and user clicks "Send" 
			button, we should do some useful work, e.g. and AJAX request.
		</div>
<code>
const simple_email_regex = /\S+@\S+\.\S+/;
const is_email_valid = (str) => {
	return simple_email_regex.test(str);
}
const is_long = a => a.length > 2;

const base = {
	$real_el: document.getElementById('fr-app'),
	
	login: ['input[name=login]|getval'],
	email: ['input[type=email]|getval'],
	
	is_login_valid: [is_long, 'login'],
	is_email_valid: [is_email_valid, 'email'],
	is_form_valid: ['&&', 'is_email_valid', 'is_login_valid'],
	"form|hasClass(valid)": ['is_form_valid'],
	
	send_form: ['&&', '-is_form_valid', 'button.send|click'],
	add_comment_request: ['transistAll', (email, name, text) => {
		// ... some ajax request here...
		console.log('It works!', email, name, text);
	}, 'send_form', '-email', '-login', '-textarea[name=text]|getval'],
}
const app = Firera({
	__root: base,
}, {
	packages: ['htmlCells']
});
</code>
		<div>
		The form is valid when both login and email are valid.
		We implement this by using '&&'. It's a built-in Firera function that works like '&&' operator in JS, 
		but on data streams instead of simple values.
		The equivalent is to write:
		</div>
<code>
	is_form_valid: [(a, b) => {
		return Boolean(a && b);
	}, 'is_email_valid', 'is_login_valid'],
</code>
		<div>
			Each time the values of 'is_email_valid' or 'is_login_valid' changes, the function is run passing both arguments.
			The '&&' built-it function is just a kind of 'syntactic sugar' that shortens your code.
		</div>
		<div>
			Now we should understand, when are form is ready to be sent. It happens when:<br>
			a) user clicks "Send" button<br>
			b) The value of cell "is_form_valid" is truthy.<br>
		</div>
		<div>
			The naive approach will look like this:
<code>
	send_form: ['&&', 'is_form_valid', 'button.send|click'],
</code>
			but this will not work.
			Imagine the following scenario:
			<ul>
				<li>
					User inputs something in text fields, but leaves email empty, and clicks "Send"
				</li>
				<li>
					The value of "is_form_valid" will be "false", the value of "button.send|click" is an Event object. 
					It's truthy, but the result will be false. Everything is right so far.
				</li>
				<li>
					User enters valid email. The value of "is_form_valid" becomes "true".
				</li>
				<li>
					As the value of "is_form_valid" changes, Firera calculates the "send_from" cell. 
					true && Event => true! So the form is being sent immediately when email becomes valid... FAIL!
				</li>
			</ul>
			Hence we understand, that we should run the "send_form" function only when "Send" button is clicked,
			and do nothing when the value of "is_form_valid" changes.
			In Firera it's called "passive listening". One cell depends on the other, but the change in parent
			cell doesn't invoke recalculation of child.
			The syntax for this is simple - add a minus "-" before the name of argument in F-expression.
<code>
	send_form: ['&&', '-is_form_valid', 'button.send|click'],
</code>
			This small changes makes our app work correct!
			<div class="nb">
				Note that this can be used only when you have at least one active argument.
<code>
	foo: ['-bar'],
</code>
				or
<code>
	foo: ['-bar', '-baz'],
</code>
				are pointless as "foo" will be never computed!
			</div>
		</div>
	</div>
                                    <? } 
                                    if(chapter('cell_types', 'Cell types')){
                                    ?><div>
<div>
			<h2 id="cell-types">
				Cell types
			</h2>
			<h3>
				Funnel
			</h3>
			In Firera there are a few ways to calculate the value of cell according to it's arguments.
			For now we knew only one, default type.
<code>
const app = Firera({__root: {
	a: 30,
	b: 12,
	c: [(a, b) => a + b, 'a', 'b']
}})
app.get('c'); // 42
app.set('b', 100);
app.get('c'); // 130
</code>
			The principle is: when one of arguments is changed, we take the values of all cells-arguments
			and pass them to our formula.
			But this way doesn't suit for all cases.
			Say we need our cell to listen to changes in few cells and console.log them.
<code>
const app = Firera({__root: {
	a: 30,
	b: 12,
	c: [(a, b) => {
		console.log('Some cell changed!', a, b);
	}, 'a', 'b']
}})
app.set('b', 100);
// Some cell changed 30, 100
app.set('a', 22);
// Some cell changed 22, 100
app.set('a', 22); // same value
// Some cell changed 22, 100
</code>
			As you see, this way cannot help us: each time some parent cell changes, we receive values of all parent cells.
			Therefore we don't know which one have changed actually.
			We have a special cell type for such cases called "funnel".
<code>
const app = Firera({__root: {
	a: 30,
	b: 12,
	c: ['funnel', (cell_name, cell_value) => {
		console.log('Cell', cell_name, 'changed to', cell_value);
	}, 'a', 'b']
}})
app.set('b', 100);
// Cell b changed to 100
app.set('a', 22);
// Cell a changed to 22
app.set('a', 22); // same value
// Cell a changed to 22
</code>
			Cell type is written first in our F-expression. We can omit writing default cell type,
			but if we use funnel, we should write it.
			As you see, when using funnel type, we get the name and value of the very cell that changed, 
			and only this.
			Only two arguments will be passed to formula each time: a name and a value of cell that changed.
			<div class="nb">
				You can use any number of arguments with funnel type, but, obviously, it has sense for
				ar least two arguments.
			</div>
			This cell type is used when we need to "join" several "streams".
<code>
const second = (_, a) => a;
const app = Firera({__root: {
	'input_changed': [
		'funnel', 
		second, 
		'input|keyup', 
		'input|change', 
		'input|focus'
	],
}})
</code>
			In this example "input_changed" will be the union of three other cells.
			
			<h3>
				Closure
			</h3>
			But what if we need to log all the history of changes in cells?
			We want to get this:
<code>
const app = Firera({__root: {
	a: 30,
	b: 12,
	c: ['funnel', (cell, val) => {
		// SOME MAGIC!
	}, 'a', 'b']
}})
app.set('b', 100);
app.get('c'); // [['b', 100]]
app.set('a', 22);
app.get('c'); // [['b', 100], ['a', 22]]
app.set('a', 22);
app.get('c'); // [['b', 100], ['a', 22], ['a', 22]]
</code>
			... and so on. Obviously we need some way to store previous data.
			We used to use pure functions as formulas in Firera. Using some global variables 
			inside Firera formulas is a dedly sin! Our code becomes dirty and fragile, this eleminates
			all the advantages Firera gives us.
			Luckily there is another cell type called "closure".
			In this type, our formula should return another function, which becomes a formula for a cell.
			It's easier to understand it in code:
<code>
const app = Firera({__root: {
	a: 30,
	b: 12,
	c: ['closureFunnel', () => {
		// this function will be run only once, when the grid is initiated.
		const log = [];
		// this function will be returned once and used as formula for "c" cell
		return (cell, val) => {
			log.push([cell, val]);
			return log;
		}
	}, 'a', 'b']
}})
app.set('b', 100);
app.get('c'); // [['b', 100]]
app.set('a', 22);
app.get('c'); // [['b', 100], ['a', 22]]
app.set('a', 22);
app.get('c'); // [['b', 100], ['a', 22], ['a', 22]]
</code>
			When run for the first time, your formula function should return another function, which becomes an actual formula!
			The main advantage here is you can create and use some closure variabled, while your code remains clean(because this 
			variables could be accessed only from this particular function). 
			This helps you to avoid using global variables and falling into shared mutable state abyss.
		</div>
		<div class="nb">
			As you might notice, you can combine "funnel" and "closure" type. 'closureFunnel' or
			'funnelClosure' - both ways are correct.
		</div>
			<h3>
				Async
			</h3>
		<div>
			The next useful type is called "async".
			It's used when we deal with async functions(i.e. function which perform async actions,
			not the ES6 async functions).
			It works like default cell types, but the first argument for our formula will be always
			callback function used to "return" data when async function finishes.
<code>
const app = Firera({__root: {
	'user': 'Mikolalex',
	'posts: ['async', (cb, username) => {
		$.get('/posts/' + username, function(data) {
			console.log('data received!');
			cb(data);
		})
	}, 'user']
}})
</code>
Though 'posts' cell has only one argument, it's formula receives two arguments. First is a callback 
which we call when our async job is done to return the result.
<code>
const app = Firera({__root: {
	'time': 3,
	'await': ['async', (cb, time) => {
		setTimeout(() => {
			cb(time);
		}, time * 1000);
	}, 'time'],
	'foo': [(t) => {
		console.log(t, 'seconds passed!');
	}, 'await']
}})
</code>
			Async type allows us to use async-executed functions in our grid along with others with minimal additional efforts.
			
			<h3>
				Nested
			</h3>
			The last useful cell type is nested. 
			As you might notice, in Firera the result of computaion is always put to only one cell.
			Form the other hand, in imperative programming we are used to see that [dirty] function 
			can not only eturn some value, but also 
			change a few other variables. This behaviour, generally harmful, can sometimes help a lot.
		</div>
		<div>
			In Firera we cannot arbitrary change the value of some computed cell. 
			But "nested" type allows us to put value to a set of predefined cells on our choice.
			
<code>
const get_sum = () => {
	var sum = 0;
	return (num) => {
		sum += num;
		return sum;
	}
}
const app = Firera({
	__root: {
		num: 1,
		nums: ['nested', function(cb, a){
				if(a % 2){
					cb('odd', a);
				} else {
					cb('even', a);
				}
		}, ['odd', 'even'], 'num'],
		odd_sum: ['closure', get_sum, 'nums.odd'],
		even_sum: ['closure', get_sum, 'nums.odd'],
	}
});
app.set('num', 2);
// odd_sum: undefined, even_sum: 2
app.set('num', 3);
// odd_sum: 3, even_sum: 2
app.set('num', 4);
// odd_sum: 3, even_sum: 6
</code>
			Here we use "nested" cell "nums", which has two subcells: "odd" and "even".
			Nested types looks like async: we also receive a callback function as a first argument.
			But we should not only return the value, but also specify the subcell we want to put this value in.
			Then you can depend on this subcells as on ony other usual cell. 
			The set of subcells is defined in F-expression after the formula.
			The name of subcell is defined as parent_cell_name + '.' + subcell_name.
			<div class="nb">
				Note that you ARE to put the value in some of subcells, you cannot put it to
				the whole cell(like "nums") and cannot refer to it in other F-expressions.
			</div>
			Nested type allows us to divide streams, and in this meaning it's a complementary 
			opposite to "funnel" type, which joins the streams together.
			<div class="nb">
				Using callback to return a value allows us to use both sync and async functions,
				therefore nested type excludes async type.
			</div>
			</div>
	</div>
                                    <? } 
                                    if(chapter('nested_grids', 'Nested grids')){
                                    ?>
					<div>
					<h2>
							Nested grids
					</h2>
					<h3>
							Static nested grids
					</h3>
			<div>
				For now we considered examples when only one grid was present.
				This is obviously not enough for complex applications. 
				When working with DOM it's natural to have a tree of components that can be hierarchically nested.
				So we need a way to put one grid into another, make a tree of grids.
				Each Firera app could have only one root grid, which has nested children.
			</div>
				<div>
					Firera hates procative intrusion into app work, so we could not mnually change the value of computable cell.
					In the same way, we couln't not force to create a nested grid inside some formula or elsewhere.
					Instead, there is simple convension: each value of the cell,
					which name begins with "$child_", will be considered as a plain base for nested grid. 
				</div>
<code>
const app = Firera({__root: {
	foo: 10,
	$child_crane: {
		width: 40,
		height: 120,
		weight: [(w, h) => {
			return (w+h)/10;
		}, 'width', 'height'],
	},
	heron: {
		b: 10,
		c: 40,
	},
}});


console.log(app.get('weight', '/crane')); // 16
</code>
						<div>
		There are two cells with static values(Objects): "$child_crane" and "heron", but there is big
		defference between them.
		The name "$child_heron" matches our RegExp, so it means that new nested grid will be created,
		having the value of this cell as a plain base.
		While the "heron" will cause no consequences, it will be just an Object.
						</div>
						<div>
							So the grid with a name "crane" will be created as a child of root grid.(prefix "$child_" is cut).
							To make sure of this, let's get some value from this grid.
							If we need to retrieve a value of some nested grid cell, we have to pass also
							a route to it as a second argument to "get()" method.
							In this case, the route will be "/crane", where means "crane" grid of root("/") grid.
						</div>
						<div>
							Let's make another nested level to learn how it works.
						</div>
<code>
const app = Firera({__root: {
	foo: 10,
	$child_crane: {
		width: 40,
		height: 120,
		weight: [(w, h) => {
			return (w+h)/10;
		}, 'width', 'height'],
		$child_1: {
			name: 'Busol',
			gender: 'male',
		},
		$child_2: {
			name: 'Buska',
			gender: 'female',
		},
	},
	heron: {
		b: 10,
		c: 40,
	},
}});
console.log(app.get('name', '/crane/1')); // 'Busol'
console.log(app.get('name', '/crane/2')); // 'Buska'
</code>
		You can do as many nested grids as you want.
		<div class="nb">
			Note that you can choose any name for your grid, including those which start from numbers, e.g. "1" or "42"
		</div>
		<h3>
			Linking cells between grids
		</h3>
		Isolated gris, even when they are nested, could help us a little though.
		We need a way to link cells from different grids so the data can flow between them in both direction.
<code>
const app = Firera({__root: {
	multiplier: 10,
	first_crane_weight: ['crane_1/weight'],
	$child_crane_1: {
		width: 40,
		height: 120,
		weight: [(w, h, m) => {
			return (w+h)/m;
		}, 'width', 'height', '../multiplier']
	},
	$child_crane_2: {
		width: 50,
		height: 80,
		weight: [(w, h, m) => {
			return (w+h)/m;
		}, 'width', 'height', '/multiplier']
	},
}});
console.log(app.get('weight', '/crane_1')); // 16
console.log(app.get('first_crane_weight')); // 16
console.log(app.get('weight', '/crane_2')); // 13
</code>
		Here you can see a few ways to link cells of different grids.
		'../multiplier' is linked to the parent's 'multiplier' cell. It means that it gets the same values as it.
		This syntax is similar to the one is used in file system, but it has some differences which will be described later.
		And there we refer to the nested grid's cell, using it's name:
<code>
	first_crane_weight: ['crane_1/weight'],
</code>
		In second nested grid we use addressing "from root": '/mutiplier'. The slash at the beginning means start from root grid.
		Also there is a way to link to all nested or all parent grids' cells:
		<code>
'any_click_in_children': ['*/some_click'], // listen to all 'some_click' cells 
					// from all immediate-children grids
'any_click_inside': ['**/some_click'], // listen to all 'some_click' cells 
					// from all nested grids
'any_click_upper': ['^^/some_click'], // listen to all 'some_click' cells 
					// from the whole chain of parent grids
		</code>
		The limitation about linking is: it can be only one clash in address. It means you could NOT write like this:
		../../a, ../foo/b etc.
		</div>
		<div>
                                    <? } 
                                    if(chapter('lists', 'Lists')){
                                    ?>
		<h2>
				Lists
		</h2>
				<h3>
						Static data-based lists
				</h3>
		As you might notice, our recent example voilates the DRY principle - we have a lot of code repeated.
		The first and the second grids differ only in data while the structure is the same.
		We can simplify this example a bit:
<code>
const crane = {
		weight: [(w, h, m) => {
			return (w+h)/m;
		}, 'width', 'height', '../multiplier']
}
const cranes = [
	{
		width: 40,
		height: 120,
	},
	{
		width: 50,
		height: 80,
	},
]
const app = Firera({__root: {
	multiplier: 10,
	first_crane_weight: ['crane_1/weight'],
	$child_crane_1: Object.assign({}, cranes[0], crane),
	$child_crane_1: Object.assign({}, cranes[1], crane),
}});
</code>
		Here we start to divide data and structure.
		The structure for both nested grids is common.
		For creating a number of similar grids, which differ only in free cells, we have a "list" expression:
<code>
const cranes = [
	{
		width: 40,
		height: 120,
	},
	{
		width: 50,
		height: 80,
	},
	{
		width: 70,
		height: 160,
	},
]
const app = Firera({
	__root: {
		multiplier: 10,
		$child_cranes: ['list', {
			type: 'crane',
			data: cranes, 
		}]
	},
	crane: {
		weight: [(w, h, m) => {
			return (w+h)/m;
		}, 'width', 'height', '^^/multiplier']
	}
});

console.log(app.get('weight', '/cranes/0'); // 16
console.log(app.get('height', '/cranes/0'); // 120

console.log(app.get('weight', '/cranes/1'); // 13
console.log(app.get('height', '/cranes/1'); // 80

console.log(app.get('weight', '/cranes/2'); // 23
console.log(app.get('height', '/cranes/2'); // 160

</code>
	<div>
		So what is "list"? It's not a cell type, neither a function. It's a macros.
		WIll take a closer look at them later, now let's see what parameter has "list" macros.
		Two parameters are required: "type" and "data" or "datasource".
		A "type" should be either or name of grid type, or a link to plain base object which describes grid.
		"Data" should be an array of data used as source for list. 
		List macros creates nested grid for each elemnt of "data" array.
	</div>
	<div>
		In our example, the grid type is "crane". This grid type is described in object which we pass to Firera function.
		For each element of "data" array a grid of "crane" type will be created, passing
		"width" and "height" to appropriate cells.
	</div>
		
	<br><br>
	All these child grids will NOT become immediate descendants of our toor grid! There will be 
	one imtermediate grid which holds all the list items.
	So the hierarchy will be: 
	<div style="text-align: center;">
		"/"<br>
		|<br>
		"/cranes"<br>
		/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\<br>
		"0" &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"1"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; "2"<br>
	</div>
	It recalls JavaScript data structure: an array is kind of object, which, along with array items, could have other fields.
	Here "/"(root grid) has an "array" called "cranes", which has items "0", "1" and "2".
	<div>
		That's why we changed our links a bit: now we have "^^/mutiplier" instead of "../multiplier", 
		because the direct parent of "0", "1" and other grids in list will be an "/cranes" grid and not the root grid.
	</div>
	<h3>
			Cell as datasource for list
	</h3>
	Another way to build our list is to use a cell as a source of data. That means, each time a value of cell changes, 
	our list will be updated(it includes automatic removing and creating grids).
	To get this, we will use "datasource" parameter instead of "data".
	<code>
const cranes = [
	{
		width: 40,
		height: 120,
	},
	{
		width: 50,
		height: 80,
	},
	{
		width: 70,
		height: 160,
	},
]
const app = Firera({
	__root: {
		multiplier: 10,
		cranes: ['just', cranes],
		$child_cranes: ['list', {
			type: 'crane',
			datasource: ['../cranes'], 
		}]
	},
	crane: {
		weight: [(w, h, m) => {
			return (w+h)/m;
		}, 'width', 'height', '^^/multiplier']
	}
});

console.log(app.get('weight', '/cranes/0')); // 16
console.log(app.get('height', '/cranes/0')); // 120

console.log(app.get('weight', '/cranes/1')); // 13
console.log(app.get('height', '/cranes/1')); // 80

console.log(app.get('weight', '/cranes/2')); // 23
console.log(app.get('height', '/cranes/2')); // 160

cranes.push({
	width: 100,
	height: 100,
})

cranes[1].weight = 60;

app.set('cranes', cranes);

console.log(app.get('weight', '/cranes/3')); // 100
console.log(app.get('height', '/cranes/3')); // 

console.log(app.get('weight', '/cranes/1')); // 60

</code>
			</div>
                                    <?php } 
                                    
$out = ob_get_contents();
ob_end_clean();
                                    ?>
<!DOCTYPE html>
<!--
To change this license header, choose License Headers in Project Properties.
To change this template file, choose Tools | Templates
and open the template in the editor.
-->
<html>
		<head>
				<title>Firera tutorial</title>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link rel="stylesheet" href="../guide.css" />
				<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.8.0/styles/default.min.css">
				<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
				<script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.8.0/highlight.min.js"></script>
				<script src="../firera.js"></script>
				<style>
					#content > * {
						padding: 50px 40px 40px 66px;
						background-color: white;
						margin-top: 3em;
						margin-bottom: 3em;
					}
					
						html {
							/*min-height: 100%;
							background-color: #b7d1e4;*/
						}
						
						.exp {
							width: 100%;
							background-color: white;
							border-top: 1px solid #b7d1e4;
							border-bottom: 1px solid #b7d1e4;
							margin-top: 50px;
						}
						
						.sub-exp {
							max-width: 800px;
							margin: auto;
						}
						.sub-exp > ul {
							margin: 0px;
							padding-left: 120px;
						}
						.sub-exp > ul > li a {
							color: black;
							text-decoration: none;
						}
						.sub-exp > ul > li {
							float: right;
							list-style: none;
							width: 167px;
							text-align: center;
							height: 20px;
							padding-top: 60px;
						}
						
						.titl a {
							color: white;
							text-decoration: none;
							font-style: italic;
						}
						
						.titl {
							width: 120px;
							text-align: center;
							background-color: #b7d1e4;
							color: white;
							text-transform: uppercase;
							padding: 30px 0px;
							font-size: 15px;
							line-height: 15px;
						}
						
						body {
							margin: 0px;
						}
				</style>
		</head>
		<body>
				<div class="to-main">
						<a href="../index.html">
								<span style="font-size:11px">&larr;</span> &nbsp;&nbsp;to main page
						</a>
				</div>
			<!--<div class="exp">
				<div class="sub-exp">
					<ul>
						<li>
							Discussion
						</li>
						<li>
							Repo
						</li>
						<li>
							<a href="install.html">Install</a>
						</li>
						<li>
							<a href="guide.html">Tutorial</a>
						</li>
					</ul>
					<div class="titl">
						<a href="index.html">Firera -
						Javascript
						Functional
						Reactive
						Declarative
						Framework</a>
					</div>
				</div>-->
				
				<div id="content">
                                    <div class="always-header">
                                        <h1>Firera tutorial</h1>
                                        <hr>
                                        <h2>
                                            Table of contents
                                        </h2>
                                        <ul>
                                        <?php
                                        $prev = false;
                                        foreach($chapters AS $url => $name){
                                            ?>
                                            <li>
                                                <? 
                                                if($prev === $chapter){
                                                    $real_next = $url;
                                                }
                                                if($url !== $chapter){?><a href="index.php?chapter=<? echo $url;?>"><? } else {
                                                    $real_prev = $prev;
                                                }?>
                                                    <? echo $name;?>
                                                <? if($url !== $chapter){?></a><? }
                                                $prev = $url;
                                                
                                                ?>
                                            </li>
                                            <?
                                        }
                                        ?>
                                        </ul>
                                    </div>
<?php
            
echo $out;

?>
                                    <div class="prevnext">
                                        <? if($real_prev){?>
                                        <div>
                                            Previous: <a href="index.php?chapter=<? echo $real_prev;?>">
                                                <? echo $chapters[$real_prev];?>
                                            </a>
                                        </div>
                                        <? } ?>
                                        <? if($real_next){?>
                                        <div>
                                            Next: <a href="index.php?chapter=<? echo $real_next;?>">
                                                <? echo $chapters[$real_next];?>
                                            </a>
                                        </div>
                                        <? } ?>
                                        <div style="clear:both;float:none;"></div>
                                    </div>
	</div>
	<script>
		$(document).ready(function() {
			$('code').each(function(i, block) {
				hljs.highlightBlock(block);
			});
		});

		$('.q').click(function(){
			$(this).parent().find('.answer').toggle();
		})

		
		const app = Firera({
			__root: {
				'$real_el': document.querySelector("#content"),
				'headers': [(els) => {
					const arr = Array.prototype.map.call(els, (el) => { 
						return {
							title: el.innerHTML,
							link: el.getAttribute('id')
						}
					});
					console.log('Arr', arr);
					return arr;
					
				}, 'h2|']
			}
		}, {
			packages: ['htmlCells']
		});
	</script>
		</body>
</html>