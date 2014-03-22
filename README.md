### [Attention!] The library is in active development now, it's API changes, so these examples are out of date!
They will be updated soon. So you can read the following only as the general description of library.
### Firera is small Javascript FRP library

FRP is functional reactive programming. It allows to work with variables like Excel cells: you create some cells, some of them rely on other with formulas, and when the value of one cell changes, the values of dependent cells change also.
This helps to describe realtions between data in more declarative way.

Firera allows to deal with raw values(for example, cell "a" is set manually to 42, cell "b" is described as cell "a" * 2. As the first cell changes, the second changes to.

Consider the following example:
~~~~~~
	    var fr = new Firera();
	    
	    fr("a").is(3);
	    fr("b").is(function(a){ return a*2;}, 'a');
	    fr("c").is(function(a, b){ return Math.pow(a, b);}, 'a', 'b');
	    
	    console.log(fr('b').get()); //  6
	    
	    fr('a').set(2);
	    
	    console.log(fr('b').get()); // 4
	    console.log(fr('c').get()); // 16
~~~~~~

Firera is focused on working with DOM
You can change not only the primitive values, but the state of DOM elements.
For example, fr(".someclass|visibility") will show the element, if set to true, and hide, if set to false.
Another example is a value of input field: fr("input[type=text]|value") will always give the current value of input field.

~~~~~~

	<div class="container">
	    <div class="login">
		<a href="/login">Login</a>
	    </div>
	    <div class="logout">
		<a href="/logout">Logout</a>
	    </div>
	    <br><br>
	    <input type="text" class="name"> - name<br>
	    <input type="text" class="surname"> - surname<br>
	    <input type="text" class="age"> - age<br>
	    <div class="full-info" style="padding:2em;margin:2em;border:1px solid black;"></div>
	</div>
	<script>
	    var fr = new Firera(".container");// ".container" is a scope, which this instance will operate within
	
	
	    fr("logged_in").is(false);
	    
	    fr(".logout|visibility").as('logged_in');
	    fr(".login|visibility").notAs('logged_in');
	    
	    fr("logged_in").set(true); // now you see "Logout" button
    
	    fr(".full-info|html").is(
    		function(a, b, c){
    		    if(a.length > 1 || b.length > 1 || c > 0){
    			    return 'You are ' + a + ' ' + b + ', your age is ' + c + '!';
    		    } else {
    			    return 'Enter more info!';
    		    }
    		},
    		".name|value",
    		".surname|value",
    		".age|value"
      );
	</script>

~~~~~~
You can also use batch assignment, which is robust. 
~~~~~~

    fr({
	a: '3',
	b: [
	    function(a){ return a*2;},
	    'a'
	],
	c: [
	    function(a, b){ return Math.pow(a, b)}, 
	    'a', 
	    'b'
	],
	logged_in: false,
	".logout|visibility": ['as', 'logged_in'],
	".login|visibility": ['notAs', 'logged_in'],
	".full-info|html": [
	    function(a, b, c){
		if(a.length > 1 || b.length > 1 || c > 0){
		    return 'You are ' + a + ' ' + b + ', your age is ' + c + '!';
		} else {
		    return 'Enter more info!';
		}
	    },
	    ".name|value",
	    ".surname|value",
	    ".age|value"
	],
    })

~~~~~~

