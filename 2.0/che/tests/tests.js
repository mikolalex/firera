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
		var obj = che.link('> (|(> b, c),(> e, f)), d', {
			onOutput: function(key, val){
				//console.log('Che: got', key, val);
			},
			onSuccess: function(){
			}
		});
		obj.drip("e");
		obj.drip("f");
		obj.drip("d");
	})
})
