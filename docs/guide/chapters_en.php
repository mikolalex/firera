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
            __root: base
    })
    app.get('c'); // 30

    // Here comes an FRP magic
    app.set('b', 32);
    app.get('c'); // 42
");
            ?>
		<div>
			This simple example introduces functional reactive programming principles.
			Here, <span class="mn">a</span> and <span class="mn">b</span> are <i>observable</i> values, and <span class="mn">c</span> is a <i>computable</i> value.
			Collectively <span class="mn">a</span>, <span class="mn">b</span>, and <span class="mn">c</span> are called <i>cells</i>, because they act like cells in Excel: 
			some cells just have values, while the other are computed automatically according to their formulas.
			In this case, <span class="mn">a</span> and <span class="mn">b</span> have static unchanging values, and the value of <span class="mn">c</span> is set to be a sum of <span class="mn">a</span> and <span class="mn">b</span>.
			Hence the value of <span class="mn">c</span> depends on values of <span class="mn">a</span> and <span class="mn">b</span>.
		</div><div>	
			The value of <span class="mn">c</span> will <b>always</b> be the sum of <span class="mn">a</span> and <span class="mn">b</span>, we don't need to update it manually.
			There is no <i>proactive intrusion</i>: you cannot change the value of <span class="mn">c</span> arbitrary, it's changed based
			on the values of other cells (in this case, <span class="mn">a</span> and <span class="mn">b</span>).
			Alternatively <span class="mn">a</span>, <span class="mn">b</span> and <span class="mn">c</span> are called <i>data streams</i> as their values can change over time.
		</div><div>
			What's special about Firera is that it has a neat declarative syntax.
			While other FRP libraries, like Rx or Most, use method chaining, a Firera app is described as a plain object (POJO, or 
			plain old JS object) and pure functions. As we'll see later, this approach gives a lot of advantages.
		</div><div>
			We instantiate a Firera app by passing this object to Firera function. Then we can change  
			input values (like <span class="mn">a</span> or <span class="mn">b</span>) with <span class="mn">set(key, val)</span> method.
		</div><div>
			In Firera terms, <span class="mn">base</span> variable is called <i>simple base</i>, <span class="mn">a</span>, <span class="mn">b</span> and <span class="mn">c</span> are called <i>cells</i>, 
			the expression <span class="mn">[(n, m) => n + m, 'a', 'b']</span> is called an <i>F-expression</i>, 
			and the function used in the F-expression is called a <i>formula</i>.
		</div><div>
			Cells <span class="mn">a</span> and <span class="mn">b</span> are called <i>arguments</i> in relation to cell <span class="mn">c</span>.
			Cells which can be manually changed, like <span class="mn">a</span> or <span class="mn">b</span>, are called <i>free</i>.
		</div><div class="nb">
			Note that you couldn't change <span class="mn">c</span>, because it violates the main FRP principle: a computable cell value should be 
			calculated only based on its arguments, and never set manually.
		</div><div>
			A set of cells is called a <i>grid</i>. In previous example we had only one grid called <span class="mn">__root</span>. 
			This is a conventional name which indicates that this grid is the root grid of the app.
		</div><div>
			The main idea behind how Firera works is pretty simple: when some of the observable cells change, the values of <i>arguments</i>
			are passed to a corresponding <i>formula</i>.
			The result of that formula invocation becomes a new value for the cell.
		</div><div>
			Let's take a closer look at what happens when we run <span class="mn">app.set('b', 32);</span>:
			<ul>
				<li>
					Firera sets the values of cell <span class="mn">b</span> to 32;
				</li>
				<li>
					Firera looks for cells that depend on <span class="mn">b</span>. In this case there is only one cell — <span class="mn">c</span>;
				</li>
				<li>
					Firera tries to calculate the value of <span class="mn">c</span>:
					<ul>
						<li>
							Firera founds that it needs values of <span class="mn">a</span> and <span class="mn">b</span>;
						</li>
						<li>
							Firera takes the values of <span class="mn">a</span> (10) and <span class="mn">b</span> (32) and passes it to the <i>formula</i> of <span class="mn">c</span>;
						</li>
						<li>
							<!-- з цієї фрази зовсім не ясно, як відбувається біндінг значень, треба писати про весь Ф-експрешен -->
							as the formula of <span class="mn">c</span> is <span class="mn">(n, m) => n + m</span>, it passes 10 as the first argument and 32 as the second,
							and got ther result of 42;
						</li>
					</ul>
				</li>
				<li>
					Firera sets the current value of <span class="mn">c</span> to 42.
				</li>
			</ul>
			<div>
			A computable cell can depend on other computable cells too:
<code>
    const base = {
        a: 10,
        b: 20,
        exp: 2,
        c: [(n, m) => n + m, 'a', 'b'],
        d: [Math.pow, 'c', 'exp']
    }
    // Create a Firera app instance
    const app = Firera({
        __root: base
    })
    app.get('c'); // 30

    // Here comes an FRP magic
    app.set('b', 32);
    app.get('c'); // 42
