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
		
		assert.deepEqual([{"name":"Ivan"},{"name":"Ivan"},{"name":"Petro"}], a('names').get());
	})

	it('Testing arrays(length, etc)', function() {
		var app = new Firera;
		app('items').are([1, 2, 3]);
		app('itemnum').is('items/$length');
		assert.equal(app('itemnum').get(), '3');
		app('items').push(4);
		assert.equal(app('itemnum').get(), '4');
		
		
	})
	
	it('Testing visualization package', function(){
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
				sales:  45000,
			},
		]
		var app = new Firera;
		app('sales').are([]).each({

		}).shared({
			sales_range: ['is', '$range(sales)']
		});
		app('sales').push(data);
		assert.deepEqual(
			[3500, 50023] , 
			app('sales/sales_range').get()
		);
		app('sales').push({name: 'Antarctica', sales: 3});
		assert.deepEqual(
			[3, 50023] , 
			app('sales/sales_range').get()
		);
	})

	it('Testing join', function() {
		var app = {
			each: {
				fullname: ['is', function(a, b){ return a + ' ' + b;}, 'name', 'surname'],
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

	it('Testing sync', function() {
		var app = new Firera;
		app('items').are([1, 2, 3]);
		var first = app('items').get(0);
		console.dir(first);
		// to be continued...
		//app('items').shared('datasource').sync();
	})

})