var Firera = require('../firera');
var che = require('../che/che');
var Ozenfant = require('../ozenfant/ozenfant');

var id = a => a;
var not = a => !a;
var always = (a) => {
	return () => a;
}


(function(){
	window.performance = window.performance || {};
	performance.now = (function() {
	  return performance.now       ||
			 performance.mozNow    ||
			 performance.msNow     ||
			 performance.oNow      ||
			 performance.webkitNow ||
			 function() { return new Date().getTime(); };
	})();
	var pool = {};
	var Timer = function(name){
		this.name = name;
		this.start = performance.now();
		this.time = 0;
	};

	Timer.prototype.pause = function(){
		if(this.paused){
			//console.log('already paused!');
		}
		var end  = performance.now();
		this.time = this.time + (end - this.start);
		this.paused = true;
	}
	Timer.prototype.resume = function(){
		if(!this.paused){
			//console.log('IS NOT paused!');
		}
		this.start = performance.now();
		this.paused = false;
	}
	Timer.prototype.stop = function(){
		if(!this.paused){
			var end  = performance.now();
			this.time = this.time + (end - this.start);
		}
		this.stopped = true;
		console.log(this.name, 'took', this.time, 'ms');
		delete pool[this.name];
	}

	window.timer = function(name) {
		if(name == 'stop_all'){
			for(var i in pool){
				pool[i].stop();
				delete pool[i];
			}
			return;
		}
		if(!pool[name] || (pool[name].stopped == true)){
			//console.log('creating new timer', name);
			pool[name] = new Timer(name);
		}
		return pool[name];
	};
	})()

var prop = (key) => {
	return (a) => {
		return a instanceof Object ? a[key] : undefined;
	}
}
var adder = (a) => {
	return (b) => {
		return b+a;
	}
}
var second = (__, a) => a;

var as = (propName, defValues = {}) => {
	return (val) => {
		if(val === undefined) return;
		var obj = {};
		obj[propName] = val;
		return Object.assign(obj, defValues);
	}
}

var ind = (index = 0) => {
	return (arr) => {
		return arr instanceof Object ? arr[index] : null;
	}
}

var triggerEnter = (el) => {
	var e = jQuery.Event("keyup");
	e.which = 13; //choose the one you want
	e.keyCode = 13;
	el.trigger(e);
}

var fromMap = function(map, def){
	return (val) => {
		return (map[val] !== undefined) ? map[val] : def;
	}
}