</code>
			Here <span class="mn">d</span> depends both on free and computable cells(<span class="mn">exp</span> and <span class="mn">c</span> respectively).
			If you change the value of <span class="mn">a</span>, Firera will compute the value for <span class="mn">c</span>, and subsequently for <span class="mn">d</span>, as the value of <span class="mn">c</span> has changed.
			</div>
			<div>
				<!-- повторення, можливо, варто винести в окремий підрозділ Grids -->
				A set of cells, described within one simple base, is called a <b>grid</b>. In our example we had only one 
				grid called <span class="mn">__root</span>.
				It can be visualized like this:<br>
				<img src="img/grid_1.png" alt=""/>
				Lines here display dependencies between cells. Squares correspond to free cells and circles correspond to computable cells.
			</div>
			<div>
				The grid could be as big as you need. E.g., something like this:
				<img src="img/grid_2.png" alt=""/>
				The idea of Firera is to allow you to build the whole app logics as a big grid of computable cells.
			</div>
		</div>
		<!--<ul class="pq">
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
<? } if(chapter('Firera basics', 'dom', 'Working with DOM')){ ?>
	<div>
		<h2 id="work-with-dom">Working with DOM</h2>
		<div>
			Let's move to a more real-world example.
			Say we need to validate a new comment from a user input.
			User enters his login, email and comment text then presses submit button.
		</div>
		<div>
			Let's start with validating login. At first glance, for getting a stream of what user inputs as a login, we could write something like this:
<code>
// function to validate login length
var is_long = a => a.length > 2;

var base = {
    login: '',
    is_login_valid: [is_long, 'login'],
}
var app = Firera({
    __root: base,
});
// assigning handler that will change the 'login' cell
document.querySelector('input[name=login]')
    .addEventListener('change', function(e){
        app.set('login', e.target.value);
    })
</code>	
			Each time a user changes the value of input, we'll update the value of <span class="mn">login</span> cell. 
			And the value of <span class="mn">is_login_valid</span> cell will be computed depending on length of login. 
			This will work as expected, but	it's a verbose imperative approach. We don't like to assign event handlers manually.
		</div><div>
			Instead, we can include special package, called HtmlCells, to work with DOM. 
			It allows us to create data streams of DOM events in a declarative manner.
			HtmlCells is one of default Firera packages that are included in Firera distribution, so we can just 
			add its name to <span class="mn">packages</span> parameter inside our app's config.
		</div>
<code>
// function to validate login length
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
			For HtmlCells to work we need to define a cell named <span class="mn">$real_el</span> which should contain the root DOM node of the app.
			Then we just mention the name of cell <span class="mn">'input[name=login]|getval</span> and that's all!
			Firera will automatically create handler for the input.
			How it works step-by-step:
			<ul>
				<li>
					Firera founds the definition of <span class="mn">login</span> cell, which refers to the cell named <span class="mn">input[name=login]|getval</span>.
				</li>
				<li>
					The cell <span class="mn">input[name=login]|getval</span> seems to be uninitialized (as there is no definition of it
					in our simple base), looks like Firera needs to create an empty free cell, but...
				</li>
				<li>
					HtmlCells parses each cell name using regexp: <span class="mn">&lt;selector&gt;|&lt;aspect&gt; </span>. 
					<span class="mn">input[name=login]|getval</span> matches this expression.
					<span class="mn">&lt;selector&gt;</span> is any valid CSS selector, and <span class="mn">&lt;aspect&gt;</span> designates what 
					we want to listen to from this DOM node (you can find the full list of aspects on the HtmlCells package page). <!-- @Comment: непогано б це зробити лінком -->
				</li>
				<li>
					HtmlCells founds that we need to get a value of DOM node that corresponds to the <span class="mn">input[name=login]</span> selector.
					It assigns delegated event handler to <span class="mn">$real_el</span> node, which listens to "change" and "keyup" events in its subtree.
				</li>
				<li>
					Each time user enters something into the input field, the DOM handler fires and <span class="mn">input[name=login]</span> cell
					is updated with the value of this input field.
				</li>
			</ul>
		</div>
		<div>
			There is two kinds of html cells: getters and setters. 
			Getters listen for changes in DOM, e.g. events.
			Setters update the DOM with its value.
			Let's add a class to our input form to indicate its content is valid using html setter.
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
			<span class="mn">form|hasClass(valid)</span> is an example of a setter. 
			If the value of <span class="mn">is_login_valid</span> cell is true,
			it will add a <span class="mn">valid</span> class to nodes found with <span class="mn">form</span> selector in scope of <span class="mn">$real_el</span>.
			It uses <span class="mn">hasClass</span> aspect, which requires one parameter: the name of the class (<span class="mn">valid</span> in this example).
		</div><div class="nb">
			Notice that if you write login value like this: <div class="subcode">login: 'input[name=login]|getval',</div> 
			Firera will consider <span class="mn">login</span> as a static cell with a string value of <span class="mn">'input[name=login]|getval'</span>.
			We need it to listen to the other cell instead, that's why we write its name in brackets. All the primitive, 
			static values are written as is(except for arrays), and all the computable expressions are written in brackets.
		</div><div>
			Of course, we could write the same bit of code a bit simpler:
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
			We write a small example that shows how to work with DOM without pain of manually assigning handlers.
			Our app is almost completely declarative. 
			The only proactive intrusion here is using html setter <span class="mn">hasClass</span>, which changes the property of DOM node.
			We can avoid this later using cool Ozenfant templates.
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
<? } if(chapter('Firera basics', 'total_frp', 'Total FRP')){ ?>
	<div>
		<h2 id="total-frp">"Total FRP" concept</h2>
		<div>
			If you look closly at the previous example, you can see that every value that depend on data stream is also a data stream!
			<span class="mn">input[name=login]|getval</span> is an original data stream of values of input node in the DOM tree. 
			<span class="mn">login</span> field is also a data stream with the same values, and even <span class="mn">is_login_valid</span> is a data stream with Boolean values!
		</div><div>This table shows how the values of these cells change as user enters something into input:</div><div>
			<table class="tbl">
			<tr>
				<td><span class="mn">input[name=login]</span><br /> DOM node value</td>
				<td><span class="mn">input[name=login]</span><br /> cell value </td>
				<td><span class="mn">is_login_valid</span> cell value </td>
			</tr>
			<tr><td> M     </td><td> M </td><td> false </td></tr>
			<tr><td> My      </td><td>  My  </td><td>   false </td></tr>
			<tr><td> Myk </td><td> Myk   </td><td>    true </td></tr>
			<tr><td> Myko </td><td> Myko    </td><td>    true </td></tr>
			<tr><td> Mykol </td><td> Mykol    </td><td>    true </td></tr>
			<tr><td> Mykola </td><td> Mykola   </td><td>    true </td></tr>
			</table>
		</div>
		<div>
                    This shows how one stream depends on other with formula.
                    This is a concept of "Total FRP": whole application is a set of data streams which depend on each other. No classes, no methods...
		</div>
                <div>
                    A lot of modern libraries and frameworks combine the concept of FRP with OOP approach, using classes, methods etc. With Firera, you can write
                    robust and declarative code using only few powerful concepts: data streams and functions. Unlike MobX or Vue, you can use pure functions for calculating computed properties.
                </div>
	</div>
<? } if(chapter('Firera basics', 'streams', 'Managing streams')){ ?>
	<div>
		<h2 id="managing-streams">Managing streams</h2>
		<div>
			Remember our previous example: we still need to validate user's email (using RegExp).
			If the form is valid and user clicks a "Send" button, we should do something useful, like sending an AJAX request.
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
    add_comment_request: ['relayAll', (email, name, text) => {
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
			We implement this by using <span class="mn">&&</span>. It's a built-in Firera function that works like <span class="mn">&&</span> operator in JS, 
			but on data streams instead of simple values.
			It is equivalent to the following code:
		</div>
<code>
    is_form_valid: [(a, b) => {
        return Boolean(a && b);
    }, 'is_email_valid', 'is_login_valid'],
</code>
		<div>
			The <span class="mn">&&</span> built-it function is just a kind of syntactic sugar that shortens your code.
			This function runs each time the value of <span class="mn">is_email_valid</span> or <span class="mn">is_login_valid</span> changes, passing both arguments.
		</div>
		<div>
			Now we should understand, when the form is ready to be sent. It happens when:<br>
			a) user clicks the "Send" button;<br>
			b) the value of cell "is_form_valid" is true.<br>
		</div>
		<div>
			Naive approach will look like this:
<code>
    send_form: ['&&', 'is_form_valid', 'button.send|click'],
</code>
			but this will not work as expected.
			Imagine the following scenario:
			<ul>
				<li>
					User enters something into the text field, but leaves email field empty and clicks "Send".
				</li>
				<li>
					The value of <span class="mn">is_form_valid</span> will be <span class="mn">false</span>, the value of <span class="mn">button.send|click</span> is an Event object. 
					It's true, but the result will be false. Everything is right so far.
				</li>
				<li>
					Then user enters valid email. The value of <span class="mn">is_form_valid</span> becomes <span class="mn">true</span>.
				</li>
				<li>
					As the value of <span class="mn">is_form_valid</span> changes, Firera re-calculates the <span class="mn">send_from</span> cell. 
					<span class="md">true && Event == true!</span> And the form is sent immediately as email becomes valid... FAIL!
				</li>
			</ul>
			So, we should run the <span class="mn">send_form</span> function only when "Send" button is clicked,
			and do nothing when the value of <span class="mn">is_form_valid</span> changes.
			In Firera it's called <i>passive listening</i>.
			One cell depends on the other, but the change in parent cell doesn't invoke recalculation of the child.
			The syntax for this is simple: add minus <span class="mn">-</span> before the name of argument in F-expression.
<code>
    send_form: ['&&', '-is_form_valid', 'button.send|click'],
</code>
			After this small change our app works correctly!
			<div class="nb">
				Note, that this feature can be used only when you have at least one active argument.
<code>
    foo: ['-bar'],
</code>
				or
<code>
    foo: ['-bar', '-baz'],
</code>
				are pointless as <span class="mn">foo</span> will never be computed!
			</div>
		</div>
	</div>
<? } if(chapter('Firera basics', 'cell_types', 'Cell types')){ ?>
	<div>
		<div>
			<h2 id="cell-types">
				Cell types
			</h2>
			<h3>
				Funnel
			</h3>
			In Firera there are a few ways to calculate the value of a cell according to its arguments.
			For now we saw only one, default type.
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
			The principle is: when one of arguments is changed, we take the values of all arguments
			and pass them to our formula.
			But this way doesn't suit for all cases.
			Say we need our cell to listen to changes in several cells and console.log them.
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
			As you can see, this doesn't help us: each time some parent cell changes, we receive values of all parent cells.
			Therefore we don't know which one have actually changed.
			For such cases we have a special cell type called <i>funnel</i>:
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
			Cell type is specified as a first argument in an F-expression. 
			We can omit writing default cell type, but if we use funnel, we need to specify this explicitly.
			When using funnel type, we get not only the value, but also the name of the cell that changed.
			Only two arguments will be passed to the formula each time: a name and a value of changed cell.
			<!--<div class="nb">
				You can use any number of arguments when declaring a funnel type cell, but it uses only two.
			</div>-->
			This cell type allows to "join" several streams. <br />
			Here's another example:
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
			In this example <span class="mn">input_changed</span> will be the union of three other cells.
			
			<h3>
				Closures
			</h3>
			But what if we need to log all the history of changes in cells?
			We want to get something like this:
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
			... and so on. Obviously we'll need some way to store previous data.
			We used to use pure functions as formulas in Firera. Using some global variables 
			inside Firera formulas is a dedly sin! Our code will become dirty and fragile and this will eleminate
			all the advantages Firera gives us.
			Luckily there is another cell type called <i>closure</i>.
			Formula in this type of cell should return another function, which becomes a formula for a cell.
			It's easier to understand in code:
<code>
const app = Firera({__root: {
    a: 30,
    b: 12,
    c: ['closureFunnel', () => {
        // this function will run only once, when the grid is initiated.
        const log = [];
        // this function will be returned once and used as formula for 'c' cell
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
                            When using closure type, you should provide a <i>thunk</i>, returning another function, which becomes an actual formula.
			</div><div>
			The main advantage here is that you can create and use some closure variables, while your code remains clean, because this 
			variables could be accessed only from this particular function. 
			This helps you to avoid using global variables and prevent falling into shared mutable state abyss.
			</div><div>
			<!-- @Comment: є сенс зробити цей приклад першим, або додати пояснення про funnel до попереднього -->
			Another example of pure closure type (not mixed with funnel type) is a sum of cell values over time:
<code>
const app = Firera({__root: {
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
				Of course we might use immediately invoked function:
<code>
var get_sum = (() => {
    var sum = 0;
    return (n) => {
        sum += n;
        return sum;
    }
})();
const app = Firera({__root: {
    num: 10,
    sum: [get_sum, 'num']
}})
</code>
				This will give us the same behaviour. But only if we use this function once!
				Firera can instanciate a number of similar grids (see chapter <i>Lists</i> below<!-- @Comment: краще лінк на назві, замість below-->), and by using closure cell type
				you are guaranteed each function will have its own closure. If you do it manually, you'll get the same closure for all grids.
			</div>
			<h3>
				Async
			</h3>
			<div>
				The next useful cell type is called <i>async</i>.
				It's used when we deal with async functions (i.e. function which perform async actions,
				not the ES6 async functions).
				It works like a default cell type, but the first argument for our formula will always be 
				a callback function used to return data when async function finishes.
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
				Async type allows us to use asynchronously executed functions in our grid with minimal additional efforts.
                                <div class="nb">
                                    dNote that when using async type, a value returned by "return" operator in formula will be ignored.
                                </div>
			</div>
			<h3>
				Nested
			</h3>
			<div>
				The last useful cell type is <i>nested</i>. 
				As you might notice, in Firera the result of computaion is always put to only one cell.
				On the other hand in imperative programming we are used to see how (non-pure) function 
				can not only return some value, but also change a few other variables. 
				While generally harmful this behaviour can sometimes help a lot.
			</div>
			<div>
				In Firera we cannot arbitrary change the value of some computed cell. 
				But nested type allows us to put value to a set of predefined cells of our choice.	
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
				Here we use nested cell <span class="mn">nums</span>, which has two subcells: <span class="mn">odd</span> and <span class="mn">even</span>.
				Nested cells look like async cells: we receive a callback function as a first argument.
				But we should not only return the value, but also specify the subcell we want to put this value in.
				Then you can use this subcells as you would any other cell. 
				The set of subcells is defined in the F-expression after the formula.
				The name of a subcell is defined as <span class="mn">parent_cell_name + '.' + subcell_name</span>.
				<div class="nb">
					Note that you must put the value into one of the subcells, you cannot put it into
					the whole cell (like <span class="mn">nums</span>) and cannot refer to this cell in other F-expressions.
				</div>
				Nested cells allow us to divide streams and in this sense they are opposite in function to funnel cells that join streams together.
				<div class="nb">
					Using callback to return a value allows us to use both synchronous and asynchronous functions,
					therefore nested cell type excludes async cell type.
				</div>
			</div>
			<h3>
				Mixing cell types
			</h3>
			<div>
				As you might notice, you can mix some cell types in one cell, some you cannot. 
				E.g., you can mix funnel and closure cell types: <span class="mn">'closureFunnel'</span> or <span class="mn">'funnelClosure'</span> — both ways are correct.
				Yet you should never try to combine async and nested types as they exclude each other.
				Here is a handy <a href="../doc.html#cell-types-compatibility">table</a> displaying possible combinations of cell types.
			</div>
		</div>
	</div>
<? } if(chapter('Grid hierarchy', 'nested_grids', 'Nested grids')){ ?>
	<div>
		<h2>
				Nested grids
		</h2>
		<h3>
				Static nested grids
		</h3>
		<div>
			For now we considered only examples whith one grid.
			However this is often not enough for complex applications. 
			When working with DOM it's natural to have a tree of components that can be hierarchically nested.
			So we need a way to put one grid into another making a tree of grids.
			Each Firera app could have only one root grid which has nested children.
		</div>
		<div>
			As you may remember, Firera hates proactive intrusion into app's workflow, so we could not manually change the value of computable cells.
			By the same logic we couldn't force the creation of a nested grid inside some formula or elsewhere.
			Instead, there is a simple convention: each value of the cell
			with name starting with <span class="mn">$child_</span> will be considered a simple base for a nested grid:
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
			There are two cells with static values (both are Objects): <span class="mn">$child_crane</span> and <span class="mn">heron</span>, but there is a big
			defference between them.
			The name <span class="mn">$child_heron</span> matches our RegExp, so a new nested grid will be created,
			having the value of this cell as a simple base.
			At th same time <span class="mn">heron</span> will cause no additional effects, its value will remain just an Object.
		</div>
		<div>
			So the grid with a name <span class="mn">crane</span> (prefix <span class="mn">$child_</span> is cut) will be created as a child of the root grid.
			To test this let's get some value from the <span class="mn">crane</span> grid.
			If we need to retrieve a value of some nested grid cell, we have to pass a route to it as a second argument to <span class="mn">get()</span> method.
			In this case the route will be <span class="mn">/crane</span>, which means "grid named <span class="mn">crane</span> nested in the <span class="mn">/<span> (root) grid.
		</div>
		<div>
			Let's make another nested level:
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
			Note that you can choose any name for your grid, including those which start from numbers, e.g., "1" or "42".
		</div>
		<h3>
			Linking cells between grids
		</h3>
		Isolated grids, even when they are nested, are of little use though.
		We need a way to link cells from different grids so the data can flow between them in both directions.
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
		Here you can see a few ways to link cells from different grids.
		<span class="mn">../multiplier</span> is linked to the parent's <span class="mn">multiplier</span> cell. 
		This means that it will get the same values as that cell.
		This syntax is similar to the one used in the file system, but it has some differences that are described in further examples.
		And there we refer to the nested grid's cell, using its name:
<code>
    first_crane_weight: ['crane_1/weight'],
</code>
		In second nested grid we use absolute addressing: '/mutiplier'. 
		The slash at the beginning means "start from root grid".
		There's also a way to link to all nested or all parent grids' cells:
<code>
'any_click_in_children': ['*/some_click'], // listen to all 'some_click' cells 
                                        // from all immediate-children grids
'any_click_inside': ['**/some_click'], // listen to all 'some_click' cells 
                                       // from all nested grids
'any_click_upper': ['^^/some_click'], // listen to all 'some_click' cells 
                                      // from the whole chain of parent grids
</code>
		There is one limitation to linking: there can be only one slash in the addresses. It means you could NOT write something like this:
		<span class="mn">../../a</span>, <span class="mn">../foo/b</span> etc.
	</div>
<? } if(chapter('Grid hierarchy', 'lists', 'Lists')){ ?>
	<div>
		<h2>
			Lists
		</h2>
		<h3>
			Static data-based lists
		</h3>
		As you might have noticed, our recent example violates the DRY principle — we have a lot of code repeated.
		The first and the second grids differ only in data while their structure is basicly the same.
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
        $child_crane_2: Object.assign({}, cranes[1], crane),
    }});
</code>
		Here we start to divide data and structure.
		Both nested grids share one structure.
		To create a number of similar grids different only in their free cells we have a <i>list</i> expression:
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
			So what is a list? It's neither a cell type, nor a function. It's a macro.
			We'll take a closer look at them later, but for now let's see what parameter has a <span class="mn">list</span> macro.
			Two parameters are required: <span class="mn">type</span> and <span class="mn">data</span>, or <span class="mn">datasource</span>.
			A <span class="mn">type</span> should be either a name of a grid type or a link to a simple base object which describes a grid.
			<span class="mn">data</span> should be an array with objects used as source for the list. 
			List macro creates nested grid for each element of <span class="mn">data</span> array.
		</div>
		<div>
			In our example, the grid type is <span class="mn">crane</span>. This grid type is described in object which we pass to Firera function.
			For each element of <span class="mn">data</span> array a grid of <span class="mn">crane</span> type will be created, passing
			<span class="mn">width</span> and <span class="mn">height</span> to appropriate cells.
		</div>
		<br><br>
		But all these child grids WILL NOT become immediate descendants of our root grid!
		There will be one intermediate grid which holds all the list items.
		So the resulting hierarchy will look like this: 
		<div style="text-align: center;">
			"/"<br>
			|<br>
			"/cranes"<br>
			/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\<br>
			"0" &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"1"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; "2"<br>
		</div>
		It's similar to a JavaScript data structure: an array is a kind of an object, which along with array items could have other fields.
		Here <span class="mn">/</span> (root grid) has an "<span class="mn">array</span>" called <span class="mn">cranes</span>, which has items <span class="mn">0</span>, <span class="mn">1</span> and <span class="mn">2</span>.
		<div>
			That's why we changed our links a bit: now we have <span class="mn">^^/mutiplier</span> instead of <span class="mn">../multiplier</span>, 
			because the direct parent of <span class="mn">0</span>, <span class="mn">1</span> and other grids in the list will be a <span class="mn">/cranes</span> grid and not the root grid.
		</div>
		<h3>
				Cell as datasource for a list
		</h3>
		Another way to build our list is to use a cell as a source of data. This means, each time a value of a cell changes, 
		our list will be updated, automaticly removing and creating new grids.
		To achieve this we need to use <span class="mn">datasource</span> parameter instead of <span class="mn">data</span>.
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
<?php } if(chapter('Writing TodoMVC in details', 'todomvc_start', 'Displaying a list')){ ?>
	<div>
		<h1>
			Writing TodoMVC using Firera
		</h1>
		<h2>
			Displaying a list
		</h2>
		<div>
			We will make HTML layout and then begin implementing our TodoMVC app starting with simply displaying a list of todos.
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
        __root: root_component,
        todo: todo_component
    }, {
        packages: ['htmlCells', 'neu_ozenfant'],
    }
);
</code>
			This small piece of code already gives us what we want: a list of to-dos is automatically rendered within the ul.todos block of the root grid.
			How it works:
			<ul>
				<li>
					Ozenfant founds a <span class="mn">todos</span> variable in a root grid's template and bounds it to the ul.todos node.
				</li>
				<li>
					<span class="mn">todos</span> is a list, i.e. nested grid which consist of a set of grids of one type.
				</li>
				<li>
					Each item on this list (in this case, with an item type is <span class="mn">todo_component</span>) is rendered inside ul.todos node.
				</li>
			</ul>
			This is a beginning of a component-based architecture. Here <span class="mn">todo_component</span> is an independent component with its own template, and <span class="mn">root_component</span> is
			another component, which uses <span class="mn">todo_component</span>. Firera's structure enforces you to write separate components without overhead.
			<div>
				The next step is to make our list dynamic — we should implement adding new todo items.
			</div>
		</div>
	</div>
<?php } if(chapter('Writing TodoMVC in details', 'dynamic_list', 'Dynamic list')){ ?>
	<div>
		<h2>
			Dynamic list
		</h2>
		<div>
			Currently our to-dos are built from the static array.
			Obviously, this array will change with time: we can add new items and remove existing.
		</div>
		<div>
			In some popular frameworks the following approach is used: you change the content of the array manually (i.e. push, pop etc.), 
			and then the system computes the diff betwenn old and a new values, founds the changes and updates the DOM.
			In Firera, we can't manually change the value of the array. We should instead describe it as a data stream, which depends on other streams (for adding new and deleting existing items).
			That's why we need our array to be a computable cell. This should work like this:
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
			Here <span class="mn">add_todo</span> will be a stream of newly added to-dos (strings or objects), and <span class="mn">remove_todo</span> will be a stream of indices we want to remove.
			We then use <span class="mn">arr_todos</span> cell as a datasource for our list.
		</div>
		<div>
			This is a frequent construction, so, luckily, Firera already has a macro for such dependancy, called <span class="mn">arr</span>.
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
			<span class="mn">arr_todos</span> listens to <span class="mn">add_todo</span> and <span class="mn">remove_todo</span> data streams, creating new item using former and removing existing using latter.
		</div>
		<div>
			However, cells <span class="mn">add_todo</span> and <span class="mn">remove_todo</span> are not defined so far. In this case, Firera will make a warning for listening to non-existing cell.
			First we need to define <span class="mn">add_todo</span> cell. It happens after user presses Enter on input field.
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
			A cell <span class="mn">input[name="new-todo"]|enterText</span> listens to keyup events in selected input field and returns an entered value when user hits Enter.
			<span class="mn">add_todo</span> takes this string values and wraps them in an object as a <span class="mn">text</span> field.
			The only thing we still need to do is to flush an input node after user presses Enter.
			That's why we always set its value to an empty string('') as new to-do comes.
			<span class="mn">clear_add_todo</span> cell always gets an empty string value after to-do is added, and then this
			empty value is put into the input node:
<code>
    text(name: new-todo, placeholder: What needs to be done?, value: $clear_add_todo)
</code>
		</div>
	</div>
<?php } if(chapter('Writing TodoMVC in details', 'list_item', 'Working with list item: checking and removing todo')){ ?>
	<div>
		<h2>
			Working with list items: checking and removing to-dos
		</h2>
        <div>
			A to-do item needs some DOM node (not nessesarily a checkbox) which will be used for checking.
			Clicking on it should cause our <span class="mn">checked</span> field to toggle. 
			Depending on this, we will add or remove <span class="mn">.checked</span> class to todo item root node.
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
			Each time you click on <span class="mn">.checked</span> zone, the value of <span class="mn">completed</span> should be changed to opposite.
			This is already implemented by <span class="mn">toggle</span> macro (you can also do this using a closure-typed cell, which remembers the previous value of the cell), which takes a cell name
			and an initial value as an argument.
		</div>
		<div>
			Therefore, our <span class="mn">completed</span> cell will have boolean values that we'll use to add or remove <span class="mn">completed</span> class to the root node of components.
		</div>
		<div>
			Let's now implement removing to-do items.
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
        __root: root_component,
        todo: todo_component
    }, {
        packages: ['htmlCells', 'neu_ozenfant'],
    })
</code>
			We should know the index of an element in the list we want to remove. It's always contained in <span class="mn">$i</span> cell, which is one of the system predefined cells.
			At the same time, we should listen to it passively (with <span class="mn">"-"</span> prefix), in order for our <span class="mn">remove_todo</span> event to happen only on click (and not on <span class="mn">$i</span> change).
		</div>
		<div>
			Then we should link and listen to <span class="mn">remove_todo</span> cells of each grid in the list from root grid.
			We can do this by referencing <span class="mn">**/remove_todo</span>.
			<div class="nb">
				Why <span class="mn">**</span> instead of <span class="mn">*</span>? As you remember, one asterisk <span class="mn">*</span> means immediate descendants of a grid. In this case, it will be the only grid — the <span class="mn">todos</span> grid which, in turn, holds all of the list's grids.
				So we need to use two asterisks to listen to all grids in the subtree.
			</div>
			We pass the index of an element in the list, but why use <span class="mn">_F.ind(0)</span> function?
			Well, when listening to changes in other grid's cells through <span class="mn">*</span> or <span class="mn">**</span>, you'll receive an array of <span class="mn">[val, path]</span> as a value of the cell,
			where <span class="mn">val</span> is the original value and <span class="mn">path</span> is a path to the grid in which that cell is contained.
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
			This is used to determine the grid's name of cell we're listening to. We need only the value, so we should always return the first element of our argument.
			We can use <span class="mn">.ind(num)</span> function from Firera.utils package. It returns a function which always returns <span class="mn">num</span>-th element of its first argument.
			<div class="nb">
				If so, why don't we get the index of list's to-do item from path?
				A grid's name in the list does not always coincide with its position. The name is like id: if you have a list of three grids and remove them, then add a new one,
				its name will be <span class="mn">3</span>, not <span class="mn">0</span>.
			</div>					
		</div>
	</div>
<?php } if(chapter('Writing TodoMVC in details', 'arr_deltas', 'Using array deltas')){ ?>
	<div>
        <h2>
            Using array deltas
        </h2>
        <div>
			Seems like it works now, but... Let's looks closer at how data transform in our app:
			<ul>
				<li>
					We assemble particular changes (adding and removing items) into array.
				</li>
				<li>
					This array is passed to a list as a datasource.
				</li>
				<li>
					The list compares array with its previous version, calculates the diff and makes updates.
				</li>
			</ul>
			Obviously, useless work is done: we make an array from a stream of changes and then compute changes from that array!
			So... Can we just pass array changes to the list directly?
			Yes! And here's what we need to do:
			<ul>
				<li>
					Create a single stream of array changes by joining "add" and "remove" streams.
				</li>
				<li>
					Transform it to an appropriate form.
				</li>
				<li>
					Use this stream as a source for our list!
				</li>
			</ul>
			How does the stream of changes will look like?
			It's a kind of a diff info for the array.
			In Firera.utils there is a handy function that computes the changes by comparing two arrays.
			It is <span class="mn">arr_deltas(old_arr, new_arr)</span>.
<code>
    var arr_1 = ['ene', 'bene', 'raba'];
    var arr_2 = ['ene', 'bene', 'raba', 'kvinter', 'finter'];
    var arr_3 = ['ene', 'bene', 'raba', 'kvinter', '______', 'zhaba'];

    _F.arr_deltas(arr_1, arr_2); // [["add","3","kvinter"],["add","4","finter"]]
    _F.arr_deltas(arr_2, arr_1); // [["remove","3"],["remove","4"]]
    _F.arr_deltas(arr_2, arr_3); // [["add","5","zhaba"],["change","4","______"]]
</code>
			It can produce three type of changes: "add", "remove" and "change".
			If there is a key in the new array that is absent in the old one, it produces an "add" change.
			If there is no key in the new array that was present in the old one, it's a "remove" change.
			And if the value of the array item is changed, it's a "change" change.
			As you can see, "add" and "change" changes require a value, while the "remove" change needs only an index.
			For the "add" change an index may be omitted.
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

const app = Firera({
        __root: root_component,
        todo: todo_component
    }, {
        packages: ['htmlCells', 'neu_ozenfant'],
    }
);
app.set('arr_todos', _F.arr_deltas([], init_data));
</code>
			Note that instead of using <span class="mn">arr</span> macro for <span class="mn">arr_todos</span>, we use <span class="mn">arrDeltas</span> macro.
			It does exactly what we need: transforms a stream of new values into "add" array changes, 
			and "pop" stream is transformed into "remove" changes.
		</div>
		<div>
			Next important change is that we use <span class="mn">deltas</span> parameter instead of <span class="mn">datasource</span>.
			Now our list will listen to a stream of deltas and make changes appropriately, therefore we don't need to make any diffs anymore.
		</div>
		<div>
			The only transformation of data into changes is for the initial value of <span class="mn">arr_todos</span>. It's done with <span class="mn">_F.arr_deltas</span> function which was mentioned before.
		</div>
		<hr>
		<div>
			Using array (and, later, objects) deltas streams instead of data is a powerful approach. Of course, at first sight, it might look a bit strange and low-level.
			But it's useful for joining different parts of our app and it gives a lot of advantages. 
		</div>
		<div>
			When you begin to think in terms of data deltas, you'll realize how many cases it covers.
		</div>
		<div>
			Another advantage, which complies the Firera phylosophy, is that it allows to have a single point where the changes to the array is gathered (as an opposite to the approach where 
			the data may be changed in different parts of the code).
		</div>
	</div>
<?php } /* if(chapter('Writing TodoMVC in details', 'counting_uncompleted', 'Counting uncompleted todos')){ ?>
        <div>
            <h2>
                Counting uncompleted todos
            </h2>
            <div>
				The "deltas approach" will help us to display a number of uncompleted to-dos. Instead of recalculating this number each time an array changes, we can listen
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
<?php }*/ if(chapter('Writing TodoMVC in details', 'editing_todo', 'Editing to-dos')){ ?>
	<div>
		<h2>
			Editing to-dos
		</h2>
		<div>
			We need to make possible editing to-dos. On double click an input field should appear and on pressing Enter or Escape we should return back. 
			Enter saves the modification done and Escape cancels it.
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
			We changed the template of <span class="mn">todo</span> component, so that input field will be shown when <span class="mn">isEditing</span> variable is true.
			Now we need to define: 
			<ul>
				<li>
					when <span class="mn">isEditing</span> becomes true, and when it becomes false;
				</li>
				<li>
					when we save entered data as the <span class="mn">text</span> field of a to-do item.
				</li>
			</ul>
			Our <span class="mn">isEditing</span> cell should become true when user double clicks on the item, and false when he presses Enter or Escape.
			To implement this behaviour we may use funnel:
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
			This is a common case, and we have a handy macro for it called <span class="mn">map</span>.
<code>
isEditing: ['map', {
    '.text|dblclick': true,
    'text': false,
    'input[name=todo-text]|press(Esc)': false
}],
</code>
			Now when <span class="mn">.text|dblclick</span> cell updates, our cell becomes true and so on. It's quite simple and expressive.
		</div>
		<div>
			Our to-do's text should update with a value of input field when user presses Enter. <span class="mn">enterText</span> aspect covers exactly this case.
			It returns the value of the input field when user presses Enter.
			And when <span class="mn">text</span> field changes, we should set <span class="mn">isEditing</span> to false. We use <span class="mn">text</span> cell instead of <span class="mn">input[name=todo-text]|enterText</span>
			as a argument for <span class="mn">isEditing</span> to minimize DOM dependency.
		</div>
		<hr>
		<div>
			However there is an issue that breaks our logic: when one item becomes edited, other edited items should return to their default state.
			That requires data exchange through the parent grid, as siblings cannot communicate with each other.
		</div>
		<div>
			The solution to this conundrum is following: when double-clicking, we will bubble this event to the parent grid together with a number of grids we clicked.
			Then all other grids will listen to this event from the parent grid and cancel editing if it's not the same grid that we clicked.
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
    edited_todo: ['relay', '.text|dblclick', '-$i'],
    i_am_edited: ['=', '-$i', '../active_todo'],
    isEditing: ['map', {
        'i_am_edited': _F.id,
        'text': false,
        'input[name=todo-text]|press(Esc)': false
    }],
}
</code>
			A <span class="mn">relay</span> macro returns the value of a second argument if the first one is true.
			So when user double clicks on to-do's name it will emit the number of to-do items.
		</div>
		<div>
			Remember the list is a grid itself. We can add some cells to it like to any other cell. 
			To do this, we specify the <span class="mn">self</span> parameter of the list config.
			Our <span class="mn">todos</span> list will listen to all changes in <span class="mn">edited_todo</span> cells of the downstream grids.
		</div>
		<div>
			Then we should determine whether it's the same grid we clicked or not.
			For this purpose the <span class="mn">i_am_edited</span> cell is used. 
			It will be true only for the actual grid we clicked on.
		</div>
		<div>
			And the last thing we should do is to make <span class="mn">isEditing</span> dependent on <span class="mn">i_am_edited</span> cell instead of directly dependent on double click events.
		</div>
	</div>
