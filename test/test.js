var che = require('shche');
var Ozenfant = require('ozenfant');
var assert = require('assert');
var Firera = require('../src/firera');
var utils = require('../src/utils');
var Arr = utils.Arr;
var qsa = document.querySelectorAll.bind(document);
var qs = document.querySelector.bind(document);

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

function toggle_checkbox(el){
	if(el instanceof $){
		for(let element of el){
			toggle_checkbox(element);
		}
		return;
	}
	if(el instanceof NodeList){
		for(let ecl of el){
			toggle_checkbox(ecl);
		}
		return;
	}
	if(el.hasAttribute('checked')){
		el.removeAttribute('checked');
	} else {
		el.setAttribute('checked', true);
	}
}

var trigger_event = function(name, element){
	var event; // The custom event that will be created
	if(element instanceof $){
		for(let el of element){
			trigger_event(name, el);
		}
		return;
	}	
	if(element instanceof NodeList){
		for(let el of element){
			trigger_event(name, el);
		}
		return;
	}
	if (document.createEvent) {
		event = document.createEvent("HTMLEvents");
		event.initEvent(name, true, true);
	} else {
		event = document.createEventObject();
		event.eventType = name;
	}

	event.eventName = name;

	if (document.createEvent) {
		element.dispatchEvent(event);
	} else {
		element.fireEvent("on" + event.eventType, event);
	}
}

var trigger_click = trigger_event.bind(null, 'click');
var raw = a => a[0];

