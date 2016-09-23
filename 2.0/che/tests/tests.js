var che_parser = require('../parser');
var che = require('../che');
		
var id = a => a;
var always = (a) => {
	return () => a;
}

describe('Che', function () {
	it('Testing che 1', function(){
		var res = 0;
		var output = {};
		var obj = che.create('> (|(> b, c),(> e, f))/zzz/, d/aaa/', {
			onOutput: function(key, val){
				output[key] = val;
			},
			onSuccess: function(){
				++res;
			}
		});
		obj.drip("e", 1);
		obj.drip("f", 2);
		obj.drip("d", 3);
		assert.equal(res, 1);
		assert.equal(output.zzz, 2);
		assert.equal(output.aaa, 3);
	})
	it('Testing che pipes', function(){
		var res = 0;
		var output = {};
		var obj = che.create('> a, b|1, c/res|2/', {
			onOutput: function(key, val){
				output[key] = val;
			},
			onSuccess: function(){	
				++res;
			}
		}, function(state, val){
			state.ololo = val;
			return state;
		}, function(state, val){
			return state.ololo;
		});
		obj.drip("a", 1);
		obj.drip("a", 2);
		obj.drip("a", 3);
		obj.drip("b", 2);
		obj.drip("c", 3);
		assert.deepEqual(output, {res: 2});
		assert.deepEqual(obj.state, {a: 1, ololo: 2, c: 3});
	})
	it('Testing che quantifiers: * 1', function(){
		var output = {};
		var obj = che.create('> a, b*, c', {
			onOutput: function(key, val){
				output[key] = val;
			},
		}, function(state, val){
			state.ololo = val;
			return state;
		}, function(state, val){
			return state.ololo;
		});
		obj.drip("a", 1);
		obj.drip("b", 2);
		obj.drip("b", 3);
		obj.drip("b", 2);
		obj.drip("c", 3);
		obj.drip("b", 2);
		obj.drip("b", 2);
		assert.deepEqual(obj.state, {"a":1,"b":[2,3,2],"c":3});
		//assert.deepEqual(obj.state, {a: 1, ololo: 2, c: 3});
	})
	it('Testing che quantifiers: * 2', function(){
		var output = {};
		var obj = che.create('> a, b*, c', {
			onOutput: function(key, val){
				output[key] = val;
			},
		}, function(state, val){
			state.ololo = val;
			return state;
		}, function(state, val){
			return state.ololo;
		});
		obj.drip("a", 1);
		obj.drip("c", 3);
		assert.deepEqual(obj.state, {"a":1,"c":3});
		//assert.deepEqual(obj.state, {a: 1, ololo: 2, c: 3});
	})
	it('Testing che quantifiers: +', function(){
		var output = {};
		var obj = che.create('> a, b+, c', {
			onOutput: function(key, val){
				output[key] = val;
			},
		}, function(state, val){
			state.ololo = val;
			return state;
		}, function(state, val){
			return state.ololo;
		});
		obj.drip("a", 1);
		obj.drip("c", 3);
		assert.deepEqual(obj.state, {a: 1});
		//assert.deepEqual(obj.state, {a: 1, ololo: 2, c: 3});
	})
	it('Testing che quantifiers: {,}', function(){
		var output = {};
		var obj = che.create('> a, b{2,4}, c', {
			onOutput: function(key, val){
				output[key] = val;
			},
		}, function(state, val){
			state.ololo = val;
			return state;
		}, function(state, val){
			return state.ololo;
		});
		obj.drip("a", 1);
		obj.drip("b", 3);
		obj.drip("c", 3);
		obj.drip("b", 3);
		obj.drip("b", 3);
		obj.drip("b", 3);
		obj.drip("b", 3);
		obj.drip("c", 3);
		assert.deepEqual(obj.state, {a: 1, b: [3, 3, 3, 3], c: 3});
		//assert.deepEqual(obj.state, {a: 1, ololo: 2, c: 3});
	})
	it('Testing che quantifiers: {}', function(){
		var output = {};
		var obj = che.create('> a, (| b{2}, c{4}), d', {
			onOutput: function(key, val){
				output[key] = val;
			},
		}, function(state, val){
			state.ololo = val;
			return state;
		}, function(state, val){
			return state.ololo;
		});
		obj.drip("a", 1);
		obj.drip("b", 3);
		obj.drip("c", 3);
		obj.drip("b", 3);
		obj.drip("b", 3);
		obj.drip("b", 3);
		obj.drip("b", 3);
		obj.drip("d", 3);
		assert.deepEqual(obj.state, {"a":1,"b":[3,3],"c":[3],"d":3});
		//assert.deepEqual(obj.state, {a: 1, ololo: 2, c: 3});
	})
	it('Testing conditional events', function(){
		var output = {};
		var obj = che.create('> a, b?1|2, c', {
			onOutput: function(key, val){
				output[key] = val;
			},
		}, function(state, val){
			return val > 10;
		}, function(state, val){
			state.b = val;
			return state;
		});
		obj.drip("a", 1);
		obj.drip("b", 3);
		obj.drip("c", 3);
		obj.drip("b", 13);
		obj.drip("b", 3);
		obj.drip("b", 3);
		obj.drip("b", 3);
		obj.drip("c", 3);
		//console.log(JSON.stringify(obj.state));
		assert.deepEqual(obj.state, {a: 1, b: 13, c: 3});
	})
})