<?php } if(chapter('Writing TodoMVC in details', 'check_all_todos', 'Checking all to-dos and counting incompleted')){ ?>
	<div>
		<h2>
			Checking all to-dos and counting incompleted
		</h2>
		<div>
			Now let's create a button which will make all to-dos completed.
			It should become inactive when all the to-dos are already completed.
		</div>
		<div>
			Thinking within Firera paradigm, we should now wonder: what determines the state of <span class="mn">competed</span> field?
			For now, there's two factors: clicking on the checkbox and clicking on the "Check all" button. 
			In the first case the state should become the opposite to the current one and in the second the state will be always set to <span class="mn">true</span>.
			For this purpose we have <span class="mn">mapPrev</span> macro. It works like <span class="mn">map</span> macro, but it also passes the previous value of argument cell to the function.
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
			That is: when user clicks on the checkbox, our function receives current value of <span class="mn">.checked|click</span> as its first argument and previous value of <span class="mn">completed</span> cell as the second.
			And we return the opposite to the previous value.
			And when user clicks on "Check all" button, it always becomes true (checked).
		</div>
		<div>
			We should also make "Check all" button inactive when all to-dos are completed.
			We can count all (in)completed fields with <span class="mn">count</span> macro that works with lists.
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
<?php } if(chapter('Writing TodoMVC in details', 'clear_completed', 'Clearing completed to-dos')){ ?>
	<div>
		<h2>
			Clearing completed to-dos
		</h2>
		<div>
			When user clicks on "Clear completed" button, we should remove all the completed to-do items.
            Typical imperative approach will look like this: you look for the completed items in to-do's list and remove completed.
            But in Firera there is no imperative intrusion. Instead, we need to update the conditions of when the item is removed.
            For now, it's removed only when user clicks on remove button:
<code>
    const todo_component = {
        ...
        remove_todo: [
            'relay',
            '.remove|click', 
            '-$name'
        ],
    }
</code>
			Now we need to update this: we should also remove an item when "Clear completed" button is clicked and item is completed.
			We'll use joining streams macro to accomplish this:
<code>
    const root_component = {
        // creating a "clear completed" signal from click on block
        '~clear_completed': ['.clear-completed|click'],
    }

    const todo_component = {
        remove_todo: [
            'relay',
            ['join', 
                '.remove|click', 
                [_F.first, '-completed', '^^/clear_completed']
            ], 
            '-$name'
        ],
    }
</code>
            The logic here is like this:
            <ul>
                <li>
                    When user clicks <span class="mn">.clear-completed</span> button, our <span class="mn">clear_comleted</span> cell gets a value.
                    Here <span class="mn">clear_completed</span> acts as a signal: it's not relevant what value it actually has (a DOM event in this case), but it's relevant <i>when</i> it's triggered, 
                    i.e. when this value changes.
                </li>
                <li>
                    Our <span class="mn">remove_todo</span> cell listens to changes in <span class="mn">clear_completed</span> cells and gets a signal when user clicks one.
                </li>
                <li>
                    Nested F-exression <span class="mn">[_F.first, '-completed', '^^/clear_completed']</span> will return the value of <span class="mn">completed</span> cell when <span class="mn">clear_completed</span> signal goes through.
                    So, if the cell is completed, it'll be true.
                </li>
                <li>
                    <span class="mn">relay</span> will return <span class="mn">$name</span> value if the first argument (in our case — a nested F-expression) is true. 
					The to-do item will be removed when <span class="mn">clear_completed</span> is triggered and it's completed, or when <span class="mn">.remove</span> button is clicked. 
                </li>
            </ul>
            This is a good example of a single-source-of-truth priciple in Firera: there should be only one place where a particular state is defined.
		</div>
	</div>
<?php } if(chapter('Writing TodoMVC in details', 'final_app', 'Final code of the application')){ ?>
	<div>
		<h2>
			Final code of the application
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
    arr_todos: ['arrDeltas', {
        push: 'add_todo', 
        pop: 'remove_todo',
    }],
    'clear_add_todo': [_F.always(''), 'add_todo'],
    display: [_F.fromMap({
            all: '*',
            undone: true,
            done: false,
        }), '.display-buttons > *|click|attr(class)'
    ],
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
    edited_todo: ['relay', '.text|dblclick', '-$i'],
    i_am_edited: ['=', '-$i', '../active_todo'],
    isEditing: ['map', {
        'i_am_edited': _F.id,
        'text': false,
        'input[name=todo-text]|press(Esc)': false
    }],
    remove_todo: [
        'relay',
        ['join', 
            '.remove|click', 
            [_F.first, '-completed', '^^/clear_completed']
        ], 
        '-$name'
    ],
    'shown': ['!=', '^^/display', 'completed'],
}

