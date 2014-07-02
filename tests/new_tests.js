describe('Simple values', function(){
    it('Testing simple values', function(){
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
    
    it('Testing arrays', function(){
	    var app = new Firera.hash;
	    app('items').are([1, 2, 3]);
	    console.dir(app('items'));
    })
    
    it('Testing templates and input bindings', function(){
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
	    
	    app('street').set('Maidan');
	    
	    app.applyTo(".form1");
	    $(".form1 input[type=text]").val('ololo').change();
	    
	    
	    
	    
    })
})