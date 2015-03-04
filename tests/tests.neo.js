var fequal = function(fvar, val) {
	assert.equal(fvar.get(), val);
}

describe('Simple values', function() {
	it('Testing simple values', function() {
		var a = new Firera;
		a("foo").just('bar');
		a("loo").is("foo");
		a("doo").just(true);
		a("koo").isNot("doo");
		assert.equal(a("foo").get(), 'bar');
		assert.equal(a("loo").get(), 'bar');
		assert.equal(a("koo").get(), false);
		a("foo").set('ololo');
		assert.equal(a("foo").get(), 'ololo');
		assert.equal(a("loo").get(), 'ololo');

		// testing pick

		a('data').just([
			{
				name: 'Ivan',
				surname: 'Ivanenko',
				age: 33,
			},
			{
				name: 'Ivan',
				surname: 'Petrenko',
				age: 23,
			},
			{
				name: 'Petro',
				surname: 'Ivanenko',
				age: 32,
			},
		]);

		a('names').picks('data', 'name');

		assert.deepEqual([{"name": "Ivan"}, {"name": "Ivan"}, {"name": "Petro"}], a('names').get());
	})
        
	it('Testing arrays(length, etc)', function() {
		var app = new Firera;
		app('itemnum').set(0);
		app('items').are([1, 2, 3], {share: {gives: {'itemnum': '$length'}}});
                //console.log('APP', Firera.dump(app));
                //console.log(Firera.dump(app));
		assert.equal(app('itemnum').get(), 3);
		app('items').push(4);
		assert.equal(app('itemnum').get(), 4);
	})
        
	it('Testing .getList() generator', function() {
		var app = new Firera;
                app('length').set(10);
		app('items').getList(function(len){
                    var res = [];
                    for(var i = 0; i < len; i++){
                        res.push({
                            name: 'John' + (i + 1)
                        });
                    }
                    return [{data: res}, {share: {gives: {itemnum: '$length'}}}];
                }, 'length');
                //console.log(Firera.dump(app));
		//app('itemnum').is('items/$length');
		assert.equal(app('itemnum').get(), 10);
		app('length').set(5);
		assert.equal(app('itemnum').get(), 5);


	})
    
    it('Testing onListChange', function(){
        var app = new Firera();
        app.onChange(function(){
            console.log('I changed', arguments);
        })
        app('children').streams('*children*');
        app('items').are({
            data: [
                {
                    weight: 1200,
                    size: 10,
                },
                {
                    weight: 1600,
                    size: 5,
                },
                {
                    weight: 42,
                    size: 0,
                }
            ]
        });
        app.applyTo('.testing-nested-list');
        //console.log('CG', app('items').get('$actualRootNode').length);
    })

	it('Testing templateX, rootNode, rootNodeX, rootSelector', function() {
		var app = new Firera;
		app('$rootSelector').set('.pickleberry');
		assert.equal(app('$templateX').get(), '<h2>Hey, dude!</h2>');
	})

	it('Testing $takes and $gives as parameters', function() {
		var app = new Firera;
		app('a').set(10);
		app('numbers').are({
			takes: ['num'],
			gives: ['status'],
			shared: {
				status: ['<', '$length', 'num'],
			},
			data: [{
					name: 'Mykyta',
					age: 20,
				}, {
					name: 'Mykola',
					surname: 19
				},  {
					name: 'Daria',
					surname: 19
				}, 
			]
		}, 'a', 'numbers_status');
		app.applyTo(".gives-takes-as-params");
		assert.equal(app.get('numbers_status'), true);
	})

	it('Testing function composition', function() {
                var add_10 = function(a){ return a + 10;};
                var multiply = function(a, b){
                    return a*b;
                }
		var app = new Firera;
		app('a').set(3);
                app('b').is([add_10, [multiply, 5]], 'a');
		assert.equal(app('b').get(), 65);
		app('a').set(10);
		assert.equal(app('b').get(), 100);
	})

	it('Testing HTML getters and setters', function() {
               
		var app = new Firera;
		app.applyTo(".getsettest");
		app('a').set('Hans');
		app('b').set('Hansson');
		app(".ololo1|attr(data-name)").is(function(a, b){ return a + ' ' + b;}, 'a', 'b');
		app("name").is('.inp|value');
		app('a').set('Mans');
		assert.equal($(".getsettest .ololo1").attr('data-name'), 'Mans Hansson');
		app.applyTo(".getsettest2");
		assert.equal($(".getsettest2 .ololo1").attr('data-name'), 'Mans Hansson');
		app('.outp|html').is('name');
		$(".getsettest2 .inp").val('42').change();
		assert.equal($(".getsettest2 .outp").html(), '42');
	})

	it('Testing "+" formulas and stream', function() {
		var app = new Firera;
		app('a').set(42);
		app('b').set(23);
		app('c').is('+', 'a', 'b');
		assert.equal(app.get('c'), 65);
                app('vals').streams(function(val, key){
                    return key === 'c' ? val : val*2;
                }, ['a', 'c']);
                app('vars').is(function(){
                    return arguments[0];
                }, '$vars');
                app('something').streams(function(val){
                    return val;
                }, 'vars', 'vals');
                app('a').set(35);
		assert.equal(app.get('vals'), 70);
                app('b').set(14);
		assert.equal(app.get('vals'), 49);            
		assert.deepEqual(app.get('something'), {val: 14, key: "b"});
	})
        
        it('Testing streams via map', function(){
            var app = new Firera;
            app('a').set(42);
            app('b').set(23);
            app('c').streams({
                a: function(b){
                    return b + 10;
                },
                b: _.id
            });
            assert.equal(app.get('c'), undefined);
            app('a').set(90);
            assert.equal(app.get('c'), 100);
            app('b').set(37);
            assert.equal(app.get('c'), 37);
        })
	
	it('Testing onChangeItem, onChangeItemField, reduce on all fields with __val', function(){
		var itemnum = 3;
		var arr = new Firera.list({
			data: [1, 2, 3],
			shared: {
				sum: ['reduce', '+', 0]
			}
		});
		arr.onChangeItem('create', function(){
			itemnum++;
		})
		arr.onChangeItem('delete', function(){
			itemnum--;
		})
		assert.equal(6, arr.get('sum'));
		arr.push(2);
		assert.equal(8, arr.get('sum'));
		arr.remove(0);
		assert.equal(7, arr.get('sum'));
	})
    
    it('Testing reduce on array on some fields', function(){
        var arr = new Firera.list({
            data: [
                {
                    name: 'Mykola',
                    surname: 'Oleksienko',
                    age: 12
                },
                {
                    name: 'Mykola2',
                    surname: 'Oleksienko2',
                    age: 23
                },
                {
                    name: 'Mykola3',
                    surname: 'Oleksienko3',
                    age: 40
                },
            ],
            shared: {
                max_age: ['reduce', _.max, 0, 'age']
            }
        })
        assert.equal(arr.get('max_age'), 40);
        arr.get(1)('age').set(44);
        assert.equal(arr.get('max_age'), 44);
    })
    
    it('Testing list get(filter, map), filtermap', function(){
        var app = new Firera();
        app('people').are([{
            name: 'Mykyta',
            age: 20,
            gender: 'male'
        }, {
            name: 'Mykola',
            age: 21,
            gender: 'male'
        },  {
            name: 'Daria',
            age: 19,
            gender: 'female'
        }]);
        var elder_people = app('people').get(function (o) {
            return o.age >= 20
        }, function (o) {
            return {obj: o}
        })
        assert.equal(elder_people.length, 2);
        assert.equal(elder_people[0].obj.age, 20);
        app('men').mapfilter('people', false, 'gender', _.equal('male'));
        
        
        assert.equal(elder_people.length, 2);
        assert.equal(app('men').get().length, 2);
        app('people').push({
            name: 'Carl',
            age: 30,
            gender: 'male'
        })
        app('people').push({
            name: 'Carla',
            age: 30,
            gender: 'female'
        })
        assert.equal(app('men').get().length, 3);
        
        app('people').each({
            isFemale: ['is', _.equal('female'), 'gender']
        })
        
        app('girls').mapfilter('people', function(o){ return o.name;}, 'isFemale');
        assert.deepEqual(app.get('girls'), ["Daria", "Carla"]);
        
        /*app('men').map('people', function(gender){
            return gender === 'male';
        }, 'gender')
        /*app('men').map('people', function(gender){
            return gender === 'male';
        }, 'gender');
        app('people').push({
            name: 'Ivan',
            gender: 'female'
        });
        app('people/3')('gender').set('male');//
        console.log('____________');
        console.log(app.get('men'));*/
        
    })
        
        it('Testing bindings', function(){
            var app = new Firera;
            app('a').set(42);
            app('b').set(23);
            app('cc').is('-', 'a', 'b');
            app.applyTo('.bindingstest');
            app('c').is('$bindings');
            app('___').is('$HTMLVarsWriter');
            var bindings = app.get('c');
            assert.equal(bindings.a[0], $(".bindingstest [data-fr=a]").get()[0]);
            app('$template').set('<div data-fr="a"><div data-fr="b"></div><h3></h3></div><span data-fr="cc"></span>');
            bindings = app.get('c');
            // C should be preset
            assert.equal(bindings.cc[0], $(".bindingstest [data-fr=cc]").get()[0]);
            // b should not be present
            assert.equal(bindings.b, undefined);
            assert.equal($(".bindingstest [data-fr=cc]").html(), app.get('cc'));
            app('b').set(300);
            assert.equal($(".bindingstest [data-fr=cc]").html(), app.get('cc'));
        })

	/*it('Testing visualization package', function() {
		var data = [
			{
				name: 'Africa',
				sales: 3500,
			},
			{
				name: 'Asia',
				sales: 34500,
			},
			{
				name: 'Europe',
				sales: 50023,
			},
			{
				name: 'America',
				sales: 45000,
			},
		]
		var app = new Firera;
		app('sales').are([]).each({
		}).shared({
			sales_range: ['is', '$range(sales)']
		});
		app('sales').push(data);
		assert.deepEqual(
			[3500, 50023],
			app('sales/sales_range').get()
			);
		app('sales').push({name: 'Antarctica', sales: 3});
		assert.deepEqual(
			[3, 50023],
			app('sales/sales_range').get()
			);
	})*/

	it('Testing join', function() {
		var app = {
			each: {
				fullname: ['is', function(a, b) {
						return a + ' ' + b;
					}, 'name', 'surname'],
			}
		};
		var data = {
			data: [
				{
					name: 'Ivan',
					surname: 'Petrenko',
				},
				{
					name: 'Andryi',
					surname: 'Biletskyi',
				},
			]
		};
		var obj = new Firera.list(_.union(app, data));
		assert.equal(obj.get(1)('fullname').get(), 'Andryi Biletskyi');
	})

	it('Testing adding custom methods', function() {
		var app = new Firera;
		Firera.addCellFunction('abs', function(num) {
			var n = Number(num);
			return n > 0 ? n : -n;
		})
		app('somenum').just(34);
		app('absnum').abs('somenum');
		assert.equal(app('absnum').get(), 34);
		app('somenum').set(-3);
		assert.equal(app('absnum').get(), 3);

		app('a').just(false);
		app('b').just(true);
		app('c').ifAny('a', 'b');
		assert.equal(app('c').get(), true);
		app('b').set(false);
		assert.equal(app('c').get(), false);
	})
/*
	it('Testing templates and input bindings', function() {
		var app = new Firera;
		app('people').are([
			{
				name: 'Ivan',
				surname: 'Petrov',
			},
			{
				name: 'Ivan',
				surname: 'Ivanov',
			}
		]);
		app('street').just('Khreshchatyk');
		app('cities').are(['Kyiv', 'Odesa', 'Lviv']);
		app('cities2').are(['Donetsk', 'Lutsk', 'Ternopil'], {share: {
				takes: ['street'],
			}});

		app('street').set('Maidan');

		app.applyTo(".form1");

		$(".form1 input[type=text]").val('ololo').change();

		assert.equal(app('cities').shared('street').get(), undefined);
		assert.equal(app('cities2').shared('street').get(), 'ololo');


	})
*/
	it('Testing sync', function() {
		var app = new Firera;
		app('items').are([1, 2, 3]);
		var first = app('items').get(0);
		//console.dir(first);
		// to be continued...
		//app('items').shared('datasource').sync();
	})

})