describe('Firera tests', function () {

    it('Testing simple grid', function () {
        var app = Firera({
            $root: {
				$init: {
					a: 10,
					b: 32,
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
        var app = Firera({
            $root: {
				$init: {
					a: 10,
					b: 20,
					c: 12,	
				},
                d: ['+', ['-', 'b', 'c'], 'a']
            },
            'todo': {},
        });
        assert.equal(app.get('d'), 18);
        app.set('a', 20);
        assert.equal(app.get('d'), 28);
    });

    it('Testing passive listening', function () {
        var app = Firera({
            $root: {
				$init: {
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
        var app = Firera({
            $root: {
				$init: {
					'a': 10,
					'b': 32,
				},
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
            $root: {
				$init: {
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
    it('Testing basic html functionality: visibility', function () {
        var app = Firera({
            $root: {
				$init: {
					$el: document.querySelector(".test-html"),
				},
                'someval': [id, 'input|getval'],
                '.blinker|visibility': [(a) => (a && a.length%2), 'someval']
            },
			$packages: ['simpleHtmlTemplates', 'htmlCells']
        });
        $('.test-html input').val('ololo');
		trigger_event('keyup', raw($('.test-html input')));
        assert.equal(app.get('someval'), 'ololo');
    });
    it('Testing basic html functionality: click', function () {
		var c = 0;
        var app = Firera({
            $root: {
				$init: {
					$el: $(".test-html"),
				},
                'foo': [() => {
						++c;
				}, '.a > *:nth-child(2) div span|click']
            },
			$packages: ['simpleHtmlTemplates', 'htmlCells']
        });
        $('.test-html span').click();
        $('.test-html span').click();
        $('.test-html span').click();
        assert.equal(c, 3);
    });
    it('Testing nested grids', function () {
        var str = false;
        var app = Firera({
            $root: {
				$init: {
					$el: $(".test-nested"),
					$child_todo: 'item',
				},
                someval: [id, 'todo/completed'],
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
            $root: {
				$init: {
					$el: $(".test-nested"),
				},
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
            $root: {
				$init: {
					a: 42,
				},
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
    

    it('Testing dynamic $children members', function () {
        var app = Firera({
        	$root: {
				$init: {
					registered: false,
				},
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
        assert.equal(app.get('foo', 'block'), 'bar');
    });
    it('Testing grid linking', function () {
        var app = Firera({
        	$root: {
				$init: {
					registered: false,
					val: null,
				},
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
        	$root: {
				$init: {
					show: 'all',
				},
				numbers: ['just', [1, 2, 3]],
                arr_changes: ['arrDeltas', 'numbers']
        	}
        })
		
        app.set('numbers', [1, 2, 5, 5]);
        var deltas = app.get('arr_changes');
        assert.deepEqual(deltas, [["add","3",5],["change","2",5]]);
		
        app.set('numbers', []);
        deltas = app.get('arr_changes');
        assert.deepEqual(deltas, [["remove","0"],["remove","1"],["remove","2"],["remove","3"]]);
		
        app.set('numbers', [1, 2, 5, 5]);
        deltas = app.get('arr_changes');
		assert.deepEqual(deltas, [["add","0",1],["add","1",2],["add","2",5],["add","3",5]]);
		
        app.set('numbers', [1, 2, 4, 5]);
        deltas = app.get('arr_changes');
		assert.deepEqual(deltas, [["change","2",4]]);
    });
    
    var add = function(vals){
        if(vals){
            return [['add', null, as('text')(vals)]];
        }
    }
	var get = (i) => {
		return (a) => {
			if(a && a[i] !== undefined) return a[i];
		}
	}
    
    /*it('Testing removing from list', function(){
        var $root = qs(".test-list-remove");
        var app = Firera({
			$packages: ['simpleHtmlTemplates', 'htmlCells'],
            $root: {
                $child_todos: ['list', {
					type: 'item',
					push: [as('text'), '../new_todo'],
					pop: [function(a){
						if(a && a[0] !== undefined) return a[0];
					}, '* /remove'],
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
			$root.querySelector('input[type=text]').value = str;
			trigger_event('change', $root.querySelector('input[type=text]'));
			trigger_click($root.querySelector('button'));
		}
		//console.log('app', app);
		add_item();
        assert.equal(app.get('$arr_data.length', 'todos'), 1);
        assert.equal(app.get('completed_number', 'todos'), 0);
		add_item('ol');
		add_item('al');
        assert.equal(app.get('$arr_data.length', 'todos'), 3);
        assert.equal(app.get('completed_number', 'todos'), 0);
		toggle_checkbox($root.querySelectorAll('input[type="checkbox"]'));
		trigger_event('change', $root.querySelectorAll('input[type=checkbox]'));
        assert.equal(app.get('completed_number', 'todos'), 3);
		
		trigger_click($root.querySelectorAll('[data-fr=todos] > *:first-child .remove'));
        assert.equal($root.querySelectorAll('input[type=checkbox]:checked').length, 2);
        assert.equal(app.get('completed_number', 'todos'), 2);
		trigger_click($root.querySelector('[data-fr=todos] > *:first-child .remove'));
        assert.equal(app.get('completed_number', 'todos'), 1);
        assert.equal($root.querySelectorAll('input[type=checkbox]:checked').length, 1);
		add_item();
        assert.equal(app.get('completed_number', 'todos'), 1);
        assert.equal($root.querySelectorAll('input[type=checkbox]:checked').length, 1);
    });*/
    
    it('Testing async', function(done){
        var app = Firera({
            $root: {
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
	
	/*it('Casting list as array', function(){
        var $root = qs(".test-trains");
		var add_item = () => {
			trigger_click($root.querySelector('button'));
		}
		var app = Firera({
			$packages: ['simpleHtmlTemplates', 'htmlCells'],
			$root: {
				$el: $(".test-trains"),
				$child_trains: ['list', {
					type: 'train',
					push: ['../add_train'],
					pop: [get(0), '* /.remove|click'],
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
		
		trigger_click($root.querySelector('[data-fr=trains] > *:first-child .remove'));
		//console.log('TRAINS', app.get('arr', 'trains'));
		assert.equal(Arr.realLength(app.get('arr', 'trains')), 1);
		
		var inp = $root.querySelector('[data-fr=trains] > *:first-child input');
		inp.value = 'ololo';
		trigger_event('keyup', inp);
		assert.deepEqual(app.get('arr', 'trains'), [{
				name: 'ololo'
		}]);
	})*/
	
	it('$datasource', function(){
		var app = Firera({
			$root: {
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
			$root: {
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
            $root: {
				$init: {
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
				}
            },
			$packages: ['ozenfant', 'htmlCells']
        });
		setTimeout(() => {
			app.set('text', 'ololo');
			assert.equal($('.test-ozenfant .text').html(), 'ololo');
			done();
		}, 10)
	})
	it('Nested templates with Ozenfant', function(){
        var app = Firera({
            $root: {
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
				$init: { 
					$template: `
					.greeting
						"Hello, "
						span$name
						"!"
						`
				}
			},
			$packages: ['ozenfant', 'htmlCells']
        });
		//console.log('app', app);
		app.set('text', 'ololo');
		var ex_res = `Hello,Ivan!`;
		var res = $($('.greeting')[1]).text().trim().replace(/(\t|\s)/g, "");
		assert.equal(res, ex_res);
	})
	
	it('Testing indices predicate', function(){
		var $root = $(".test-indices");
		var app = Firera({
			$packages: ['ozenfant', 'htmlCells'],
			$root: {
				$init: {
					undone_num: 0,
					$el: $root,
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
				},
				add_new: ['.add-todo|click'],
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
				$init: {
					$template: `
						li
							.$text
							.complete
								"Complete!"
					`,
				},
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
			$root: {
				$init: {
					$template: `
						.trainz
							h1
								"Trains"
							.trains$
							.
								.
									"Edit train"
								.edit-train-form$edit_train_form
					`,
					$el: $(".test-trains2"),
				},
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
				$init: { $template: `
				.
					"editing train..."
					a.close(href: ololo)
						"Close"
				`,},
				close: ['.close|click']
			},
			train: {
				$init: { $template: `
					li
						.
							"Train #"
							span.number$
						.
							a.edit(href: #)
								"Edit"
					`, },
				edit_train: ['second', '.edit|click', '-$real_values']
			},
			$packages: ['ozenfant', 'htmlCells']
		})
		//console.log('app', app);
	})
	it('Testing new $child interface', function(){
		var app = Firera({
			$root: {
				$init: {
					a: 10,
					b: 20,
					$child_todo: 'todo',
				},
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
			$root: {
				$init: {
					a: 10,
					b: 20,
					$child_todo: 'todo',
				},
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
			$root: {
				$init: {
					a: 10,
					b: 20,
					$child_todo: {
						d: [adder(12), '../c'],
					}
				},
				c: ['+', 'a', 'b'],
			},
		})
		assert.equal(app.get('d', 'todo'), 42);
	})
	it('Testing new $child interface 3: add and remove', function(){
		var app = Firera({
			$root: {
				$init: {
					a: 10,
					b: 20,
					$el: $(".test-new-children"),
					$template: `
				.
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
				},
				someval: ['todo/ololo'],
				$child_todo: ['map', {
					'.add|click': 'todo',
					'.remove|click': false,
				}],
				c: ['+', 'a', 'b'],
			},
			todo: {
				$init: {
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
				}
			},
			$packages: ['ozenfant', 'htmlCells']
		})
		trigger_click($(".test-new-children .add"));
		//console.log('app', app);
		assert.equal($(".test-new-children .todosya").length, 1);
		trigger_click($(".test-new-children .remove"));
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
		.todo-mvc-tst
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
		li
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
			$root: {
				$init: { 
						$template: main_template,
					$el: $root,
				},
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
						'display': [utils.fromMap({
							all: '*',
							undone: true,
							done: false,
						}), '../display'],
						'completed_indices': ['indices', 'complete'],
					}
				}],
				'remove_done': ['.clear-completed|click'],
				'new_todos': ['.new-todo-text|>enterText'],
				'display': ['.display > *|click|attr(class)'],
				'.new-todo-text|setval': [always(''), 'new_todos'],
				'completed_number': ['count', 'todos/complete'],
				'all_number': ['count', 'todos/*'],
			},
			todo: {
				$init: {
					$template: todo_template,
				},
				'|visibility': ['!=', '../display', 'complete'],
				'|hasClass(completed)': ['complete'],
				complete: ['.complete|click'],
				'c': ['+', 'a', 'b']
			},
			$packages: ['ozenfant', 'htmlCells'],
		})
		//console.log('app', app, $root.find('input[type=text]'));
		type('Do something useful');
		enter();

		type('Have a rest');
		enter();

		type('Write some tests');
		enter();
		trigger_click($root.find('ul > *:nth-child(2) .complete'));

		type('Listen to music');
		enter();
		
		trigger_click($root.find('ul > *:nth-child(1) .complete'));
		assert.equal(Number($root.find('span.completed_number').html()), 2);
		assert.equal(Number($root.find('span.all_number').html()), 4);
		
		trigger_click($root.find('.clear-completed'));

		assert.equal(Number($root.find('span.completed_number').html()), 0);
		assert.equal(Number($root.find('span.all_number').html()), 2);

		trigger_click($root.find('.clear-completed'));

		assert.equal(Number($root.find('span.completed_number').html()), 0);
		assert.equal(Number($root.find('span.all_number').html()), 2);
		
	})
	
	it('Dynamic dependency', () => {
		// @tbd
		var app = Firera({
			$root: {
				$init: {
					a1: 10,
					a2: 20,
					a3: 45,
					b1: -1,
					b2: 9,
					b3: 3,
					flag: 'a',
				},
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
		var grid = {$init: {
			a0: 10,
			b0: 20,
			c0: 30,
			d0: 42
		}}
		for(var i = 1; i <= 1000; i++){
			var prev = i - 1;
			grid['a' + i] = ['b' + prev];
			grid['b' + i] = ['-', 'a' + prev, 'c' + prev];
			grid['c' + i] = ['+', 'b' + prev, 'd' + prev];
			grid['d' + i] = ['c' + prev];
		}
		
		timer('Initing app');
		var app = Firera({$root: grid});
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
			$root: {
				$init: { a: 42 },
				b: [(val) => {
					return val%2 ? val : Firera.skip;	
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
			$root: {
				$init: { 
					a: false,
					b: 42, 
				},
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
			$root: {
				$init: { 
					a: 42,
					$child_foo: 'bar'
				},
			},
			bar: {
				b: ['z']
			}
		})
		var st = app.getStruct();
		assert.equal(st.children.foo.cells.formula[0].wrong_links.z, true);
	})
	it('"data" for list', () => {    
		var get_fields_map = function(){
			var map = {};
			return ([key, val]) => {
				map[key] = val;
				return val;
			}
		} 
		const block_template = `

				.
					"Hello!"

		`;
		var app = Firera({
			$root: {
				$init: { 
					$template: `
						.
							.
								"Blocks"
							.blocks$   
					`,
					$el: $(".test-nested-template-rendering"), 
				},
				$child_blocks: ['list', {
						type: 'block',
						data: [{}, {}, {}],
						self: {
							templs: ['closure', get_fields_map, '*/$ozenfant_render']
						}
				}]
			},
			block: {
				$init: { $template: block_template },
			},
			$packages: ['ozenfant', 'htmlCells']
		})
		assert.equal(app.get('$template', 'blocks/2'), block_template);
		assert.equal(app.get('$template', 'blocks/5'), Firera.undef);
	})
	it('Nested $init', () => {   
		var app = Firera({
			$root: {
				$init: {
					a: 10,
					b: 30,
					foo: 'bar',
					aaa: {
						$init: {
							bar: 'baz',
							c: 42,
						}
					},
					$child_aaa: 'nst',
				},
				c: ['+', 'a', 'b']
			},
			nst: {
				$init: {
					bar: 'baz',
					a: 12,
					b: 30,
					$child_bbb: 'nst2',
				},
			},
			nst2: {
				$init: {
					city: 'New Tsynglok',
				}
			}
		})
		assert.equal(app.get('c'), '40');
		assert.equal(app.get('foo'), 'bar');
		assert.equal(app.get('bar', 'aaa'), 'baz');
		assert.equal(app.get('city', 'aaa/bbb'), 'New Tsynglok');
	})

	it('** linking', () => {
		var $root =  $(".test-comments");
		var c = 0;
		var app = Firera({
			$root: {
				$init: { 
					$el: $root ,
					$template: `
				.
					.h1
						"Comments"
					ul.comments$
					`
				},
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
			},
			comment: {
				$init: {
					'$template': `
					li.comment
						.user$(font-weight: bold)
						.text$
						button.plus-one
							"+1"
					`,
				},
				'btn_click': ['.plus-one|click'],
			},
			$packages: ['ozenfant', 'htmlCells']
		})
		//console.log('**', app);
		$root.find('.comment .plus-one').click();
		assert.equal(c, 3);
	})
	it('^^ linking', () => {
		var $root =  $(".test-comments2");
		var c = 0;
		var app = Firera({
			$root: {
				$init: {
					'$el': $root,
					selectable: false,
					username: 'Mikolalex',
					'$template': `
				.
					.h1
						"Comments"
					ul.comments$
					`
				},
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
			},
			comment: {
				$init: {
					'$template': `
					li.comment
						.user$(font-weight: bold)
						.text$
						button.plus-one
							"+1"
					`,
				},
				'.text|hasClass(my-comment)': ['==', '^^/username', 'user'],
				'|hasClass(active)': ['transist', '/selectable', ['valMap', '|click', 'other|click']],
			},
			$packages: ['ozenfant', 'htmlCells']
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
			$root: {
				$init: {
					'start_stop': false,
				},
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
			$root: {
				$init: {
					'a': 10,
					b: 32,
					z: 100,
				},
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
			$root: {
				$init: {
					a: 10,
					b: 32,
				},
				c: [(a, b) => {
					//console.log('Something', a, b);
					return 10;
				}, '*', '-a'],
				d: [(a) => {
						//console.log('set D', a);
						return a + 100;
				}, 'c']
			}
		})
		app.set('a', 20);
		// no asserts needed - if it doesn't throw an error, it's ok!
	})
	it('Nested Oz loops', () => {
		
	   
		var app = Firera({
			$root: {
				$init: {
					$el: $(".test-nested-loops"),
					$template: `
				.
					h1
						"Nested loops"
					.
						.
							"Locomotives"
						ul.{$items}
							li.item
								.title$@title
					`,
				},
				$child_items: ['list', {
					type: 'item',
					data: [{
						title: '2TE10M',
					}, {
						title: 'DR1A',
					}, {
						title: 'VL8',
					}, {
						title: 'ChS8'
					}]
				}]
			},
			item: {},
			$packages: ['ozenfant', 'htmlCells']
		})
		var chs = 'ChS11';
		app.set('title', chs, 'items/0');
		console.log('app', app);
		assert.equal(document.querySelector(".test-nested-loops ul > li:nth-child(1) .title").innerHTML, chs);
	   
	   
	})
	
	it('DOM events - all subtree', () => {
		var $root = document.querySelector(".test-DOM");
		var c = 0;
		var d = 0;
		var app = Firera({
			$root: {
				$init: {
					$el: $root,
					$template: `
				.
					h1
						"Dom events"
					.links
						a.foo
							"Foo"
						a.bar
							"Bar"
					.items$

					`,
				},
				listen_a_click: [(e) => {
					++c;
				}, 'a|click'],
				listen_any_click: [(e) => {
					++d;
				}, 'a|>click'],
				$child_items: ['list', {
						type: 'item',
						data: [{}, {}, {}]
				}]
			},
			item: {
				$init: {
					$template: `
						li
							a.item(data-num: $name)
								"item"

					`
				},
			},
			$packages: ['ozenfant', 'htmlCells'],
		})
		trigger_click($root.querySelectorAll("a.item"));
		trigger_click($root.querySelectorAll("a.foo"));
		assert.equal(c, 1);
		assert.equal(d, 4);
	})
	it('Che: simple example', function(){
		var app = Firera({
			$root: {
				$init: {
					$el: qs(".test-che"),
				},
				a: [always('A'), '.a|click'],
				b: [always('B'), '.b|click'],
				clicked_both: ['che', '& a, b']
			},
			$packages: ['htmlCells', 'simpleHtmlTemplates']
		})
		trigger_click(qsa(".test-che .a"));
		trigger_click(qsa(".test-che .b"));
		assert.deepEqual(app.get('clicked_both'), {a: 'A', b: 'B'})
	})
	it('Newest Ozenfant', function(){
		var app = Firera({
			$root: {
				$init: {
					$el: qs(".test-newest-oz"),
					conts: [{show_form: true}, {show_form: true}, {show_form: true}],
					$template: `
	.
		h1
			"Hello, this is Willy!"
		.conts{$conts}
			.cont
				? $showForm
					.
						? $_show_form
							.
								"Some form"
							.
								.$_show_form
							.boo$
							Form(method: post)
						:
							.
								"Nothing"
				:
					List(item: Item, list: items)
		div.foo$
		footer.bar
			"Footer"
		Shmooter.a
	`,
				},
			},
			Form: {
				$init: {
					$template: `
		.
			form
				h3
					"This is form"

	`,
				},
			},
			Item: {
				$init: {
					$template: `
		.
			"This is item"
	`
				}
			},
			$packages: ['htmlCells', 'ozenfant']
		});
		app.set('showForm', true);
		setTimeout(() => {
			//app.set('really_show_form', true);
		}, 100);
		setTimeout(() => {
			app.set('boo', 42);
		}, 200);
		setTimeout(() => {
			app.set('conts', [{show_form: true}, {show_form: true}, {show_form: false}, {show_form: true}]);
		}, 300);
		setTimeout(() => {
			app.set('boo', 77);
		}, 2000);
	})
	
	
	it('Testing $children', function(){
		var app = Firera({
			$log: true,
			$root: {
				$init: {
					$el: qs(".test-children"),
					$template: `
					.az
						h1
							"This is Willy"
						.foo$
					`,
				},
				mousepos: [(e) => [e.layerX, e.layerY], '.az|mousemove'],
				$children: [Firera._.id, 'children'],
			},
			indicator: {
				$init: {
					$template: `
						.
							h2
								"This is indicator"
							.
								.
									.x$
									.y$
					`,
					foo: 'bar',
				},
				x: [Firera._.prop('0'), '../mousepos'],
				y: [Firera._.prop('1'), '../mousepos'],
			},
			$packages: ['htmlCells', 'ozenfant'],
		})
		app.set('a', 10);
		app.set('children', [['add', 'foo', 'indicator', {$real_el: qs('.indicator')}]]);
	})
})