const app = Firera({
            __root: root_component,
            todo: todo_component
        }, {
            packages: ['htmlCells', 'neu_ozenfant']
        }
);
app.set('arr_todos', _F.arr_deltas([], init_data));
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
			All of these you can implement and add to your Firera app with the help of the packages.
			Package is a plain object with a few possible keys. 
			Let say we need to create a package with a couple of macros:
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
        __root: {
                a: 10, 
                b: 20,
                c: ['some_macros', 'a', 'b']
        }
    }, {
        packages: ['htmlCells', my_pack],
    }
</code>
            As we import a package and add it to the Firera <span class="mn">app.packages</span> config, all its macros become available for use inside our app.
            <h3>
                Cell macros
            </h3>
            Cell macros make your F-expressions more beautiful.
            Macro receives an F-expression as an argument and returns a new F-expression that will be used for this cell.
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
        __root: {
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
            This is an example of a simple macro. It listens to changes in a number of cells and returns an object with its values ("state").
            That's how it works:
            <ul>
                <li>
                    Firera parses a simple base.
                </li>
                <li>
                    It founds a string <span class="mn">getState</span> on a first position of an F-expression. It doesn't look like a cell type, so Firera decides it's a macro's name.
                </li>
                <li>
                    Firera looks for <span class="mn">getState</span> macro in each package it has. Finally Firera founds needed macro in <span class="mn">my_pack</span> package.
                </li>
                <li>
                    Firera runs the macro. It means, it runs the macro's function, passing the current F-expression as an argument. In our case, the F-expression will be <span class="mn">['a', 'b']</span>.
                    As you see, it's an actual F-expression of the cell we parse except for the very macro name.
                </li>
                <li>
                    Macro's function returns a new F-expression, which looks like <span class="mn">['closureFunnel', () => { ... }, 'a', 'b']</span>.
                </li>
                <li>
                    It works as a regular F-expression!
                </li>
            </ul>
            Macros can not affect anything but the cell they are used in. This limitation make your code more predictable and clean.
        </div>
		<div>
			For now, our macro is not very useful though.
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
        __root: {
            a: 10, 
            b: 20,
            c: ['closureFunnel', getState, 'a', 'b']
        }
    }, {
        packages: ['htmlCells', my_pack],
    })
