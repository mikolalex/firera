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




