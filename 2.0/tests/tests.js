var id = a => a;

describe('Plain base', function () {
    it('Testing simple values conversion', function () {
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
        assert.equal(parsed_pb.c[1](1, 2), 3);
    });
    it('Testing simple grid', function () {
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
    it('Testing nested fexpr', function () {
        var app = Firera.run({
            __root: {
                'a': 10,
                'b': 20,
                'c': 12,
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
        console.log(app.root);
    });
    it('Testing passive listening', function () {
        var app = Firera.run({
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
        var app = Firera.run({
            __root: {
                'a': 10,
                'b': 32,
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
        var app = Firera.run({
            __root: {
                $free: {
                    $el: $(".test-html")
                },
                someval: ['is', id, 'input|val']
            },
            'todo': {
            	completed: {
            		'__def': false,
            		'.done|click': true,
            	}
            }
        });
        //$('.test-html input').val('ololo').keyup();
        //assert.equal(app.get('someval'), 'ololo');
    });
})