describe('Testing / operator', function () {
	it('1.', function(done){
		var output = {};
		var obj = che.create('> a, (/ (wait500()..., b), (wait200()..., c)), d', {
			onOutput: function(key, val){
				output[key] = val;
			},
		}, {
			wait500: function(state, cb){
				setTimeout(() => {
					cb(true);
				}, 500)
			},
			wait200: function(state, cb){
				setTimeout(() => {
					cb(true);
				}, 200)
			},
		});
		obj.drip("a", 1);
		setTimeout(() => {
			obj.drip("d", 1);
			obj.drip("b", 1);
			obj.drip("c", 1);
			assert.deepEqual(obj.state, {a: 1, c: 1, d: 1});
			assert.equal(obj.finished, true);
			done();
		}, 600);
	})
})

describe('Testing & operator', function () {
	it('Simple positive example', function(){
		var output = {};
		var obj = che.create('> a, (& b, d), c', {
			onOutput: function(key, val){
				output[key] = val;
			},
		});
		obj.drip("a", 1);
		obj.drip("d", 1);
		obj.drip("b", 1);
		obj.drip("c", 1);
		assert.deepEqual(obj.state, {a: 1, b: 1, c: 1, d: 1});
		assert.equal(obj.finished, true);
	})
	it('Simple negative example', function(){
		var output = {};
		var obj = che.create('> a, (& b, d), c', {
			onOutput: function(key, val){
				output[key] = val;
			},
		});
		obj.drip("a", 1);
		obj.drip("d", 1);
		obj.drip("c", 1);
		assert.equal(obj.finished, undefined);
	})
	it('Complex positive example', function(){
		var output = {};
		var obj = che.create('> a, (& (> b, v), d), c', {
			onOutput: function(key, val){
				output[key] = val;
			},
		});
		
		obj.drip("a", 1);
		obj.drip("b", 1);
		obj.drip("d", 1);
		obj.drip("v", 1);
		obj.drip("c", 1);
		assert.equal(obj.finished, true);
	})
})

describe('Other', function(){
	it('Testing objects as calback', () => {
		var output = {};
		var obj = che.create('> a, (& b, d|multiply_10), c', {
			onOutput: function(key, val){
				output[key] = val;
			},
		}, {
			multiply_10: function(state, val){
				state.ololo = val*10;
				return state;
			}
		});
		obj.drip("a", 1);
		obj.drip("d", 1);
		obj.drip("b", 1);
		obj.drip("c", 1);
		assert.deepEqual(obj.state, {a: 1, ololo: 10, b: 1, c: 1});
	})
	it('Testing sync functions', () => {
		var output = {};
		var obj = che.create('> a, (| b, c), check()|merge, d', {
			onOutput: function(key, val){
				output[key] = val;
			},
		}, {
			check: function(state){
				return state.a > 0;
			},
			merge: function(state, val){
				state.done = val;
				return state;
			},
		});
		obj.drip("a", 1);
		obj.drip("c", 1);
		obj.drip("d", 1);
		assert.equal(obj.state.done, true);
	})
	it('Testing async functions', (done) => {
		var output = {};
		var obj = che.create('> str, (| b, c), make_request()...|merge, d', {
			onOutput: function(key, val){
				output[key] = val;
			},
		}, {
			make_request: function(state, cb){
				//console.log('making request...');
				setTimeout(() => {
					//console.log('running callback');
					cb(true, 'some_test_data');
				}, 1000)
			},
			merge: function(state, val){
				state.res = val;
				return state;
			},
		});
		obj.drip("str", 'ololo');
		obj.drip("c", 1);
		obj.drip("d", 1);
		setTimeout(()=>{
			assert.equal(obj.state.res, 'some_test_data');
			done();
		}, 1100)
	})
	it('Testing async functions: parralel', (done) => {
		var output = {};
		var obj = che.create('> a, (| make_request1()...|merge, make_request2()...|merge, make_request3()...|merge){2}, b', {
			onOutput: function(key, val){
				output[key] = val;
			},
		}, {
			make_request1: function(state, cb){
				setTimeout(() => {
					cb(true, 'some_test_data_1');
				}, 100)
			},
			make_request2: function(state, cb){
				setTimeout(() => {
					cb(true, 'some_test_data_2');
				}, 120)
			},
			make_request3: function(state, cb){
				setTimeout(() => {
					cb(true, 'some_test_data_3');
				}, 50)
			},
			merge: function(state, val){
				state.res = state.res || [];
				state.res.push(val);
				return state;
			},
		});
		obj.drip("a", 42);
		obj.drip("c", 1);
		obj.drip("d", 1);
		setTimeout(() => {
			assert.deepEqual(obj.state, {"a":42,"res":["some_test_data_3","some_test_data_1"]});
			done();
		}, 500);
	})
})

// Calculator
// | .cancel|click//, (> ".num|click|getval"|append(a)*, (".operation|click"|make_operation, ".num|click|getval"|append(b)*)) 


	var str11 = `
			> 
				".select_rect|click"/active_figure/, 
				(".map|click"/points/*), 
				(
					| 
					".save|click"/"rectangles"|1/, 
					".discard|click"
					)/active_figure|false/`;
