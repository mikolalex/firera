Firera
-------
Firera is a Javascript library, which implements FRP(functional reactive programming) approach.
This helps to avoid troubles with managing state and eliminats inconsistency.
```js
var app = new Firera;

app('a').just(42);
app('b').is(function(num){ return num + 3;}, 'a');
app('b').get();// 45
// now the most interesting

app('a').set(10);
app('b').get();// 13
```

The main feature of Firera is andvanced using of FRP with DOM for building and managing GUI.
You can read the [guide|https://github.com/mikolalex/firera/blob/master/GUIDE.md] or ask me a [question|mailto:mikolalex@hushmail.com]