</code>
            This will be a little bit verbose, but more readable. So, yes, you should not use macros for everything you need — it's better to use functions.
            You should use macros only if you have a lot of places it can be used in.
        </div>
		<div>
			The real advantage of macros over functions is that they have access to an F-expression.
			Let's consider the example of <span class="mn">map</span> macro from Core package:
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
			Here <span class="mn">map</span> macro transforms an object into a real F-expression. 
			This is a commonly used macro and its implementation via functions is much more verbose.
		</div>
		<div>
			<h3>
				Grid mixins
			</h3>
			Grid mixins is a way to add some cells to each grid of your app.
			First you should know, that due to the Firera's nature, you can easily add mixins manually to any grid.
			<code>
// an "app" simple base

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
			The "mixing" pat is just merging two objects with <span class="mn">Object.assign</span>!
			That is very simple and robust.
		</div>
		<div>
			A more powerful technique is a mixin that will be assigned to each grid of the app which uses some package.
			That's the way an Ozenfant templates work.
			To do this we'll need to define this mixin in a package with <span class="mn">eachGridMixin</span> key.
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
			It means that each grid of the app, which uses <span class="mn">some_package</span>, will have this added to its cells.
			In a more realistic example:
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
			This will write an HTML template of each grid wich has <span class="mn">$el</span> defined.
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
			Due to its specific syntax and structure, it's rather difficult to debug a Firera application.
			The most useful thing you may need is to track changes to Firera cells.
			That could be easily done with config keys:
