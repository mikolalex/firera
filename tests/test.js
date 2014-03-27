describe('Simple values', function(){
    it('Testing just', function(){
	var a = Firera.hash();
	a("foo").just('bar');
	assert.equal(a("foo").get(), 'bar');
    })
    it('Testing +', function(){
	var F = Firera.hash();
	F("a").just(3);
	F("b").just(5);
	F("c").is(function(a, b){ return a+b;}, 'a', 'b');
	assert.equal(F("c").get(), 8);
    })
})