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
		app('items').are([1, 2, 3]);
		app('itemnum').is('items/$length');
		assert.equal(app('itemnum').get(), '3');
		app('items').push(4);
		assert.equal(app('itemnum').get(), '4');


	})

	it('Testing templateX, rootNode, rootNodeX, rootSelector', function() {
		var app = new Firera;
		app('$rootSelector').set('.pickleberry');
		assert.equal(app('$templateX').get(), '<h2>Hey, dude!</h2>');
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
			$data: [
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
	
	it('Simple arrays', function() {
		var app = new Firera;
		app('people').are(['Ivan', 'Sasha', 'Ed']);
		app('peoplenum').is('people/$length');
		app('peoplenum').get();// 3
		fequal(app('peoplenum'), 3);

		app('people').push('Lena');
		app('peoplenum').get();
		fequal(app('peoplenum'), 4);

		fequal(app('people/2'), 'Ed');
	})

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
		app('rounds').shared('pi').just(Math.PI);
		app('rounds').each({
			square: [function(p, r) {
					return Math.round(p * r * r)
				}, 'pi', 'radius'],
		})
		fequal(app('rounds/2/square'), 5542);

	})
	
	it('testing basic HTML binding', function() {
		var validate_string = function(str) {
			return !str || str.length < 4 ? "It's too short!" : str;
		}

		var app = new Firera;
		app('name').is(validate_string, "input[type=text]|value");
		// very important step
		app.applyTo('.user');
		$(".user input[type=text]").val('Li');
		var msg = $(".user [data-fr=name]").html();
		assert.equal(msg, "It's too short!");


		$(".user input[type=text]").val('Mykola').blur();
		msg = $(".user [data-fr=name]").html();
		assert.equal(msg, 'Mykola');
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