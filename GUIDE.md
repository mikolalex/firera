Firera
=========
About. Simple cells
-------
Firera is a Javascript library, which implements FRP(functional reactive programming) approach.
This helps to avoid troubles with managing state and eliminats inconsistency.
```js
var app = new Firera;

app('a').just(42);
app('b').is(function(num){ return num + 3;}, 'a');
app('b').get();// 45
// now the most important

app('a').set(10);
app('b').get();// 13


```

Some vars are free, independend, like "a" in this examples. Such vars can se set manually by set() function. The others are dependent, computable vriables, their value depend on other variables and a formula(function passed).
When assigning dependent variable, you should pass a function first, and then the names of variables.
All variable in Firera are usually called "cells", as the Excel cells.

```js
var get_greeting = function(firstname, lastname){
    return 'Hello, ' + firstname + ' ' + lastname + '!';
}

app('name').just('Aare');
app('surname').just('Olander');

app('greeting').is(get_greeting, 'name', 'surname');

```
As you see, Firera also makes you to write functions, that MUST be pure.
But let's go forward for something more useful.

Arrays
------------
You can assign FRP-arrays by passing an array to are() method.

```js
app('people').are(['Ivan', 'Sasha', 'Ed']);
app('peoplenum').is('people/$length'); // special variables names start with "$"
app('peoplenum').get();// 3

app('people').push('Lena'); // use push to add items to array, as in native JS arrays
app('peoplenum').get();// 4

// You can retrive the values back
app('people/1').get();// 'Sasha'

// You can assign an array of objects(which will be converted to Firera objects)

app('cities').are([
    {
        name: 'Kyiv',
        population: 4000000,
    },
    {
        name: 'Kharkiv',
        population: 1500000,
    },
    {
        name: 'Kostyantunivka',
        population: 60000,
    }
])

```

Firera arrays are called lists. You manipulate all list's members via each() method.

```js
app('cities').each({
    isbig: [function(num){ return num > 1000000}, 'population'],
    country: 'Ukraine',
})

app('cities/1').get();// {name: "Kharkiv", population: 1500000, country: "Ukraine", isbig: true}

```

It's obvious, that some values will be common for the whole list, so they are stored in the "shared" field of each list.

```js

app('rounds').are([
    {
        radius: 10,
    },
    {
        radius: 20,
    },
    {
        radius: 42,
    },

])
app('rounds').shared('pi').just(Math.PI);
app('rounds').each({
    square: [function(p, r){ return Math.round(p*r*r)}, 'pi', 'radius'],
})

app('rounds/2/square').get();// 5542


```

Binding to HTML
--------
The main feature of Firera is not just FRP(for it was invented and developed in many libraries before), but an advanced usage of FRP with DOM.
The simplest way to use it is just binding some cells to DOM elements.
```html
<div class="user">
    <div class="name" data-fr="name"></div>
    <div class="name-input">
        <input type="text"> - enter your name
    </div>
</div>
<script>

    var app = new Firera;
    app('name').is("input[type=text]|value");
    // very important step
    app.applyTo('.user');
</script>
```
If the Firera hash(which is created by new Firera) is applied to a DOM node, it starts trying to bind it's variables to inner nodes, which are marked with "data-fr" attribute.
Now, as you start typing in input, the "div" with class "name" will be dynamically filled with what you type.
Let's improve our example.
```html
<div class="user">
    <div class="name" data-fr="name"></div>
    <div class="name-input">
        <input type="text"> - enter your name
    </div>
</div>
<script>
    var validate_string = function(str){
        return str.length < 4 ? "It's too short!" : str;
    }

    var app = new Firera;
    app('name').is(validate_string, "input[type=text]|value");
    // very important step
    app.applyTo('.user');
</script>
```
Let's read it step by step.

validate_string() is just pure function, that takes string and returns an "error message" if it's too short, or the string itself otherwise.

app('name').is(validate_string, "input[type=text]|value"); - it's just an assighment of new variable called "name".
It is calculated by applying validate_string() function to the variable "input[type=text]|value". But what is this variable?
It was not assigned before, thus we use it. 

That is special kind of variables, called HTML cells.
It contains of two parts: CSS selector and an aspect, divided by "|". CSS selector tells us, what node to select, and "aspect" means what kind of information we'll take from the node.

Here are some aspects:
* value - returns a value of input element or innerHTML of usual tag(.e.g. div). String
* mouseover - return if the mouse is over this element. Boolean.
* visibility - if the element is visible. Boolean.

And you can add new aspects by yourself, if you need.

Default cell binding. HTML templates
---------------------

