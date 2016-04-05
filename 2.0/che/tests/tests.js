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
				"chars": "*"
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
	var str = '> ".select_rect|click"/active_figure/, (".map|click"/points/*), (| ".save|click"/"rectangles"|1/, ".discard|click")/active_figure|false/';
	it('Testing parser', function(){
		var parser = che_parser.get_parser(che_config);
		var res = parser(str);
		$(".test-parser").html(che_parser.dump(res.syntax));
		//console.log(JSON.stringify(
		//	res.semantics));
		assert.deepEqual(
			res.semantics, 
			er
		);
		
	})
	it('Testing che', function(){
		var res = 0;
		var output = {};
		var obj = che.link('> (|(> b, c)/ololo/,(> e, f))/zzz/, d/aaa/', {
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
		var res = 0;
		var output = {};
		var obj = che.link('> a*, b|1, c/res|2/', {
			onOutput: function(key, val){
				output[key] = val;
			},
			onSuccess: function(){
				++res;
			}
		});
		obj.drip("a", 1);
		obj.drip("f", 2);
		obj.drip("d", 3);
		assert.equal(res, 1);
		assert.equal(output.zzz, 2);
		assert.equal(output.aaa, 3);
	})
})
