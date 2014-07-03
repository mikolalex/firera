describe('Simple values', function() {
	it('Testing simple values', function() {
		var a = new Firera.hash;
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
	})

	it('Testing arrays', function() {
		var app = new Firera.hash;
		app('items').are([1, 2, 3]);
	})

	it('Testing adding predicates', function() {
		var app = new Firera.hash;
		Firera.addPredicate('abs', function(num) {
			var n = Number(num);
			return n > 0 ? n : -n;
		})
		app('somenum').just(34);
		app('absnum').abs('somenum');
		assert.equal(app('absnum').get(), 34);
		app('somenum').set(-3);
		assert.equal(app('absnum').get(), 3);
	})

	it('Testing templates and input bindings', function() {
		var app = new Firera.hash;
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
		assert.equal(app('cities2').shared('street').get(), 'Maidan');


	})

	it('Testing sync', function() {
		var app = new Firera.hash;
		app('items').are([]);
		// to be continued...
		//app('items').shared('datasource').sync();
	})

})