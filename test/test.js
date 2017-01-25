var Firera = require('../firera');
var che = require('shche');
var Ozenfant = require('ozenfant');
var assert = require('assert');
var $ = require('jquery');

var id = a => a;
var not = a => !a;
var always = function(a){ 
	return function(){
		return a;
	}
}


	var ttimer_pool = {};
	var ttimer = {
			start: function(key){
					if(!ttimer_pool[key]){
							ttimer_pool[key] = {
									sum: 0,
							}
					}
					ttimer_pool[key].current = performance.now();
			},
			stop: function(key){
					ttimer_pool[key].sum += performance.now() - ttimer_pool[key].current;
			},
	}

var decorate = (fnc, msg) => {
	return function(){
		console.log("@", msg, arguments);
		return fnc.apply(null, arguments);
	}
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

var ind = function(index = 0){
	return (arr) => {
		return arr instanceof Object ? arr[index] : null;
	}
}

window.triggerEnter = (el) => {
	var e = $.Event("keyup");
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
    it('Testing basic html functionality: visibility', function () {
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
    it('Testing basic html functionality: click', function () {
		var c = 0;
        var app = Firera({
            __root: {
                $el: $(".test-html"),
                'foo': [() => {
						++c;
				}, '.a > *:nth-child(2) div span|click']
            },
			$packages: ['simpleHtmlTemplates', 'htmlCells']
        });
        $('span').click();
        $('span').click();
        $('span').click();
        assert.equal(c, 3);
    });
    it('Testing nested grids', function () {
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
    
    var get_by_selector = function(name, $el){
        //console.info("GBS", arguments);
        return $el ? $el.find('[data-fr=' + name + ']') : null;
    }
    

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
    it('Testing grid linking', function () {
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
		var add_item = function(str = 'ololo'){
			$root.find('input[type=text]').val(str).change();
			$root.find('button').click();
		}
		//console.log('app', app);
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
        assert.equal($root.find('input[type=checkbox]:checked').length, 2);
        assert.equal(app.get('completed_number', 'todos'), 2);
		$root.find('[data-fr=todos] > *:first-child .remove').click();
        assert.equal(app.get('completed_number', 'todos'), 1);
        assert.equal($root.find('input[type=checkbox]:checked').length, 1);
		add_item();
        assert.equal(app.get('completed_number', 'todos'), 1);
        assert.equal($root.find('input[type=checkbox]:checked').length, 1);
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
        assert.equal(app.get('a'), Firera.undef);
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
	
	it('Simple templates with Ozenfant', function(done){
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
			$packages: ['ozenfant_new', 'htmlCells']
        });
		setTimeout(() => {
			app.set('text', 'ololo');
			assert.equal($('.test-ozenfant .text').html(), 'ololo');
			done();
		}, 10)
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
			$packages: ['ozenfant_new', 'htmlCells']
        });
		console.log('app', app);
		app.set('text', 'ololo');
		var ex_res = `Hello,Ivan!`;
		var res = $.trim($('.test-ozenfant-nested > * > ul > *:nth-child(2) > div').text()).replace(/(\t|\s)/g, "");
		assert.equal(res, ex_res);
	})
	
	it('Testing indices predicate', function(){
		var $root = $(".test-indices");
		var app = Firera({
			$packages: ['ozenfant_new', 'htmlCells'],
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
				edit_train: [
					function(a) {
						console.log('Click!', a);
					}, 'trains/*/edit_train'
				]
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
			$packages: ['ozenfant_new', 'htmlCells']
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
			$packages: ['ozenfant_new', 'htmlCells']
		})
		$(".test-new-children .add").click();
		console.log('app', app);
		assert.equal($(".test-new-children .todosya").length, 1);
		$(".test-new-children .remove").click();
		assert.equal($(".test-new-children .todosya").length, 0);
	})
	it('Test todo mvc', function(){
		var $root = $(".test-todo-mvc");
		var type = (str) => {
			$root.find('input[type=text]').val(str);
		}
		var enter = () => {
			triggerEnter($root.find('input[type=text]'));
		}
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
				complete: ['.complete|click'],
				'c': ['+', 'a', 'b']
			},
			$packages: ['ozenfant_new', 'htmlCells']
		})
		console.log('app', app, $root.find('input[type=text]'));
		type('Do something useful');
		enter();

		type('Have a rest');
		enter();

		type('Write some tests');
		enter();

		$root.find('ul > *:nth-child(2) .complete').click();

		type('Listen to music');
		enter();

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
			$packages: ['ozenfant_new', 'htmlCells']
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
	
	it('Wrong linking', () => {
		var app = Firera({
			__root: {
				a: 42,
				$child_foo: 'bar'
			},
			bar: {
				b: ['z']
			}
		})
		var st = app.getStruct();
		console.log('ST', st); 
	})
	it('"data" for list', () => {    
		var get_fields_map = function(){
			var map = {};
			return ([key, val]) => {
				map[key] = val;
				return val;
			}
		} 
		var app = Firera({
			__root: {
				$template: `
				
						.
							"Blocks"
						.blocks$   
				`,
				$el: $(".test-nested-template-rendering"), 
				$child_blocks: ['list', {
						type: 'block',
						data: [{}, {}, {}],
						self: {
							templs: ['closure', get_fields_map, '*/$ozenfant_render']
						}
				}]
			},
			block: {
				$template: `
				
						.
							"Hello!"
				
				`
			},
			$packages: ['ozenfant_new', 'htmlCells']
		})
		console.log('app', app);  
	})
	it('Nested $init', () => {   
		var app = Firera({
			__root: {
				$init: {
					a: 10,
					b: 30,
					foo: 'bar',
					aaa: {
						bar: 'baz',
						c: 42,
						bbb: {
							city: 'New Tsynglok',
						}
					},
				},
				$child_aaa: 'nst',
				c: ['+', 'a', 'b']
			},
			nst: {
				$init: {
					a: 12,
					b: 30,
				},
				$child_bbb: 'nst2',
			},
			nst2: {
				
			}
		})
		assert.equal(app.get('c'), '40');
		assert.equal(app.get('foo'), 'bar');
		assert.equal(app.get('bar', 'aaa'), 'baz');
		assert.equal(app.get('city', 'aaa/bbb'), 'New Tsynglok');
		console.log('C = ', app.get('c'));
	})

	it('** linking', () => {
		var $root =  $(".test-comments");
		var c = 0;
		var app = Firera({
			__root: {
				'$el': $root,
				'clicks': [() => {
					//console.log('BTN CLC!');
					++c;	
				}, '**/btn_click'],
				'comments_arr': ['just', [
						{
							user: 'Mikolalex',
							text: 'Nice photo!'
						},
						{
							user: 'geo14tr89',
							text: '+1'
						},
						{
							user: '2te116',
							text: 'Like!'
						},
				]],
				'$child_comments': ['list', {type: 'comment', datasource: ['../comments_arr']}],
				'$template': `
				.h1
					"Comments"
				ul.comments$
				`
			},
			comment: {
				'btn_click': ['.plus-one|click'],
				'$template': `
				li.comment
					.user$(font-weight: bold)
					.text$
					button.plus-one
						"+1"
				`,
			},
			$packages: ['ozenfant_new', 'htmlCells']
		})
		//console.log('**', app);
		$root.find('.comment .plus-one').click();
		assert.equal(c, 3);
	})
	it('^^ linking', () => {
		var $root =  $(".test-comments2");
		var c = 0;
		var app = Firera({
			__root: {
				'$el': $root,
				'comments_arr': ['just', [
						{
							user: 'Mikolalex',
							text: 'Nice photo!'
						},
						{
							user: 'geo14tr89',
							text: '+1'
						},
						{
							user: '2te116',
							text: 'Like!'
						},
				]],
				selectable: false,
				username: 'Mikolalex',
				'$child_comments': ['list', {type: 'comment', datasource: ['../comments_arr']}],
				'$template': `
				.h1
					"Comments"
				ul.comments$
				`
			},
			comment: {
				'.text|hasClass(my-comment)': ['==', '^^/username', 'user'],
				'|hasClass(active)': ['transist', '/selectable', ['valMap', '|click', 'other|click']],
				'$template': `
				li.comment
					.user$(font-weight: bold)
					.text$
					button.plus-one
						"+1"
				`,
			},
			$packages: ['ozenfant_new', 'htmlCells']
		})
		//console.log('^^', app);
		assert.equal($root.find('.comments').children().eq(0).find('.my-comment').length, 1);
		assert.equal($root.find('.comments').children().eq(1).find('.my-comment').length, 0);
		assert.equal($root.find('.comments').children().eq(2).find('.my-comment').length, 0);
		app.set('username', 'geo14tr89');
		assert.equal($root.find('.comments').children().eq(0).find('.my-comment').length, 0);
		assert.equal($root.find('.comments').children().eq(1).find('.my-comment').length, 1);
		assert.equal($root.find('.comments').children().eq(2).find('.my-comment').length, 0);
		
		//$root.find('.comments > *:nth-child(2) .text').click();
	})
	it('Timer', (done) => {
		var c = 0;
		var app = Firera({
			__root: {
				'start_stop': false,
				'each100ms': ['interval', 100, 'start_stop'],
				'ololo': [() => {
					++c;
				}, 'each100ms'],
			}
		})
		app.set('start_stop', true);
		setTimeout(() => {
			app.set('start_stop', false);
			assert.equal(c >= 3, true);
			assert.equal(c <= 6, true);
			var fixed_c = c;
			setTimeout(() => {
				assert.equal(c, fixed_c);
				done();
			}, 300)
		}, 500);
	})
	it('Signals = ~', () => {
		var d_counter = 0;
		var e_counter = 0;
		var app = Firera({
			__root: {
				'a': 10,
				b: 32,
				z: 100,
				'=c': [function(a, b){
					return a + b;
				}, 'a', 'b'],
				'~d': [(c, z) => {
					++d_counter;
					return d_counter % 2 === 0;
				}, 'c', 'z'],
				e: [(d) => {
					++e_counter;
				}, 'd'],
			}
		})
		app.set('a', 10);// same values
		app.set('b', 32);// same values
		app.set('b', 33);
		app.set('b', 34);
		app.set('b', 34);
		app.set('b', 35);
		app.set('b', 34);
		app.set('b', 35);
		assert.equal(d_counter, 6);
		assert.equal(e_counter, 3);
	})
	it('* subtree', () => {
		var app = Firera({
			__root: {
				a: 10,
				b: 32,
				c: [(a, b) => {
					console.log('Something', a, b);
					return 10;
				}, '*', '-a'],
				d: [(a) => {
						console.log('set D', a);
						return a + 100;
				}, 'c']
			}
		})
		app.set('a', 20);
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
			$packages: ['htmlCells', 'simpleHtmlTemplates']
		})
		$(".test-che .a").click();
		$(".test-che .b").click();
		assert.deepEqual(app.get('clicked_both'), {a: 'A', b: 'B'})
	})
})
