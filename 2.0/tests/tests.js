describe('Plain base', function() {
	it('Testing simple values conversion', function() {
		var pb = {
			'a': 10,
			'b': 32,
			'c': ['+', 'a', 'b']
		}
		var parsed_pb = Firera.func_test_export.parse_pb(pb);
		assert.deepEqual(parsed_pb.$free, {
			a: 10,
			b: 32,
		});
		assert.equal(parsed_pb.c[0](1, 2), 3);
	});
	it('Testing simple grid', function() {
    	var app = Firera.run({
    		__root: {
    			'a': 10,
    			'b': 32,
    			'c': ['+', 'a', 'b']
    		},
    		'todo': {},
    	});
		assert.equal(app.get('c'), 42);
        app.set('a', 20);
		assert.equal(app.get('c'), 52);
	});
	it('Testing async', function() {
    	var app = Firera.run({
    		__root: {
    			'$free': {
    				'$el': $(".async-ex input[type=text]")
    			},
    			'inp': ['async', function(done, $old, $new){
    				console.log('Got', arguments);
    			}, ':$el']
    		},
    		'todo': {},
    	});
    	console.log(app.root);
	});
})