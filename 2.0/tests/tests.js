var id = a => a;
var always = (a) => {
	return () => a;
}

describe('Plain base', function () {
    /*it('Testing simple values conversion', function () {
        var pb = {
            'a': 10,
            'b': 32,
            'c': ['+', 'a', 'b']
        }
        var pbs = Firera.func_test_export.parse_pb(pb).plain_base;
        assert.deepEqual(pbs.$free, {
            a: 10,
            b: 32,
        });
        assert.equal(pbs.c[1](1, 2), 3);
    });*/
    it('Testing simple grid', function () {
        var app = Firera.run({
            __root: {
                $free: {
                    a: 10,
                    b: 32
                },
                'c': ['+', 'a', 'b']
            },
            'todo': {},
        });
        assert.equal(app.get('c'), 42);
        app.set('a', 20);
        assert.equal(app.get('c'), 52);
    });
    it('Testing nested fexpr', function () {
        var app = Firera.run({
            __root: {
                $free: {
                    'a': 10,
                    'b': 20,
                    'c': 12,
                },
                'd': ['+', ['-', 'b', 'c'], 'a']
            },
            'todo': {},
        });
        assert.equal(app.get('d'), 18);
        app.set('a', 20);
        assert.equal(app.get('d'), 28);
    });
    it('Testing async', function () {
        var handler = function(e, cb){
            cb($(this).val());
        }
        var app = Firera.run({
            __root: {
                '$free': {
                    '$el': $(".dummy")
                },
                'inp': ['async', function (done, [$prev_el, $now_el]) {
                        //console.log('ATTACHING HANDLERS', $now_el);
                        if($prev_el){
                            $prev_el.unbind('keyup');
                        }
                        $now_el.bind('keyup', function(){
                            done($(this).val());
                            console.log('KEYUP', app);
                        });
                    }, '^$el']
            }
        });
        //console.log('SETTING VALUES FROM DOM');
        app.set('$el', $(".async-ex input"));
        //console.log(app.root);
    });
    it('Testing passive listening', function () {
        var app = Firera.run({
            __root: {
                $free: {
                    'a': 10,
                    'b': 32,
                },
                'c': ['+', 'a', '-b']
            }
        });
        assert.equal(app.get('c'), 42);
        app.set('a', 20);
        assert.equal(app.get('c'), 52);
        app.set('b', 42);
        assert.equal(app.get('c'), 52);
        app.set('a', 30);
        assert.equal(app.get('c'), 72);
    });
    it('Testing map dependency', function () {
        var app = Firera.run({
            __root: {
                $free: {
                    'a': 10,
                    'b': 32,
                },
                'c': {
                    a: function(z){ return z + 1;}, 
                    b: function(z){ return z*(-1);
                }}
            }
        });
        app.set('a', 20);
        assert.equal(app.get('c'), 21);
        app.set('b', 42);
        assert.equal(app.get('c'), -42);
    });
    it('Testing FUNNEL dependency', function () {
        var app = Firera.run({
            __root: {
                $free: {
                    'a': 10,
                    'b': 32,
                },
                'c': ['funnel', function(cellname, val){
                    //console.log('got FUNNEL', arguments); 
                    return cellname + '_' + val;
                }, 'a', 'b']
            }
        });
        app.set('a', 20);
        assert.equal(app.get('c'), 'a_20');
        app.set('b', 42);
        assert.equal(app.get('c'), 'b_42');
    });
    it('Testing basic html functionality', function () {
        var app = Firera.run({
            __root: {
                $free: {
                    $el: $(".test-html")
                },
                'someval': [id, 'input|val'],
                '.blinker|visibility': [(a) => (a && a.length%2), 'someval']
            }
        });
        $('.test-html input').val('ololo').keyup();
        assert.equal(app.get('someval'), 'ololo');
    });
    it('Testing nested hashes', function () {
        var str = false;
        var app = Firera.run({
            __root: {
                $free: {
                    $el: $(".test-nested")
                },
                someval: [id, 'todo/completed'],
                $children: {
                    todo: 'item',
                },
            },
            'item': {
            	completed: {
            		'__def': str,
            		'.done|click': true,
            	}
            }
        });
        //$('.test-html input').val('ololo').keyup();
        assert.equal(app.get('someval'), str);
        app.set('completed', true, 'todo');
        assert.equal(app.get('someval'), true);
    });
    it('Testing multiple children', function () {
        var str = false;
        var app = Firera.run({
            __root: {
                $free: {
                    $el: $(".test-nested")
                },
                completed_counter: ['closure', function(){
                        var c = 0;
                        return function(arr){
                            var key = arr[0];
                            var prev_val = arr[1][0];
                            var val = arr[1][1];
                            if(prev_val === undefined) return c;
                            if(val) {
                                c++;
                            } else { 
                                c--; 
                            }
                            return c;
                        }
                }, '*/changes'],
                $children: {
                    1: 'item',
                    2: 'item',
                    3: 'item',
                },
            },
            'item': {
            	completed: {
            		'__def': str,
            		'.done|click': true,
            	},
                'changes': '^completed',
            }
        });
        app.set('completed', true, '2');
        assert.equal(app.get('completed_counter'), 1);
        app.set('completed', true, '1');
        app.set('completed', true, '3');
        app.set('completed', false, '2');
        assert.equal(app.get('completed_counter'), 2);
        //console.log('Now completed', app.get('completed_counter'));
    });
    it('Testing nested cells', function () {
        var app = Firera.run({
            __root: {
                $free: {
                    a: 42
                },
                'foo': ['nested', function(cb, a){
                        if(a % 2){
                            cb('odd', a);
                        } else {
                            cb('even', a);
                        }
                }, ['odd', 'even'], 'a'],
            }
        });
        assert.equal(app.get('foo.even'), 42);
        assert.equal(app.get('foo.odd'), null);
        
        app.set('a', 13);
        assert.equal(app.get('foo.even'), 42);
        assert.equal(app.get('foo.odd'), 13);
    });
    var add = (a, b) => a + b;
    it('Testing curcular dependency', function () {
        var app = Firera.run({
            __root: {
                $free: {
                    d: 42,
                },
                a: [add.bind(null, 10), 'b'],
                b: [add.bind(null, 20), 'c'],
                c: ['+', 'a', 'd'],
            }
        });
    });
    
    var get_by_selector = function(name, $el){
        //console.info("GBS", arguments);
        return $el ? $el.find('[data-fr=' + name + ']') : null;
    }
    
    it('Testing HTML package', function () {
        var app = Firera.run({
            __root: {
                $free: {
                    a: 42,
                },
                b: [add.bind(null, 20), 'a'],
                $children: {
                    item: 'person'
                }
            },
            person: {
                $free: {
                    name: 'John',
                    surname: 'Kovalenko',
                },
                '$el': [get_by_selector, '$name', '../$el'],
                'dummy': [id, '$writer'],
                'dummy2': [id, '$writer'],
                'dummy3': [id, 'dummy']
            }
        });
        // if $el in root is empty, it's <body> by default
        assert.equal(app.get('$el').get()[0], $('body').get()[0]);
        assert.equal(
            app.get('$el', 'item').get()[0], 
            $('div[data-fr=item]').get()[0]
        );

        app.set('name', 'Mykola', 'item');
    });

    it('Testing dynamic $children members', function () {
        var app = Firera.run({
        	__root: {
        		$free: {
        			registered: false,
        		},
	        	val: [id, 'block/foo'],
	        	$children: {
	        		block: [always(
	        			[{
	        				$free: {
	        					foo: 'bar'
	        				}
	        			}, {
	        				
	        			}]
	        		), 'registered'],
	        	}
        	},
        })
        assert.equal(app.get('val'), 'bar');
        app.set('registered', true);
    });
    it('Testing hash linking', function () {
        var app = Firera.run({
        	__root: {
        		$free: {
        			registered: false,
        			val: null,
        		},
	        	$children: {
	        		block: [always(
	        			[{
	        				$free: {
	        					foo: 'bar',
	        					boo: null
	        				}
	        			}, {
	        				'val': 'foo'
	        			},
	        			{
	        				'boo': 'registered'
	        			}]
	        		), 'registered'],
	        	}
        	},
        })
        assert.equal(app.get('val'), 'bar');
        assert.equal(app.get('boo', 'block'), false);
        app.set('registered', true);
        assert.equal(app.get('boo', 'block'), true);
    });
    /*it('Testing arrays', function () {
        var app = Firera.run({
        	__root: {
        		$free: {
	        		show: 'all',
	        		numbers: [1, 2, 3]
	        	},
	        	$children: ['arr', 'item', 'numbers']
        	},
        	'item': {
        		competed: {
        			__def: false,
        			'.done|click': true
        		}
        	}
        })
    });*/
})