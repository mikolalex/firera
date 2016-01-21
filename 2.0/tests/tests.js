describe('Plain base', function() {
	it('Testing simple values conversion', function() {
		var pb = {
			'a': 10,
			'b': 32,
			'c': ['+', 'a', 'b']
		}
		var parsed_pb = Firera.func_test_export.parse_pb(pb);
		assert.deepEqual(parsed_pb, {
			"$free": {
				a: 10,
				b: 32,
			},
			"c":["+","a","b"]
		});
	});
})