<code>
const app = Firera({
    __root: {
            ...
    }
}, {
    packages: ['htmlCells', 'neu_ozenfant'],
    trackChanges: true,
    trackChangesType: 'log',
})
</code>
			A "change" is a set of cascad cell changes caused by one source (it may be DOM event, external call of <span class="mn">set()</span> method etc.)
			If you turn on tracking changes, you will see the results of computing each cell in the app in your console.
			Here's an example of what is logged into the console after user moves a line height scrollbar in "vtable" example: <!-- @Comment: Link here? -->
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
			This is a table with three columns. 
			The first is the name of grid (here all are names of the root grid).
			The second is a level of cell and its name, and the third is an actual value that cell receives.
			A level represents the "deepness" of cell positioned in the grid, where 1 corresponds to the top level position. 
			For example, if we have a cell <span class="mn">a</span> dependet on cell <span class="mn">b</span>, and cell
			<span class="mn">c</span> which depends on <span class="mn">a</span>, the levels of cells <span class="mn">a</span>, <span class="mn">b</span> and <span class="mn">c</span> will be 2, 1 and 3 respectively.
			Therefore, if a cell of level 2 changes, it can affect only cells of level 3 or lower.
		</div>
		<div>
			You can also track particuar cells. To do this, you need your <span class="mn">trackChanges</span> parameter to be an array of cell names you want to track:
