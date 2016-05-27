var che_parser = require('../parser');
var che = require('../che');
		
var id = a => a;
var always = (a) => {
	return () => a;
}

var er = {
	"type": "revolver",
	"subtype": ">",
	"children": [
		{
			"event": {
				"name": ".select_rect|click",
				"type": "cell"
			},
			"output": {
				"title": "active_figure",
				"pipes": []
			}
		}, {
			"event": {
				"name": ".map|click",
				"type": "cell"
			},
			"output": {
				"title": "points",
				"pipes": []
			},
			"quantifier": {
				"min": 0,
			}
		}, {
			"event": {
				"type": "revolver",
				"subtype": "|",
				"children": [{
					"event": {
						"name": ".save|click",
						"type": "cell"
					},
					"output": {
						"title": "rectangles",
						"pipes": ["1"]
					}
				}, {
					"event": {
						"name": ".discard|click",
						"type": "cell"
					}
				}]
			},
			"output": {
				"title": "active_figure",
				"pipes": ["false"]
			}
		}
	]
}

describe('Che', function () {
	//console.log = () => {};
	var str = `
			> 
				".select_rect|click"/active_figure/, 
				(".map|click"/points/*), 
				(
					| 
					".save|click"/"rectangles"|1/, 
					".discard|click"
					)/active_figure|false/`;
	it('Testing parser', function(){
		var parser = che_parser.get_parser(che_config);
		var res = parser(str);
		$(".test-parser").html(che_parser.dump(res.syntax));
		console.log(JSON.stringify(
			res.semantics));
		
		assert.deepEqual(
			res.semantics, 
			er
		);
		
	})
	it('Testing che', function(){
		var res = 0;
		var output = {};
		var obj = che.create('> (|(> b, c)/ololo/,(> e, f))/zzz/, d/aaa/', {
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
	it('Testing che quantifiers: *', function(){
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
	it('Testing che quantifiers: {}', function(){
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
})
