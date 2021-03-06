<?php if(chapter('Firera basics', '', 'Getting started')){ ?>
				<div>
				<h2 id="getting-started">Getting started: declarative FRP</h2>
				<div>Let's start with a simple example:</div>
                                <?php
                                regshow('1', "   
    const base = {
            a: 10,
            b: 20,
            c: [(n, m) => n + m, 'a', 'b']
    }
    // Create a Firera app instance
    const app = Firera({
            $root: base
    })
    app.get('c'); // 30

    // Here comes a FRP magic
    app.set('b', 32);
    app.get('c'); // 42
");
                                ?>
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
		A set of cells is called <i>grid</i>(in all examples at the beginning we'll have only one grid called "$root". 
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
<? regshow('2', "   
    const base = {
            a: 10,
            b: 20,
            c: [(n, m) => n + m, 'a', 'b'],
            exp: 2,
            d: [Math.pow, 'c', 'exp']
    }
    // Create a Firera app instance
    const app = Firera({
            $root: base
    })
    app.get('c'); // 30

    // Here comes a FRP magic
    app.set('b', 32);
    app.get('c'); // 42
", 1); ?>
		Here "d" depends both on "free" and "computable" cells("exp" and "c" respectively).
		If you change the value of "a", Firera will compute the other cells in following order: c, d.
		
		</div>
		<div>
			A sef of cells, described with one plain base, is called <b>grid</b>. In our example we have only one 
			grid which is called "$root".
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
			<div class="q">Why do you write "$root: ..."?</div>
			<div class="answer">
				Because
			</div>
		</li>
		
	</ul>-->
	</div>
	<? } 
	if(chapter('Firera basics', 'dom', 'Working with DOM')){
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
	$root: base,
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
	$root: base,
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
	$root: base,
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
		<!--<ul class="pq">
			<li>
				<div class="q">Will it work without $real_el defined?</div>
				<div class="answer">
					No
				</div>
			</li>
		</ul>-->
	</div>
                                    <? } 
                                    if(chapter('Firera basics', 'total_frp', 'Total FRP')){
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
                                    if(chapter('Firera basics', 'streams', 'Managing streams')){
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
	$root: base,
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
                                    if(chapter('Firera basics', 'cell_types', 'Cell types')){
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
const app = Firera({$root: {
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
const app = Firera({$root: {
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
const app = Firera({$root: {
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
const app = Firera({$root: {
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
const app = Firera({$root: {
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
const app = Firera({$root: {
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
			<div>
			When run for the first time, your formula function should return another function, which becomes an actual formula!
			The main advantage here is you can create and use some closure variabled, while your code remains clean(because this 
			variables could be accessed only from this particular function). 
			This helps you to avoid using global variables and falling into shared mutable state abyss.
			</div><div>
			Another example of pure "closure" type(without "funnel") - a sum of cell values over time:
<code>
const app = Firera({$root: {
	num: 10,
	sum: ['closure', () => {
		var sum = 0;
		return (n) => {
			sum += n;
			return sum;
		}
	}, 'num']
}})
app.set('num', 20);
app.get('sum'); // 30

app.set('num', 12);
app.get('sum'); // 42
</code>
		</div>
		<div>
			One may wonder, why don't we create a closure on our own?
			Well, of course we might use immediately invoked function:
<code>
var get_sum = (() => {
	var sum = 0;
	return (n) => {
		sum += n;
		return sum;
	}
})();
const app = Firera({$root: {
	num: 10,
	sum: [get_sum, 'num']
}})
</code>
		this will give the same behaviour. But only if we use this function once!
		Firera can instanciate a number of similar grids(see "Lists" chapter below), and using "closure" type
		you are guaranteed each function to have it's own closure. If you do it manually, you'll get common closure for all grids.
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
const app = Firera({$root: {
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
const app = Firera({$root: {
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
	$root: {
		num: 1,
		nums: ['nested', function(cb, a){
				if(a % 2){
					cb('odd', a);
				} else {
					cb('even', a);
				}
		}, ['odd', 'even'], 'num'],
		odd_sum: ['closure', get_sum, 'nums.odd'],
		even_sum: ['closure', get_sum, 'nums.even'],
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
			<h3>
				Mixing cell types
			</h3>
		<div>
			As you might notice, you can mix some cell types in one cell, some you cannot. E.g., you can mix "funnel" and "closure" type. 'closureFunnel' or
			'funnelClosure' - both ways are correct. Yet you should never try to combine "async" and "nested" type(as they exclude each other).
			Here is a <a href="../doc.html#cell-types-compatibility">table</a> displaying possible combinations of cell types.
			
			
		</div>
</div>
	</div>
                                    <? } 
                                    if(chapter('Grid hierarchy', 'nested_grids', 'Nested grids')){
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
const app = Firera({$root: {
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
const app = Firera({$root: {
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
const app = Firera({$root: {
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
                                    if(chapter('Grid hierarchy', 'lists', 'Lists')){
                                    ?>
                    <div>
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
const app = Firera({$root: {
	multiplier: 10,
	first_crane_weight: ['crane_1/weight'],
	$child_crane_1: Object.assign({}, cranes[0], crane),
	$child_crane_2: Object.assign({}, cranes[1], crane),
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
	$root: {
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
	$root: {
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
    if(chapter('Writing TodoMVC in details', 'todomvc_start', 'Displaying a list')){ ?>
        <div>
            <h1>
                Writing TodoMVC on Firera
            </h1>
            <h2>
                Displaying a list
            </h2>
            <div>
                We will make HTML layout and then begin implementing our TodoMVC app with a simple basic thing: displaying a list of todos.
<code>
const app_template = `
	h1
		"Todo MVC"
	.
		text(name: new-todo, placeholder: What needs to be done?)
	.
		a.make-completed
			"Mark all as completed"
	ul.todos$
	.footer
		.
			span.incomplete
			span
				"item left"
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
		$root: root_component,
		todo: todo_component
	}, {
		packages: ['htmlCells', 'ozenfant'],
	}
);
</code>
				This small piece of code already gives us what we want: a list of "todo" grids is automatically rendered within the ul.todos block of "root" grid.
				How it works:
				<ul>
					<li>
						Ozenfant founds a "todos" variable in root grid template, it's bound to ul.todos node.
					</li>
					<li>
						"todos" is a list, i.e. nested grid which consist a set of grids of one type.
					</li>
					<li>
						Each item of list(in this case an item type is "todo_component") is rendered inside ul.todos node.
					</li>
				</ul>
				This is a beginning of a component-based architecture. Here "todo_component" is an independent component with it's own template, and "root_component" is
				another component, which uses "todo component". Firera structure enfprces you to write separate components without overhead.
				<div>
					The next step is to make our list dynamic - we should implement adding new todo item.
				</div>
            </div>
        </div>
<?php } if(chapter('Writing TodoMVC in details', 'dynamic_list', 'Dynamic list')){ ?>
        <div>
            <h2>
                Dynamic list
            </h2>
            <div>
				Currently our todos are build on the static array.
				Obviously, thiss array will be changed through time: we can add new items, and remove some.
			</div><div>
				In some popular frameworks the following approach is used: you change the value of the array manually(i.e. push, pop etc.), and then the system computes the diff betwenn old and a new value, founs the changes and updates the DOM.
				In Firera, we cannot manually change the value of array. We should describe it as an event stream, which depends on other streams(adding new items, deleting items).
				That's why we need our array to be a computable cell. It should work like this:
<code>
	'arr_todos': ['closureFunnel', () => {
		const arr = [];
		return (cell, val) => {
			if(cell === 'add_todo'){
				arr.push(val);
			}
			if(cell === 'remove_todo'){
				arr.splice(val, 1);
			}
			return arr;
		}
	}, 'add_todo', 'remove_todo'],
	$child_todos: ['list', {
		type: 'todo',
		datasource: ['../arr_todos'],
	}]
</code>
				Here "add_todo" will be a stream of newly added todos(strings or objects), and "remove_todo" will be a stream of indexes we want to remove.
				We will use then "arr_todos" cell as a datasource for our list.
			</div><div>
				Luckily, this is a frequent construction, so Firera already has a macros for such dependancy.
				It's called "arr".
<code>
	arr_todos: ['arr', {
		push: 'add_todo', 
		pop: 'remove_todo', 
	}],
	$child_todos: ['list', {
		type: 'todo',
		datasource: ['../arr_todos'],
	}]
</code>
				"arr_todos" listens to "add_todo" and "remove_todo" event streams, it creates new item in first case and removes in second.
			</div><div>
			However, cells "add_todo" and "remove_todo" are not defined so far. In this case, Firera will make a warning for listening to unexisting cell.
			First we need to define add_todo cell.
			It happens after user presses "Enter" on input field.
<code>
    const app_template = `
    h1
        "Todo MVC"
    .
        text(name: new-todo, placeholder: What needs to be done?, value: $clear_add_todo)
    .
        a.make-completed
            "Mark all as completed"
    ul.todos$
    .footer
        .
            span.incomplete
            span
                "item left"
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

const root_component = {
	$init: {
		arr_todos: todos
	},
	$el: document.querySelector('#todo-app'),
	$template: app_template,
        add_todo: [(text) => {
            return {text, completed: false};
	}, 'input[name="new-todo"]|enterText'],
	clear_add_todo: [_F.always(''), 'add_todo'],
	arr_todos: ['arr', {
            push: 'add_todo', 
            pop: 'remove_todo', 
            //init: todos
	}],
	'input[name="new-todo"]|setval': [
            _F.always(''), 
            'add_todo'
	],
	$child_todos: ['list', {
            type: 'todo',
            datasource: ['../arr_todos'],
	}]
}
</code>
				A cell 'input[name="new-todo"]|enterText' listens to keyup events in selected input field and returns an entered value when user presses "Enter".
				"add_todo" takes this string values and wraps them in object as a "text" field.
				The only thing we still ned to do is to flush an input node after user presses enter.
				That's why we always set it's value to an empty string('') as new todo comes.
				"clear_add_todo" cell always get's an empty string value after todo is added, and then this
				empty value is put to input node:
<code>
    text(name: new-todo, placeholder: What needs to be done?, value: $clear_add_todo)
</code>
			</div>
		</div>
<?php } if(chapter('Writing TodoMVC in details', 'list_item', 'Working with list item: checking and removing todo')){ ?>
        <div>
            <h2>
                Working with list item: checking and removing todo
            </h2>
            <div>
				A todo item needs some DOM node(not nessesarily checkbox) which will be used for checking.
				Clicking on it will cause our "checked" field to toggle. Depending on this, we will add or remove ".checked" class to todo item root node.
<code>
	
const todo_template = `
	li.todo-item(hasClass completed: $completed)
		.checked
		.text$
		.remove
`;

const todo_component = {
	$template: todo_template,
	completed: ['toggle', '.checked|click'],
}
</code>
				Each time you click on ".checked" zone, the value of "completed" should be changed to opposite.
				This is already implemented by "toggle" macros(you can do this using "closure", which remembers the previous value of cell), which takes a cell name
				and a initial value as an argument.
			</div>
			<div>
				Therefore, our "completed" cell will have Boolean values. We use it to add or remove "completed" class to root node of component.
			</div>
			<div>
				Let's implement removing todo items.
			</div>
			<div>
<code>


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
	clear_add_todo: [_F.always(''), 'add_todo'],
	$child_todos: ['list', {
		type: 'todo',
		datasource: ['../arr_todos'],
	}]
}
const todo_component = {
	$template: todo_template,
	completed: ['toggle', '.checked|click', false],
	remove_todo: [_F.second, '.remove|click', '-$name'],
}

const app = Firera({
	$root: root_component,
	todo: todo_component
}, {
	packages: ['htmlCells', 'ozenfant'],
})
	
</code>
			We should know the index of element in list. It's always contained in '$i' cell, which is one on system predefined cells.
			At the same time, we should listen to it passively(with "-" prefix), in order our "remove_todo" event to happen only on click(and not on $i change).
			</div>
			<div>
				Then we should link and listen to "remove_todo" cells of each grid in list from root grid.
				We can do this by referencing '**/remove_todo'.
				<div class="nb">
					Why '**' instead of '*'? As you remember, one asterisk '*' means immediate descendants of a grid. In this case, it will be the only grid - the "todos" grid, which in its turn, holds all the lis's grids.
					So we need use two asterisks to listen to all grids in subtree.
				</div>
				We pass the index of element in list, but we use "_F.ind(0)" function. Why?
				When listening to changes in other grid's cells through '*' or '**', you receive an array of [val, path] as a value of cell.
				Where "val" is original value, and "path" is a path to grid in which the cell in contained.
				You can check this:
<code>
	...
	remove_todo: [function(a){
			const [val, path] = a;
			console.log('Val:', val, 'path:', path);
			return val;
		}, '**/remove_todo'],
	...
	
	*clicking on third element* // Val: 2, path: /grids/2
	*clicking on first element* // Val: 0, path: /grids/0
</code>
				This is used to determine grid's name of cell we listen to. We need only the value, so we should always return the first element of our argument.
				We can use .ind(num) function from Firera.utils package. It returns a function which always return "num"-th element of first argument.
				<div class="nb">
					If so, why don't we get the index of list todo item from path?
					A grid's name in list does not always coincide with it's position. The name is like id: if you have a list of three grids, and remove them and add a new one,
					it's name will be "3", not "0".
				</div>
				
					
			</div>
		</div>
<?php } if(chapter('Writing TodoMVC in details', 'arrDeltas', 'Using array deltas')){ ?>
        <div>
            <h2>
                Using array deltas
            </h2>
            <div>
				Seems like it works now, but... Let's looks closer how data transform in our app.
				<ul>
					<li>
						We assemble particular changes(adding, removing item) into array
					</li>
					<li>
						An array is passed to a list as datasource
					</li>
					<li>
						A list compares array with it's previous version, calculates the diff and makes updates.
					</li>
				</ul>
				Obviously, useless work is done: we make an array from a stream of changes, and then compute changes from array!
				So... Can we just pass array changes to list directly?
				Yes! What we need to do:
				<ul>
					<li>
						Create a single stream of array changes by joining "add" and "remove" streams
					</li>
					<li>
						Transform it to appropriate form
					</li>
					<li>
						Use this stream as a source for our list!
					</li>
				</ul>
				How does the stream of changes look like?
				It's a kind of diff info for array.
				In Firera.utils there is a handy function that computes the changes by comparing two arrays.
				It is arrDeltas(old_arr, new_arr).
<code>
var arr_1 = ['ene', 'bene', 'raba'];
var arr_2 = ['ene', 'bene', 'raba', 'kvinter', 'finter'];
var arr_3 = ['ene', 'bene', 'raba', 'kvinter', '______', 'zhaba'];

_F.arrDeltas(arr_1, arr_2); // [["add","3","kvinter"],["add","4","finter"]]
_F.arrDeltas(arr_2, arr_1); // [["remove","3"],["remove","4"]]
_F.arrDeltas(arr_2, arr_3); // [["add","5","zhaba"],["change","4","______"]]
</code>
				It can produce three type of changed: "add", "remove" and "change".
				If there is a key in new array that is absent in old one, it produces "add" change.
				If there is no such key in new array that was present in old one, it's "remove" change.
				Anf if the value of array item is changed, it's a "change" change.
				As you see, "add" and "change" changes require a value, while the "remove" change needs only an index.
				For "add" change an index may be omitted.
			</div>
			<div>
				Now our code will look like this:
<code>
const root_component = {
	$el: document.querySelector('#todo-app'),
	$template: app_template,
	add_todo: [(text) => {
		return {text, completed: false};
	}, 'input[name="new-todo"]|enterText'],
	remove_todo: [_F.ind(0), '**/remove_todo'],
	arr_todos: ['toArrDeltas', {
		push: 'add_todo', 
		pop: 'remove_todo',
	}],
	'input[name="new-todo"]|setval': [_F.always(''), 'add_todo'],
	$child_todos: ['list', {
		type: 'todo',
		deltas: '../arr_todos',
	}]
}

const app = Firera({
		$root: root_component,
		todo: todo_component
	}, {
		packages: ['htmlCells', 'ozenfant'],
	}
);
app.set('arr_todos', _F.arrDeltas([], init_data));
</code>
				Note that instead of using "arr" macros for "arr_todos", we use "toArrDeltas" macro.
				It does what we need: it transforms a stream of new values into "add" array changes, 
				and "pop" stream is transformed into "remove" changes.
			</div><div>
				Next important change is that we use "deltas" parameter instead of "datasource".
				Now our list will listen to a stream of deltas and make changes, therefore we don't need to make any diffs anymore.
			</div>
			<div>
				The only transformation of data into changes is for initial value of "arr_todos". It's done with _F.arrDeltas function which was mentioned before.
			</div><hr>
			<div>
				Using array(and, later, objects) deltas streams instead of data is a powerful approach. Of course, at first sight, it might look a bit strange and "low-level".
				But it's useful for joining different parts of your app, and it givs a lot of advantages. 
			</div><div>
				When you begin to think in terms of data deltas, you'll realize how many cases it covers.
			</div><div>
				Another advantage, which complies the Firera phylosophy, is that is allows to have a single point where the changes to array is gathered.(as an opposite to an approach where 
				the data may be changed form different parts of code).
			</div>
		</div>
<?php } /* if(chapter('Writing TodoMVC in details', 'counting_uncompleted', 'Counting uncompleted todos')){ ?>
        <div>
            <h2>
                Counting uncompleted todos
            </h2>
            <div>
				The "deltas approach" will help us to display a number of uncompleted todos. Instead of recalculating this number each time an array changes, we can listen
				to changes in "completed" fields of each todo item.
<code>
const app_template = `
	.
		h1
			"Todo MVC"
		ul.todos$
		.
			text(name: new-todo)
		.footer
			.
				span$incomplete
				"items left"
			. 
				a.clear-completed(href: #)
					"Clear completed"

`;

const root_component = {
	...
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
	}, '** /completed'],
	...
}
</code>
			We listen to changes in "complete" fields, so that if a new values is truthy, we increase the counter, and opposite.
			It works!
			</div>
		</div>
<?php }*/ if(chapter('Writing TodoMVC in details', 'editing_todo', 'Editing todo')){ ?>
        <div>
            <h2>
                Editing todo
            </h2>
            <div>
                We need to make possible editing todo. On doubleclick an input field should appear, then on pressing Enter or Escape we should return back. 
                "Enter" saves the modification done, "Escape" cancels it.
<code>
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

const todo_component = {
	$template: todo_template,
	completed: ['toggle', '.checked|click', false],
	text: ['input[name=todo-text]|enterText'],
	isEditing: ['map', {
		'.text|dblclick': true,
		'text': false,
		'input[name=todo-text]|press(Esc)': false
	}],
	'|hasClass(completed)': ['completed'],
	remove_todo: [_F.second, '.remove|click', '-$i'],
}
</code>
    We changed the template of "todo" component, so that input field will be shown when "isEditing" variable is truthy.
    Now we need to define: <ul>
            <li>
                    when "isEditing" becomes true, and when it becomes false
            </li>
            <li>
                    when we save entered data as "text" field of todo item
            </li>
    </ul>
    Our "isEditing" cell should become true when user makes double click, and false when he presses "enter" or "escape".
    To implement such a behaviour, we may use funnel:
<code>
	isEditing: ['funnel', (cellname, val) => {
		if(cellname === 'user_doubleclick'){
			return true;
		} else {
			return false;
		}
	}, 'user_doubleclick', 'pres_enter', 'press_escape'];
</code>
    Note that now we don't use actual values of argument cells.
    This is a common case, and we have a handy macros for it, it's called "map".
<code>
	isEditing: ['map', {
		'.text|dblclick': true,
		'text': false,
		'input[name=todo-text]|press(Esc)': false
	}],
</code>
				So, when ".text|dblclick" cell updates, our cell becomes true and so on. It's quite simple and expressive.
			</div>
			<div>
				Our todo text should update with a value of input field when user presses enter. For this case, we have a "enterText" aspect.
				It return the value of input field when user presses Enter button. That's what we need.
				Hence, when "text" field changes, we should set isEditing to false. We use "text" cell instead of 'input[name=todo-text]|enterText"
				as a argument for "isEditing" to minimize DOM dependency.
			</div>
			<hr>
			<div>
				However, there is an issue that breaks our login: when one item becomes edites, other edited items should return to default state.
				That requires data exchange through the parent grid, as the siblings cannon communicate with each other.</div><div>
				The solution will be the following: when doubleclicking, we will bubble this event to parent grid together with a number of grid we clicked.
				Then all other grids will listen to this from parent grid, and cancel editing if it's not the same grid that we clicked.
<code>
const root_component = {
	...
	$child_todos: ['list', {
		type: 'todo',
		deltas: '../arr_todos',
		self: {
			active_todo: [_F.ind(1), '*/edited_todo'],
		}
	}]
}

const todo_component = {
	...
	edited_todo: ['transist', '.text|dblclick', '-$i'],
	i_am_edited: ['=', '-$i', '../active_todo'],
	isEditing: ['map', {
		'i_am_edited': _F.id,
		'text': false,
		'input[name=todo-text]|press(Esc)': false
	}],
}
</code>
				A 'transist' macros return the value of second argument if first one is truthy.
				So when user doubleclicks on todo's name, it will emit the number of todo item.
			</div>
			<div>
				Remember the a list is a grid itself. We can add some cells in it like in any other cell. To do this, we
				specify the "self" parameter of list config.
				Our "todos" list will listen to all changes in "edited_todo" cells of downstream grids.
			</div>
			<div>
				Then we should determine, whether it's the same grid we clicked or not.
				For this purpose the "i_am_edited" cell is used. It will be true only for the actual grid we clicked on.
			</div>
			<div>
				And the last thing we should do is to make "isEditin" dependent on "i_am_edited" cell instead of direct dependency on doubleclick.
			</div>
		</div>
<?php } if(chapter('Writing TodoMVC in details', 'check_all_todos', 'Checking all todos and counting incompleted')){ ?>
        <div>
            <h2>
                Checking all todos and counting incompleted
            </h2>
            <div>
				Now we want to create a button which will make all todos completed.
				It should become inactive when all the todos are completed already.
			</div>
			<div>
				Thining in Firera paradigm, we should now wonder: what determines the state of "competed" field?
				For now, it's two factors: click on checkbox and click on "check all" button. In first case the state should become the opposite to the previous,
				and in the second the state will be always "true".
				For this purpose we have "mapPrev" macros. It works like "map" macro, but it also passes the previous value of argument cell to the function.
			</div>
<code>
const root_component = {
	...
	'~make_completed': ['.make-completed|click'],
}

const todo_component = {
	...
	completed: ['mapPrev', {
		'.checked|click': (_, prev) => !prev, 
		'^^/make_completed': true
	}],
}
</code>
			<div>
				That is: when user click on checkbox, our function receives current value of ".checked|click" as a first argument and previous value of "completed" cell as second.
				We return the opposite to the previous value.
				And when user click on "check all" button, it lways becomes true(=checked).
			</div>
			<div>
				We should also make "check all" button inactive when all todos are completed.
				We can count all (in-) completed fields with "count" macros, that works with lists.
<code>
const app_template = `
.
	h1
		"Todo MVC"
	.
		text(name: new-todo, placeholder: What needs to be done?, value: $clear_add_todo)
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
const root_component = {
	...
	incomplete: ['count', 'todos/completed', _F.not],
	all_completed: [_F.eq(0), 'incomplete'],
	plural: [_F.ifelse(_F.eq(1), '', 's'), 'incomplete'],
}
</code>
			</div>
		</div>
<?php } if(chapter('Writing TodoMVC in details', 'clear-completed', 'Clearing completed todos')){ ?>
        <div>
            <h2>
                Clearing completed todos
            </h2>
            <div>
		When user clicks on "Clear completed" button, we should remove all the completed todo items.
                Typical imperative approach will look like this: look for the completed items in todo's list and remove completed.
                But in Firera there is no imperative intrusion. Intead, we need to update the conditions when the item is removed.
                For now, it's removed only when user clicks on remove button:
                <code>
const todo_component = {
	...
	remove_todo: [
		'transist',
                '.remove|click', 
		'-$name'
	],
}
                </code>
                Now we need to update it: we should also remove an item when "Clear completed" button is clicked and item is completed!
                We'll use joining streams macros.
<code>
    const root_component = {
        // creating a "clear completed" signal from click on block
        '~clear_completed': ['.clear-completed|click'],
    }
    
    const todo_component = {
	remove_todo: [
		'transist',
		['join', 
			'.remove|click', 
			[_F.first, '-completed', '^^/clear_completed']
		], 
		'-$name'
	],
    }
</code>
                The logics here is:
                <ul>
                    <li>
                        When user clicks .clear-completed button, our "clear_comleted" cell get's a value.
                        Here "clear_completed" acts as signal: it's not nessasary what the value it has(a DOM event actually), but it's nessasry when it's triggered, 
                        i.e. when this value changes.
                    </li>
                    <li>
                        Our "remove_todo" cell listens to changes of "clear_completed" cells and get's a signal when user clicks
                    </li>
                    <li>
                        Nested F-exression "[_F.first, '-completed', '^^/clear_completed']" will return the value of "completed" cell when clear_completed signal goes.
                        So, if the cell is completed, it'll be true.
                    </li>
                    <li>
                        "transist" will return '$name' value if the first argument(in our case - a nested F-expression) is truthy. So, the todo item
                        will be removed when "clear_completed" is triggered and it's completed, or when .remove button is clicked. 
                    </li>
                </ul>
                This is a good example of single-source-of-truth priciple in Firera: there should be only one place where particular state is defined.
                
            </div>
	</div>
<?php }
if(chapter('Writing TodoMVC in details', 'final_app', 'Final application')){ ?>
        <div>
            <h2>
                Final application
            </h2>
            <div>
                Now our application looks like this:
<code>
var _F = Firera.utils;

const app_template = `
.
    h1
        "Todo MVC"
    .
        text(name: new-todo, placeholder: What needs to be done?, value: $clear_add_todo)
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
const init_data = (
    localStorage.getItem('todos') 
    ? JSON.parse(localStorage.getItem('todos')) 
    : false
) || todos;

const root_component = {
    $el: document.querySelector('#todo-app'),
    $template: app_template,
    'add_todo': [(text) => {
            return text.length ? {text, completed: false} : Firera.skip;
    }, 'input[name="new-todo"]|enterText'],
    remove_todo: [_F.ind(0), '**/remove_todo'],
    '~make_completed': ['.make-completed|click'],
    'all_completed': [_F.eq(0), 'incomplete'],
    'plural': [_F.ifelse(_F.eq(1), '', 's'), 'incomplete'],
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
    $toLocalStorage: [_F.throttle((data) => {
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
    $template: todo_template,
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
        $root: root_component,
        todo: todo_component
    }, {
        packages: ['htmlCells', 'ozenfant']
    }
);
app.set('arr_todos', _F.arrDeltas([], init_data));
</code>
            
            </div>
    </div>
<?php } /*if(chapter('Further reading', 'writing-reusable-components', 'Writing reusable components')){ ?>
        <div>
            <h2>
                Writing reusable components
            </h2>
            <div>
				
            </div>
	</div>
<?php }*/ if(chapter('Further reading', 'extending_firera', 'Extending Firera')){ ?>
        <div>
            <h2>
                Extending Firera
            </h2>
            <div>
		Firera has a lot of ways that can shorten your code and make it more robust and readable.
                These are:
                <ul>
                    <li>
                        Cell macros
                    </li>
                    <li>
                        Grid mixins
                    </li>
                    <li>
                        Cell name regexps
                    </li>
                </ul>
                All of these you can implement and add to your Firera app with a help of packages.
                Package is plain object with a few a possible keys. Say you need to create a package with a couple of macros.
<code>
    // --- my-package.js ---
    export default {
        macros: {
            some_macros: () => { 
                // do something
            },
            some_other_macros: () => {}
        }
    }
    
    // --- app.js --- 
    import my_pack from 'my-package';
    
    const app = Firera({
        $root: {
            a: 10, 
            b: 20,
            c: ['some_macros', 'a', 'b']
        }
    }, {
        packages: ['htmlCells', my_pack],
    }
</code>
                As we import a package and add it to Firera app.packages config, all it's macros become available for usage in our app.
                <h3>
                    Cell macros
                </h3>
                ...make your F-expressions more beautiful.
                Macros receives a F-expression as an argument and returns new F-expression that will be used for this cell.
<code>
    // --- my-package.js ---
    export default {
        macros: {
            getState: (fs) => { 
                return ['closureFunnel', () => {
                    const state = {};
                    return (cell, val){
                        state[cell] = val;
                        return state;
                    }
                }, ...fs]; 
            },
        }
    }
    
    // --- app.js --- 
    import my_pack from 'my-package';
    
    const app = Firera({
        $root: {
            a: 10, 
            b: 20,
            c: ['getState', 'a', 'b']
        }
    }, {
        packages: ['htmlCells', my_pack],
    })
    
    app.set('a', 20);
    app.get('c'); // {a: 20, b: 20}
</code>
            This is an example of simple macros. It listens to changes in a number of cells and returns an object with it's values("state").
            That's how it works:
            <ul>
                <li>
                    Firera parses a plain base
                </li>
                <li>
                    It founds a string "getState" on a first position of a F-expression. It doesn't look as a cell type, so Firera decides it's a macros name.
                </li>
                <li>
                    Firera looks for "getState" macros in each package it has. Finally Firera founds need macros in "my_pack" package.
                </li>
                <li>
                    Firera runs the macros. It means, it runs the macros function, passing the current F-expression as an argument. In our case, a F-expression will be ["a", "b"].
                    As you see, it's an actual F-expr of cell we parse except for the very macros name.
                </li>
                <li>
                    Macros function returns a new F-expression, which looks like ['closureFunnel', () => { ... }, 'a', 'b']
                </li>
                <li>
                    It works as a regular F-expression then!
                </li>
            </ul>
            Therefore macros can not affect anything but the cell they are used in. This limitation make your code more predictable and clean.
            </div><div>
                For now, our macros is not very useful though.
                Instead of using it, we could just use a function:
                <code>
    var getState = () => {
        const state = {};
        return (cell, val){
            state[cell] = val;
            return state;
        }
    }
    const app = Firera({
        $root: {
            a: 10, 
            b: 20,
            c: ['closureFunnel', getState, 'a', 'b']
        }
    }, {
        packages: ['htmlCells', my_pack],
    })
                </code>
                This will be a little bit verbose, but more readable. So, yes, you should not use macros for everything you need - it's better to use functions.
                You should use macros only if you have a lot of places it can be used.
            </div><div>
                There real advantage of macros over functions is they have access to F-expression.
				Let's consider the example of "map" macros from Core package:
		<code>
map: (fs) => {
	const [map] = fs;
	const cells = Object.keys(map);
	const func = (cellname, val) => {
		if(!(map[cellname] instanceof Function)){
			return map[cellname];
		}
		return map[cellname](val);
	}
	return ['funnel', func, ...cells];
}

--- app.js ---

const app = Firera({
	bar: ['map', {
		foo: true,
		baz: (a) => a > 10
	}]
});
app.set('foo', 42);
app.get('bar'); // true

app.set('baz', 7);
app.get('bar'); // false

app.set('baz', 19);
app.get('bar'); // true
		</code>
				Here "map" macros transforms an object into a real F-expression. This is a commonly used macros, 
				and it's implementation via functions is much more verbose.
            </div>
			<div>
				<h3>
					Grid mixins
				</h3>
				... is a way to add some cells to each grid of your app.
				First you should know, that due to the Firera's nature, you can easily add mixins manually to any grid.
<code>
// an "app" plain base

var app_base = {
	input: '.name|getval',
	is_input_valid: [(a) => a.length > 2, 'input']
}

// a parameterized mixin

const writer = (name) => {
	const cellname = '$' + name + '_writer';
	const mixin = {};
	mixin[cellname] = [(a) => {
		console.log(name, 'is', a);
	}, name]
	return mixin;
}

const input_writer = writer('input');

// mixing

app_base = Object.assign({}, app_base, input_writer);

const app = Firera(app_base);

</code>
				Here we made small mixin that writes the value of some cell to console.
				The very "mixing" is just merging two objects with Object.assign!
				That is very simple and robust.
			</div>
			<div>
				A more powerful technique is a mixin that will be assigned to each grid of the app which uses some package.
				That's the way an Ozenfant templates work, e.g.
				TO do this, we need to define this mixin in a package with "eachGridMixin" key.
<code>
const some_package = {
	macros: {
		...
	},
	eachGridMixin: {
		foo: [_F.id, 'bar'],
		boo: [(a) => a + 10, 'foo']
	}
}
</code>
				This means that each grid of the app, which uses "some_package" package, will have this to cells added.
				If to consider more realistic example,
<code>
const simpleHtml = {
	eachGridMixin: {
		$html: [(el, tmpl) => {
			if(el && tmpl){
				el.innerHTML = tmpl;
			}
		}, '$el', '$template],
	}
}
</code>
				this will write an HTML template of each grrid wich has $el defined.
			</div>
	</div>
<?php } if(chapter('Further reading', 'debugging', 'Debugging and common mistakes')){ ?>
        <div>
            <h2>
                Debugging and common mistakes
            </h2>
			<h3>
				How to debug
			</h3>
            <div>
				Due to it's specific syntax and structure, it's rather difficult to debug a Firera application.
				The most useful thing you may need is to track changes to Firera cells.
				That could be easily done with some config keys.
<code>
const app = Firera({
	$root: {
		...
	}
}, {
	packages: ['htmlCells', 'ozenfant'],
	trackChanges: true,
	trackChangesType: 'log',
})
</code>
				A "change" is a set of cascad cell changes caused by one source(it may be DOM event, external call of "set()" method etc.)
				If you turn on tracking changes, you will see in your console the results of computing each cell in your app.
				For example, this is an example of what is logged in console after user moves a "line height" scrollbar in "vtable" example:
<code>
@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@=@
| /                |4 ...[name=th]|getval         | 530 |
| /                |5 ....viewport_heigth         | 530 |
| /                |6 .....max_scrollTop          | 1999490 |
| /                |7 ......pos_y                 | 800 |
| /                |8 .......top_offset           | 0px |
| /                |8 .......from                 | 40 |
| /                |9 ........data                | 
[Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object]
 |
| /                |8 ........vtable|css(top,px)  | 800 |
| /                |9 ........@@@_4               | undefined |
| /                |6 .....items_shown            | 27 |
| /                |9 ........data                | 
[Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object, Object]
 |
| /                |6 ......outer|css(height,px)  | 530 |
| /                |7 ......@@@_6                 | undefined |
</code>
				This looks like a table of three columns. First is a name of grid(here all are of root grid, "/).
				The second is a level of cell and it's name, and the third is an atual value a cell receives.
				A level represents the deepness of cell position in a grid, where 1 is the top position. For example, if we have cell "a" dependet on "b", and cell
				"c" which depends on "a", the levels of cell a, b and c will be 2, 1 and 3 respectively.
				Therefore, if a cell of level "2" changes, it can affect only cells of level 3 or bigger.
			</div><div>
				YOu can also track particuar cells. FOr this, you need your trackChanges parametr to be an array of cell you want to track:
<code>
	const app = Firera({
	$root: {
		a: ...
		b: ...
		c: ...
		d: ...
	}
}, {
	packages: ['htmlCells', 'ozenfant'],
	trackChanges: ['a', 'c'],
	trackChangesType: 'log',
})
</code>
				In this case only the changes in "a" and "c" will be shown, which is handy when you have a huge amount of cells.
				<!--<h3>
					Mistakes and error messages
				</h3>-->
				
			</div>
		</div>
<?php } if(chapter('Further reading', 'reflection', 'Reflection')){ ?>
        <div>
            <h2>
                Reflection
            </h2>
            <h3>
                $start and $remove
            </h3>
            <div>
		Sometimes we need to do something only once - e.g., when a grid is inited.
                Most of component-based frameworks have some kind of callbacks we assign on creating(or removing) a component.
                In Firera we have event streams, so, here come the "$start" and "$remove" streams(cells).
                Both of them are fired once: $start when the grid is loaded, and $remove when it's removed.
            </div>
            <h3>
                * event stream
            </h3>
            <div>
                There is an event stream which is a joint of all streams in a grid. It's a "*" stream.
                It will fire change on any cell change in a grid.
<code>
    const app = Firera({
        $root: {
            a: 10,
            b: 20,
            c: [(n, m) => n*m, 'a', 'b'],
            foo: [([cell, val]) => {
                console.log(cell, 'changed to', val);
                return 42;
            }, '*']
        }
    })

    app.set('b', 7);
    // 'b' changed to 7
    // 'c' changed to 70

    app.set('a', 'ololo');
    // 'a' changed to 'ololo'
    // 'c' changed to NaN
</code>
                So '*' gathers changes from all other cells. The only exception are cells that are dependent on '*'(because it may cause an infinite loop).
                
                <div class="nb">
                    You should not use this for debug purpose, there better tools for this(see "trackChanges" property of grid config)
                </div>
            </div>
            <div>
                This can be used when you need to reflect the structure of your grid to some other representation, e.g. render an HTML template based on your grid cells' values.
            </div>
	</div>
<?php }/*if(chapter('Writing TodoMVC in details', '', '---')){ ?>
        <div>
            <h2>
                
            </h2>
            <div>
				
			</div>
		</div>
<?php } */