<code>
const app = Firera({
    __root: {
            a: ...
            b: ...
            c: ...
            d: ...
    }
}, {
    packages: ['htmlCells', 'neu_ozenfant'],
    trackChanges: ['a', 'c'],
    trackChangesType: 'log',
})
</code>
			In this case only the changes in cells <span class="mn">a</span> and <span class="mn">c</span> will be shown, which is handy when you have a huge amount of cells.
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
			Sometimes we need to do something only once, e.g., when a grid is initialized.
            Most of component-based frameworks have some kind of callbacks we assign on creating or removing a component.
            In Firera we have data streams, so here come the <span class="mn">$start</span> and <span class="mn">$remove</span> streams (cells).
            Both of them are fired once: <span class="mn">$start</span> when the grid is loaded, and <span class="mn">$remove</span> when it's removed.
		</div>
		<h3>
			* data stream
		</h3>
        <div>
            There is a data stream which is a join of all the streams in a grid, called <span class="mn">*</span> stream.
            It will fire change event on any cell change in a grid.
<code>
const app = Firera({
    __root: {
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
            So <span class="mn">*</span> gathers changes from all other cells. The only exception are cells that are dependent on <span class="mn">*</span>, because it may cause an infinite loop.
			
            <div class="nb">
                You should not use this data stream for debug purposes, there are better tools for this (see "trackChanges" property of grid config). <!-- @Comment: link here? -->
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