describe('Tests from guide', function() {

	it('Cells with dependancy', function() {


		var app = new Firera;
		app('a').just(42);
		app('b').is(function(num) {
			return num + 3;
		}, 'a');
		assert.equal(app('b').get(), 45);// 45
		// now the most important

		app('a').set(10);
		assert.equal(app('b').get(), 13);// 13


		var get_greeting = function(firstname, lastname) {
			return 'Hello, ' + firstname + ' ' + lastname + '!';
		}

		app('name').just('Aare');
		app('surname').just('Olander');

		app('greeting').is(get_greeting, 'name', 'surname');

		fequal(app('greeting'), 'Hello, Aare Olander!');

	})
	
	/*it('Simple arrays', function() {
		var app = new Firera;
		app('people').are(['Ivan', 'Sasha', 'Ed']);
		app('peoplenum').is('people/$length');
		app('peoplenum').get();// 3
		fequal(app('peoplenum'), 3);

		app('people').push('Lena');
		app('peoplenum').get();
		fequal(app('peoplenum'), 4);

		fequal(app('people/2'), 'Ed');
	})*/

	it('Lists from array of objects', function() {
		var app = new Firera;
		app('cities').are([
			{
				name: 'Kyiv',
				population: 4000000,
			},
			{
				name: 'Kharkiv',
				population: 1500000,
			},
			{
				name: 'Kostyantunivka',
				population: 60000,
			}
		])
		app('cities').each({
			country: 'Ukraine',
			isbig: [function(num) {
					return num > 1000000;
				}, 'population']
		})
		assert.deepEqual(app('cities/1').get(), {name: "Kharkiv", population: 1500000, country: "Ukraine", isbig: true});
	})
	
	it('Testing shared for lists', function() {
		var app = new Firera;

		app('rounds').are([
			{
				radius: 10,
			},
			{
				radius: 20,
			},
			{
				radius: 42,
			},
		])
		//app('rounds').shared('pi').just(Math.PI);
		app('rounds').each({
			square: [function(p, r) {
                return Math.round(p * r * r)
            }, 'pi', 'radius'],
            pi: ['just', Math.PI]
		})
		fequal(app('rounds/2/square'), 5542);

	})
	
	it('testing basic HTML binding', function() {
		var validate_string = function(str) {
			return  !str || str.length < 4 ? "It's too short!" : str;
		}

		var app = new Firera;
		app('name').is(validate_string, "input[type=text]|value").trace();
		// very important step
		app.applyTo('.user');
		$(".user input[type=text]").val('Li').change();
		var msg = $(".user [data-fr=name]").html();
		assert.equal(msg, "It's too short!");


		$(".user input[type=text]").val('Mykola').change();
		msg = $(".user [data-fr=name]").html();
		assert.equal(msg, 'Mykola');
	})
    
    it('Testing list binding', function(){
		var app = new Firera;
		app('cities').are([
			{
				name: 'Kyiv',
				population: 4000000,
			},
			{
				name: 'Kharkiv',
				population: 1500000,
			},
			{
				name: 'Kostyantunivka',
				population: 60000,
			}
		])
        app.applyTo(".testing-list-binding");
        //console.log(Firera.dump(app('cities')));
        assert.equal($(".testing-list-binding [data-fr=cities] > div:nth-child(2) > [data-fr=population]").html(), '1500000');
        app('cities').push({
            name: 'Dnipro',
            population: 900000
        })
        //app('cities').remove(1);
        app('cities').remove({name: 'Kharkiv'});
        app('cities/1')('name').set('Kramatorsk');
        app('cities').push({
            name: 'Odesa',
            population: 1100000
        })
        var ct = $(".testing-list-binding .cities");
        assert.equal(ct.children().length, 4);
        assert.equal(ct.children(":nth-child(1)").find("[data-fr=name]").html(), 'Kyiv');
        assert.equal(ct.children(":nth-child(2)").find("[data-fr=name]").html(), 'Kramatorsk');
        assert.equal(ct.children(":nth-child(3)").find("[data-fr=name]").html(), 'Dnipro');
        assert.equal(ct.children(":nth-child(4)").find("[data-fr=name]").html(), 'Odesa');
    })
    
    it('Testing formula with previous val', function(){
		var app = new Firera;
        app('a').set(42);
        app('logger').is(_.arrAdd, '^', 'a');
        app('ll').is(_.len, 'logger');
        app('a').set(21);
        app('a').set(17);
        assert.deepEqual(app('logger').get(), [42, 21, 17]);
        fequal(app('ll'), 3);
    })
	/*
	it('Testing $template', function() {
		var app = new Firera;
		var get_user_template_by_gender = function(gender) {
			return gender === 'female'
				?
				'<div class="woman">Hi, Ms.<span data-fr="name"></span> <span data-fr="surname"></span>!</div>'
				:
				'<div class="man">Hi, Mr.<span data-fr="name"></span> <span data-fr="surname"></span>!</div>';
		}

		app('name').just('Sergiy');
		app('surname').just('Ivanenko');
		app('gender').just('male');

		app('$template').is(get_user_template_by_gender, 'gender');

		app.applyTo('.current_user');

		assert.equal($(".current_user .man").html(), 'Hi, Mr.<span data-fr="name">Sergiy</span> <span data-fr="surname">Ivanenko</span>!');

		app('gender').just('female');
		assert.equal($(".current_user .woman").html(), 'Hi, Ms.<span data-fr="name">Sergiy</span> <span data-fr="surname">Ivanenko</span>!');

	})

	it('Testing array template - from HTML', function() {
		var app = new Firera;
		app('models').are([
			{
				name: 'CMYK',
				descr: 'Cyan, Magenta, Yellow, BlacK',
			},
			{
				name: 'RGB',
				descr: 'Red, Green, Blue',
			},
			{
				name: 'LAB',
				descr: 'Lightness, A, B',
			},
		]);

		app.applyTo('.models-list');
		
		assert.equal('<div class="firera-item"><div class="model">\n'+
'					<h3>Name</h3>\n'+
'					<div data-fr="name">CMYK</div>\n'+
'					<h3>Description</h3>\n'+
'					<div data-fr="descr">Cyan, Magenta, Yellow, BlacK</div>\n'+
'				</div></div><div class="firera-item"><div class="model">\n'+
'					<h3>Name</h3>\n'+
'					<div data-fr="name">RGB</div>\n'+
'					<h3>Description</h3>\n'+
'					<div data-fr="descr">Red, Green, Blue</div>\n'+
'				</div></div><div class="firera-item"><div class="model">\n'+
'					<h3>Name</h3>\n'+
'					<div data-fr="name">LAB</div>\n'+
'					<h3>Description</h3>\n'+
'					<div data-fr="descr">Lightness, A, B</div>\n'+
'				</div></div>', $(".models-list [data-fr=models]").html())

	})
	
	it('Testing HTMl template - from shared', function(){
		var app = new Firera;
		app('models').are([
			{
				name: 'CMYK',
				descr: 'Cyan, Magenta, Yellow, BlacK',
			},
			{
				name: 'RGB',
				descr: 'Red, Green, Blue',
			},
			{
				name: 'LAB',
				descr: 'Lightness, A, B',
			},
		]);
		app('models').shared('$template').just('<div>Some dummy template</div>');

		assert.equal(app('models').list[0]('$template').get(), '<div>Some dummy template</div>');
		assert.equal(app('models').list[2]('$template').get(), '<div>Some dummy template</div>');
		
		
		app('models/0/$template').just('ololo');
		assert.equal(app('models/1/$template').get(), 'ololo');
		assert.equal(app('models/0/$template').get(), 'ololo');
	})

	/*(it('Testing array projections', function() {
		var app = new Firera;
		app('employees').are([
			{
				name: 'Ivan',
				surname: 'Petrenko',
				age: 23,
				salary: 2300,
			},
			{
				name: 'Mykola',
				surname: 'Ivanenko',
				age: 45,
				salary: 4500,
			},
			{
				name: 'Ivan',
				surname: 'Semenchenko',
				age: 40,
				salary: 4200,
			},
			{
				name: 'John',
				surname: 'Sergiyenko',
				age: 24,
				salary: 1000,
			},
			{
				name: 'Carl',
				surname: 'Petrenko',
				age: 28,
				salary: 3000,
			},
			{
				name: 'Zoya',
				surname: 'Petryshyn',
				age: 29,
				salary: 2000,
			},
			{
				name: 'Olya',
				surname: 'Bilenko',
				age: 34,
				salary: 4000,
			},
			{
				name: 'Sergiy',
				surname: 'Stepanenko',
				age: 31,
				salary: 3500,
			},
		]);
		
		app('older').projects('employees', '*', function(num){ return num > 40; }, 'employees.age');
		console.log('123');
		console.log(Firera.dump(app));
	}) - to be written sometimes)*/
	
	

})