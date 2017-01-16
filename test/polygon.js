var Firera = require('../firera');



var app = Firera({__root: {
													foo: 10,
													$child_bar: {
														a: 10,
														b: 20,
														c: [(n, m) => n + m, 'a', 'b'],
														$child_baz: {
															a1: 10,
															b1: 32,
														}
													},
												}});
												app.set('foo', 20);
												
												app.set('a', 20, 'bar');
												console.log(app.get('c', 'bar')); // 40
												
												app.set('a1', 100, 'bar/baz');