describe('Basic Firera functionality', function () {
    /*it('Testing simple values conversion', function () {
        var pb = {
            'a': 10,
            'b': 32,
            'c': ['+', 'a', 'b']
        }
        var pbs = Firera.func_test_export.parse_pb(pb).plain_base;
        assert.deepEqual(pbs.$init, {
            a: 10,
            b: 32,
        });
        assert.equal(pbs.c[1](1, 2), 3);
    });*/
    it('Testing simple grid', function () {
        var app = Firera({
            __root: {
				a: 10,
				b: 32,
                'c': ['+', 'a', 'b']
            },
            'todo': {},
        });
        assert.equal(app.get('c'), 42);
        app.set('a', 20);
        assert.equal(app.get('c'), 52);
    });
    it('Testing nested fexpr', function () {
        var app = Firera({
            __root: {
				a: 10,
				b: 20,
				c: 12,
                d: ['+', ['-', 'b', 'c'], 'a']
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
        var app = Firera({
            __root: {
                '$el': $(".dummy"),
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
        var app = Firera({
            __root: {
				'a': 10,
				'b': 32,
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
        var app = Firera({
            __root: {
				'a': 10,
				'b': 32,
                'c': ['map', {
                    a: function(z){ return z + 1;}, 
                    b: function(z){ return z*(-1);
                }}]
            }
        });
        app.set('a', 20);
        assert.equal(app.get('c'), 21);
        app.set('b', 42);
        assert.equal(app.get('c'), -42);
    });
    it('Testing FUNNEL dependency', function () {
        var app = Firera({
            __root: {
				'a': 10,
				'b': 32,
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
        var app = Firera({
            __root: {
                $el: $(".test-html"),
                'someval': [id, 'input|getval'],
                '.blinker|visibility': [(a) => (a && a.length%2), 'someval']
            },
			$packages: ['simpleHtmlTemplates', 'htmlCells']
        });
        $('.test-html input').val('ololo').keyup();
        assert.equal(app.get('someval'), 'ololo');
    });
    it('Testing nested hashes', function () {
        var str = false;
        var app = Firera({
            __root: {
                $el: $(".test-nested"),
                someval: [id, 'todo/completed'],
                $child_todo: 'item',
            },
            'item': {
				$init: {
					completed: str,
				},
            	completed: ['map', {
            		'.done|click': true,
            	}]
            }
        });
        //$('.test-html input').val('ololo').keyup();
        assert.equal(app.get('someval'), str);
        app.set('completed', true, 'todo');
        assert.equal(app.get('someval'), true);
    });
    it('Testing multiple children', function () {
        var str = false;
        var app = Firera({
            __root: {
                $el: $(".test-nested"),
                completed_counter: ['closure', function(){
                        var c = 0;
                        return function(arr){
							if(!arr) return;
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
				$init: {
					completed: str,
				},
            	completed: ['map', {
            		'.done|click': true,
            	}],
                'changes': ['^completed'],
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
        var app = Firera({
            __root: {
                a: 42,
                foo: ['nested', function(cb, a){
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
    /*it('Testing curcular dependency', function () {
        var app = Firera({
            __root: {
                a: [add.bind(null, 10), 'b'],
                b: [add.bind(null, 20), 'c'],
                c: ['+', 'a', 'd'],
                d: 42,
            }
        });
    });*/
    
    var get_by_selector = function(name, $el){
        //console.info("GBS", arguments);
        return $el ? $el.find('[data-fr=' + name + ']') : null;
    }
    
    it('Testing HTML package', function () {
        var app = Firera({
            __root: {
                a: 42,
                b: [add.bind(null, 20), 'a'],
                $child_item: 'person',
            },
			$packages: ['simpleHtmlTemplates', 'htmlCells'],
            person: {
				'name': 'John',
				'surname': 'Kovalenko',
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
        var app = Firera({
        	__root: {
        		registered: false,
	        	val: [id, 'block/foo'],
	        	$child_block: [
					always(
						[{
							$init: {
								foo: 'bar'
							}
						}, {

						}]
					), 
					'registered'
				],
        	},
        })
        assert.equal(app.get('val'), 'bar');
        app.set('registered', true);
    });
    it('Testing hash linking', function () {
        var app = Firera({
        	__root: {
				registered: false,
				val: null,
	        	$child_block: [always(
						[{
							$init: {
								foo: 'bar',
								boo: null
							}
						}, {
							'val': 'foo'
						},
						{
							'boo': 'registered'
						}]
					), 'registered'
				],
        	},
        })
        assert.equal(app.get('val'), 'bar');
        assert.equal(app.get('boo', 'block'), false);
        app.set('registered', true);
        assert.equal(app.get('boo', 'block'), true);
    });
    it('Testing deltas, arrays', function () {
        var app = Firera({
        	__root: {
				show: 'all',
				numbers: ['just', [1, 2, 3]],
                arr_changes: ['arr_deltas', 'numbers']
        	}
        })
        app.set('numbers', [1, 2, 5, 5]);
        
        var deltas = app.get('arr_changes');
        assert.deepEqual(deltas, [["add","3",5],["change","2",5]]);
        app.set('numbers', []);
        
        deltas = app.get('arr_changes');
        assert.deepEqual(deltas, [["remove","0"],["remove","1"],["remove","2"],["remove","3"]]);
        app.set('numbers', [1, 2, 5, 5]);
    });
    
    var add = function(vals){
        if(vals){
            return [['add', null, as('text')(vals)]];
        }
    }
    
    var second = (__, a) => a;
	var get = (i) => {
		return (a) => {
			if(a && a[i] !== undefined) return a[i];
		}
	}
    
    it('Testing html val set & get', function(){
        var app = Firera({
            __root: {
                $el: ['just', $(".test-input-setget")],
                "foo": [(a) => { console.log('New todo:', a)}, 'new_todo'],
                "new_todo": [second, 'input|press(Enter,Esc)', '-input|getval'],
                "input|setval": [always(''), 'new_todo']
            },
            'item': {
				text: '',
                completed: ['map', {
					'.done|click': true
				}, false]
            }
        })
        
    });
	var mk_logger = (a) => {
		return (b) => {
			console.log(a, b);
			return b;
		}
	}
    var logger = (varname, a) => {
        console.log(varname, ':', a);
        return a;
    }
    it('Testing removing from list', function(){
        var $root = $(".test-list-remove");
        var app = Firera({
			$packages: ['simpleHtmlTemplates', 'htmlCells'],
            __root: {
                $child_todos: ['list', {
					type: 'item',
					push: [as('text'), '../new_todo'],
					pop: [function(a){
						if(a && a[0] !== undefined) return a[0];
					}, '*/remove'],
					self: {
						completed_number: ['count', 'completed']
					},
				}],
                $el: $root,
                todos_number: ['todos/$arr_data.length'],
                "new_todo": [second, 'button.add-todo|click', '-input|getval'],
                "input|setval": [always(''), 'new_todo']
            },
            'item': {
				text: '',
				$template: `
					<div class="td-item">
						<input type="checkbox" name="completed" /> - completed
						<div data-fr="text">
						</div>
						<div class="to-right">
							<a href="#" class="remove">Remove</a>
						</div>
						<div class="clearfix"></div>
					</div>
				`,
				remove: [(e) => {
					return e;
				}, '.remove|click'],
                completed: ['input[type=checkbox]|getval']
            }
        })
		var add_item = (str = 'ololo') => {
			$root.find('input[type=text]').val(str).change();
			$root.find('button').click();
		}
		add_item();
        assert.equal(app.get('$arr_data.length', 'todos'), 1);
        assert.equal(app.get('completed_number', 'todos'), 0);
		add_item('ol');
		add_item('al');
        assert.equal(app.get('$arr_data.length', 'todos'), 3);
        assert.equal(app.get('completed_number', 'todos'), 0);
		
		$root.find('input[type=checkbox]').click();
        assert.equal(app.get('completed_number', 'todos'), 3);
		
		$root.find('[data-fr=todos] > *:first-child .remove').click();
        assert.equal(app.get('completed_number', 'todos'), 2);
		$root.find('[data-fr=todos] > *:first-child .remove').click();
        assert.equal(app.get('completed_number', 'todos'), 1);
		add_item();
        assert.equal(app.get('completed_number', 'todos'), 1);
    });
    
    it('Testing async', function(done){
        var app = Firera({
            __root: {
                b: ['just', 42],
                a: ['async', function(cb, b){
                        setTimeout(() => {
                            //console.log('setting b');
                            cb(b);
                        }, 1);
                }, 'b']
            }
        })
        assert.equal(app.get('a'), undefined);
        setTimeout(() => {
            assert.equal(app.get('a'), 42);
            done();
        }, 10)
    })
	
	var arr_real_length = (a) => Object.keys(a).length;
	
	it('Casting list as array', function(){
        var $root = $(".test-trains");
		var add_item = () => {
			$root.find('button').click();
		}
		var app = Firera({
			$packages: ['simpleHtmlTemplates', 'htmlCells'],
			__root: {
				$el: $(".test-trains"),
				$child_trains: ['list', {
					type: 'train',
					push: ['../add_train'],
					pop: [get(0), '*/.remove|click'],
					self: {
						arr: ['asArray', ['name']]
					},
				}],
				add_train: ['is', (a) => {
					if(a !== undefined){
						return {};
					}
				}, '.add-train|click'],
			},
			train: {
				$template: `
					<div>Some train</div>
					<input> - enter name
					<div><a href="#" class="remove">Del</a></div>
				`,
				name: ['input|getval'],
			}
		})
		add_item();
		add_item();
		assert.equal(app.get('arr', 'trains').length, 2);
		
		$root.find('[data-fr=trains] > *:first-child .remove').click();
		//console.log('TRAINS', app.get('arr', 'trains'));
		assert.equal(arr_real_length(app.get('arr', 'trains')), 1);
		
		var inp = $root.find('[data-fr=trains] > *:first-child input');
		inp.val('ololo').keyup();
		assert.deepEqual(app.get('arr', 'trains'), [{
				name: 'ololo'
		}]);
	})
	
	it('$datasource', function(){
		var app = Firera({
			__root: {
				$child_people: ['list', {
					type: 'human',
					datasource: ['../people'],
					self: {people_ages: ['asArray', ['name', 'age']]},
				}],
				people: ['just', [
					{
						name: 'Ivan',
						age: 35,
						gender: 'male'
					}, {
						name: 'Pylyp',
						age: 93,
						gender: 'male'
					}, {
						name: 'Yavdokha',
						age: 91,
						gender: 'female'
					}
				]]
			},
			human: {
				
			}
		})
		assert.equal(app.get('$arr_data.length', 'people'), 3);
		
		app.set('people', [{
			name: 'Ivan',
			age: 36
		}, {
			name: 'Pylyp',
			age: 94,
		}, {
			name: 'Yavdokha',
			age: 92,
		}]);
	
		
		assert.deepEqual(app.get('people_ages', 'people'), [{
			name: 'Ivan',
			age: 36
		}, {
			name: 'Pylyp',
			age: 94,
		}, {
			name: 'Yavdokha',
			age: 92,
		}]);
	
		app.set('$arr_data.length', [], 'people');
		assert.equal(app.get('$arr_data.length', 'people'), 0);
	})
	
	it('Reduce(position-free)', function(){
		// tbd...
		var app = Firera({
			__root: {
				$child_people: ['list', {
					type: 'human', 
					datasource: ['../people'],
					self: { 
						sum_age: ['reduce', 'age', {
							add: (a, sum) => {
								return sum + a;
							},
							remove: (a, sum) => sum - a,
							change: (a, prev_a, sum) => {
								return (a - prev_a) + sum;
							},
							def: 0,
						}]
					}
				}],
				people: ['just', [{
						name: 'Ivan',
						age: 35
					}, {
						name: 'Pylyp',
						age: 93,
					}, {
						name: 'Yavdokha',
						age: 91,
					}]
				],
			},
			human: {
				
			}
		})
		assert.equal(app.get('sum_age', 'people'), 219);
		app.set('age', 36, 'people/0');
		assert.equal(app.get('sum_age', 'people'), 220);
	})
	
	it('Simple templates with Ozenfant', function(){
        var app = Firera({
            __root: {
				$el: $(".test-ozenfant"),
				text: 'This is Ozenfant!',
				$template: `
				.
					form
						h1
							"Hello!"
						.
						.text$

				`
            },
			$packages: ['ozenfant', 'htmlCells']
        });
		app.set('text', 'ololo');
		assert.equal($('.test-ozenfant .text').html(), 'ololo');
	})
	it('Nested templates with Ozenfant', function(){
        var app = Firera({
            __root: {
                $init: {
                    $el: $(".test-ozenfant-nested"),
					people_arr: [{name: 'John'}, {name: 'Ivan'}, {name: 'Semen'}],
					$template: `
					.
						h1
							"People"
						ul.people$
					
					`
                },
				$child_people: ['list', {type: 'human', datasource: ['../people_arr']}],
            },
			human: {
				$template: `
				.
					"Hello, "
					span$name
					"!"
					`
			},
			$packages: ['ozenfant', 'htmlCells']
        });
		app.set('text', 'ololo');
		var res = `Hello,  
				
					Ivan
				 
				!`;
		assert.equal($.trim($('.test-ozenfant-nested > * > ul > *:nth-child(2) > div').text()),  res);
	})
	
	it('Testing indices predicate', function(){
		var $root = $(".test-indices");
		var app = Firera({
			$packages: ['ozenfant', 'htmlCells'],
			__root: {
				$init: {
					undone_num: 0,
				},
				$el: $root,
				add_new: ['.add-todo|click'],
				$template: `
					.
						"todo list"
						ul$todos
						.add-todo
							"Add todo"
						.
							"Undone:"
							span.undone_num$
				`,
				undone_num: [prop('size'), 'todos/undone'],
				$child_todos: ['list', {
					type: 'todo',
					push: [always({text: 'Do something', completed: false}), '../add_new'],
					self: { 
						undone: ['indices', not, 'completed']
					},
				}]
			},
			todo: {
				$template: `
					li
						.$text
						.complete
							"Complete!"
				`,
				completed: [always(true), '.complete|click'],
			}
		})
		$root.find('.add-todo').click();
		$root.find('.add-todo').click();
		$root.find('.add-todo').click();
		$root.find('.add-todo').click();
		$root.find('ul > *:nth-child(3) .complete').click();
		//console.log('app', app);
		assert.equal($root.find('.undone_num').html(), '3');
		
		
	})
	
	it('Getting data from arrays by index', function(){
		var app = Firera({
			__root: {
				$template: `
						h1
							"Trains"
						.trains$
						.
							.
								"Edit train"
							.edit-train-form$edit_train_form
				`,
				$el: $(".test-trains2"),
				trains_arr: ['just', [
					{
						number: 117,
						id: 1,
					},
					{
						number: 148,
						id: 2,
					},
					{
						number: 49,
						id: 3,
					},
				]],
				$children: {
					trains: ['list', 'train', '../trains_arr'],
					edit_train_form: {
						type: 'edit_train_form',
						add: 'edit_train',
						remove: 'edit_train_form/close'
					}
				},
				edit_train: [function([num, data]){
						console.log('Click!', num, data);
				}, 'trains/*/edit_train']
			},
			edit_train_form: {
				$template: `
				.
					"editing train..."
					a.close(href: ololo)
						"Close"
				`,
				close: ['.close|click']
			},
			train: {
				$template: `
					li
						.
							"Train #"
							span.number$
						.
							a.edit(href: #)
								"Edit"
					`,
				edit_train: ['second', '.edit|click', '-$real_values']
			},
			$packages: ['ozenfant', 'htmlCells']
		})
		//console.log('app', app);
	})
	it('Testing new $child interface', function(){
		var app = Firera({
			__root: {
				a: 10,
				b: 20,
				$child_todo: 'todo',
				c: ['+', 'a', 'b'],
			},
			todo: {
				d: [adder(12), '../c'],
			}
		})
		assert.equal(app.get('d', 'todo'), 42);
	})
	it('Testing new $child interface', function(){
		var app = Firera({
			__root: {
				a: 10,
				b: 20,
				$child_todo: 'todo',
				c: ['+', 'a', 'b'],
			},
			todo: {
				d: [adder(12), '../c'],
			}
		})
		assert.equal(app.get('d', 'todo'), 42);
	})
	it('Testing new $child interface 2', function(){
		var app = Firera({
			__root: {
				a: 10,
				b: 20,
				$child_todo: {
					d: [adder(12), '../c'],
				},
				c: ['+', 'a', 'b'],
			},
		})
		assert.equal(app.get('d', 'todo'), 42);
	})
	it('Testing new $child interface 3: add and remove', function(){
		var app = Firera({
			__root: {
				a: 10,
				b: 20,
				$el: $(".test-new-children"),
				someval: ['todo/ololo'],
				$template: `
				.
					a.add(href: #)
						"Show todo"
				.
					a.remove(href: #)
						"Hide"
				.
					.$someval
				.
					.todo$
				`,
				$child_todo: ['map', {
					'.add|click': 'todo',
					'.remove|click': false,
				}],
				c: ['+', 'a', 'b'],
			},
			todo: {
				ololo: 42,
				$template: `
					.todosya( background-color: green, 
							width: 300px, 
							height: 50px, 
							margin: 10px, 
							border-radius: 10px, 
							padding: 10px, 
							color: white 
						)
						"todo"
				`,
			},
			$packages: ['ozenfant', 'htmlCells']
		})
		$(".test-new-children .add").click();
		assert.equal($(".test-new-children .todosya").length, 1);
		$(".test-new-children .remove").click();
		assert.equal($(".test-new-children .todosya").length, 0);
	})
	it('Test todo mvc', function(){
		var $root = $(".test-todo-mvc");
		var main_template = `
			h1 
				"Todo MVC"
			.
				"Todos"
			ul$todos
			.
				"Display:"
				ul.display
					.all
						"All"
					.done
						"Done"
					.undone
						"Undone"
			.
				span
					"Completed: "
					span.completed_number$
			.
				span
					"Total: "
					span.all_number$
			.
				a.clear-completed(href: #)
					"Clear completed"
			.
				h2
					"Add todo"
				.
					text.new-todo-text
		`;
		var todo_template = `
			.
				"This is todo"
			.$text
			.
				a.complete(href: #)
					"Complete"
			.
				a.remove(href: #)
					"Remove"
		`;
		var app = Firera({
			__root: {
				$template: main_template,
				$el: $root,
				$child_todos: ['list', {
					type: 'todo',
					push: [
						as('text', {complete: false}), 
						'../new_todos'
					],
					pop: ['join', 
						'done', 
						[ind(0), '*/.remove|click'], 
						[(a, b) => {
							return a ? b : a;
						}, '../remove_done', '-completed_indices']
					],
					self: {
						'display': [fromMap({
							all: '*',
							undone: true,
							done: false,
						}), '../display'],
						'completed_indices': ['indices', 'complete'],
					}
				}],
				'remove_done': ['.clear-completed|click'],
				'new_todos': ['.new-todo-text|enterText'],
				'display': ['.display > *|click|attr(class)'],
				'.new-todo-text|setval': [always(''), 'new_todos'],
				'completed_number': ['count', 'todos/complete'],
				'all_number': ['count', 'todos/*'],
			},
			todo: {
				'|visibility': ['!=', '../display', 'complete'],
				'|hasClass(completed)': ['complete'],
				$template: todo_template,
				complete: [always(true), '.complete|click'],
				'c': ['+', 'a', 'b']
			},
			$packages: ['ozenfant', 'htmlCells']
		})
		//console.log('app', app, $root.find('input[type=text]'));
		$root.find('input[type=text]').val('Do something useful');
		triggerEnter($root.find('input[type=text]'));
		$root.find('input[type=text]').val('Have a rest');
		triggerEnter($root.find('input[type=text]'));
		$root.find('input[type=text]').val('Write some tests');
		triggerEnter($root.find('input[type=text]'));
		$root.find('ul > *:nth-child(2) .complete').click();
		$root.find('input[type=text]').val('Listen to music');
		triggerEnter($root.find('input[type=text]'));
		$root.find('ul > *:nth-child(1) .complete').click();
		
		assert.equal(Number($root.find('span.completed_number').html()), 2);
		assert.equal(Number($root.find('span.all_number').html()), 4);
		
		$root.find('.clear-completed').click();
		
		assert.equal(Number($root.find('span.completed_number').html()), 0);
		assert.equal(Number($root.find('span.all_number').html()), 2);
		
		$root.find('.clear-completed').click();
		
		assert.equal(Number($root.find('span.completed_number').html()), 0);
		assert.equal(Number($root.find('span.all_number').html()), 2);
		
	})
	
	it('Dynamic dependency', () => {
		// @tbd
		var app = Firera({
			__root: {
				a1: 10,
				a2: 20,
				a3: 45,
				b1: -1,
				b2: 9,
				b3: 3,
				flag: 'a',
				val: ['dynamic', (letter) => {
					return [(a, b, c) => {
						//console.log('computing sum');
						return a + b + c;
					}, letter + '1', letter + '2', letter + '3']
				}, 'flag']
			},
			$packages: ['ozenfant', 'htmlCells']
		})
		assert.equal(app.get('val'), 75);
		app.set('a1', 12);
		assert.equal(app.get('val'), 77);
		app.set('flag', 'b');
		assert.equal(app.get('val'), 11);
	})
	
	it('Multi-layer grid benchmark', function(){
		var grid = {
			a0: 10,
			b0: 20,
			c0: 30,
			d0: 42
		}
		for(var i = 1; i <= 1000; i++){
			var prev = i - 1;
			grid['a' + i] = ['b' + prev];
			grid['b' + i] = ['-', 'a' + prev, 'c' + prev];
			grid['c' + i] = ['+', 'b' + prev, 'd' + prev];
			grid['d' + i] = ['c' + prev];
		}
		
		timer('Initing app');
		var app = Firera({__root: grid});
		timer('Initing app').stop();
		
		timer('Updating app');
		app.set({'a0': 3, 'b0': 10, 'c0': 35, 'd0': 14});
		timer('stop_all');
		
		timer('Updating app 2');
		app.set({'a0': 10, 'b0': -20, 'c0': 45, 'd0': 37});
		timer('Updating app 2').stop();
		//console.log(i+':', app.get('a' + (i - 1)), app.get('b' + (i - 1)), app.get('c' + (i - 1)), app.get('d' + (i - 1)));
	})
	
	it('Accum', () => {
		var app = Firera({
			__root: {
				a: 42,
				b: [(val) => {
					return val%2 ? val : Firera.noop;	
				}, 'a'],
				c: ['accum', 'b']
			},
		})
		app.set('a', 3);
		app.set('a', 4);
		app.set('a', 5);
		app.set('a', 6);
		assert.deepEqual(app.get('c'), [3, 5]);
	})
	it('TransistA', () => {
		var app = Firera({
			__root: {
				a: false,
				b: 42,
				c: ['transist', 'a', '-b']
			},
		})
		app.set('b', 35);
		app.set('a', true);
		assert.equal(app.get('c'), 35);
		app.set('b', 42);
		assert.equal(app.get('c'), 35);
		app.set('a', false);
		app.set('a', true);
		assert.equal(app.get('c'), 42);
	})
})
describe('Che', function () {
	
	it('Simple example', function(){
		var app = Firera({
			__root: {
				$el: $(".test-che"),
				a: [always('A'), '.a|click'],
				b: [always('B'), '.b|click'],
				clicked_both: ['che', '& a, b']
			},
			$packages: ['ozenfant', 'htmlCells']
		})
		//console.log('app', app);
		$(".test-che .a").click();
		$(".test-che .b").click();
		assert.deepEqual(app.get('clicked_both'), {a: 'A', b: 'B'})
	})
})