As you can see, by default, all cells are bound to HTML tags, marked by attribute 'data-fr="%cellname%"'. In Firera, there is no way to restrict output of cells to HTML(like projections). This is done for simplicity. If you don't need some variable to be shown, don't mention it in the HTML.
There are multiple ways to set template of the current Firera hash.
The first is to apply a hash to existing node, so that it's innerHTML will become a template(as you'v seen previously).
The second way is by assigning a cell named "$template" to the hash(cells that begin with "$" are inner special vars, so you should use $  in the beginning for usual cells).
```html
<script>

var get_user_template_by_gender = function(gender){
    return gender === 'female'
            ?
            '<div class="woman">Hi, Ms.<span data-fr="name"></span> <span data-fr="surname"></span>!</div>'
            :
            '<div class="man">Hi, Mr.<span data-fr="name"></span> <span data-fr="surname"></span>!</div>';
}

app('name').just('Sergiy');
app('surname').just('Ivanenko');
app('gender').just('male');

app('$template').is(get_user_template_by_gender, 'gender');

app.applyTo('.current_user');

</script>
<div class="current_user">

</div>


```
So, the content of div.current_user will be 
```html 
<div class="man">Hi, Mr.<span data-fr="name">Sergiy</span> <span data-fr="surname">Ivanenko</span>!</div>
```
As you might notice, when binding the cell to DOM node with "data-fr" attribute there is no need in assinging innerHTML for this node, because it'll be overwritten by the value of cell.

List rendering
---------------------

But how we can render an array to HTML?
```html
<div class="models-list">
    <h1> Popular color models </h1>
    <div data-fr="models">
        <div class="model">
            <h3>Name</h3>
            <div data-fr="name"></div>
            <h3>Description</h3>
            <div data-fr="descr"></div>
        </div>
    </div>
</div>


<script>

app('models').are([
    {
        name: 'CMYK',
        descr: 'Cyan, Magenta, Yellow, BlacK',
    },
    {
        name: 'RGB',
        descr: 'Red, Green, Blue',
    },
    {
        name: 'LAB',
        descr: 'Lightness, A, B',
    },

]);

app.applyTo('models-list');

</script>

```

When list is bounded to the HTML tag with "data-fr" attribute, it's innerHTML beacomes a template for the list!
Each member of the list app('models') will receive the following template:
```html
        <div class="model">
            <h3>Name</h3>
            <div data-fr="name"></div>
            <h3>Description</h3>
            <div data-fr="descr"></div>
        </div>
```
You can still set a template for the list manually by assigning variable $template
```js
app('models').shared('$template').just('<div>Some dummy template</div>');
// 'Shared' part of list is accessible from all it's items
app('models').list[0]('$template').get();// <div>Some dummy template</div>
app('models').list[2]('$template').get();// <div>Some dummy template</div>


```
You might try to change the template of particular item:
```js
app('models/0/$template').just('ololo');// this doesn't work!

```
But it will not work as you expect!
Instead of changing the template of one item, it'll change the shared $template variable for all list items!

What can you do with Lists
--------
```js
// Init empty list
app('fruits').are([]);

// create link for quick access
var fruits = app('fruits');

// Add an item to it
fruits.push('apple');
fruits.push('pear');

// Count the number of items in list
fruits.shared('$length').get();// 1

// Get a particular element
fruits.get(1);// 'pear'

// Clear list and set new data
fruits.setData(['apricot', 'peach']);
fruits.get();// ['apricot', 'peach']


```

As you noticed, you may push to array both objects and primitive values.
When you push a primitive value, it's automnativally converted to an object {__val: 'your_primitive_value'}

```js
fruits.list[0]('__val').get();
fruits.list[0].get();
// - it's equal for primitive values in List

```
You can add some cell dependencies while creating the list, or do it later.
you push a primitive value, it's automnativally converted to an object {__val: 'your_value'}

```js
app('rounds').are({
    $data: [// $data field contains plain data
        { 
            radius: 10,
        },
        { 
            radius: 44,
        },
        { 
            radius: 37,
        },
    ],
    each: { // each field contains cell dependencies, formulas
        'area': [function(r){ return Math.PI * r *r;}, 'radius'],
    }
})

// So it will look like

app('rounds').get();

/*

[  
   {  
      "radius":10,
      "area":314.1592653589793
   },
   {  
      "radius":44,
      "area":6082.123377349839
   },
   {  
      "radius":37,
      "area":4300.840342764427
   }
]

*/

app('rounds').each({
    circumference: [function(r){ return Math.round(2*Math.PI*r);}, 'radius']
})

// You can get only some fields of list items

app('rounds').pick(['circumference', 'radius']);
// [{"circumference":63,"radius":10},{"circumference":276,"radius":44},{"circumference":232,"radius":37}] 

app('rounds').pick('circumference'); 
// [63, 276, 232] 

```

```js

```








