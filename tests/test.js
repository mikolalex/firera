describe('Simple values', function(){
    it('Testing just and equal', function(){
	var a = Firera.hash();
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
    it('Testing arythmetics', function(){
	var F = Firera.hash();
	F("a").just(3);
	F("b").just(5);
	F("c").is(function(a, b){ return a+b;}, 'a', 'b');
	assert.equal(F("c").get(), 8);
	F("a").set(23);
	assert.equal(F("c").get(), 28);
    })
    it('Testing duplicate dependancy', function(){
	var F = Firera.hash();
	F("a").just(3);
	F("b").just(5);
	F("c").is(function(a, b){ return a+b;}, 'a', 'b');
	F("d").is(function(a, b){ return a*b;}, 'a', 'c');
	assert.equal(F("d").get(), 24);
    })
})
describe('HTML values', function(){

    it('Testing form values', function(){
	var fr = Firera.hash();
	fr("fullname").is(function(a, b){return a + " " + b;}, ".name|value", ".surname|value");
	fr(".fullname|value").is("fullname");
	fr(".full-info|html").is(
	    function(a, b, c, d){
		if(a.length > 1 || b.length > 1 || c > 0){
		    return 'You are ' + a + ' ' + b + ', your age is ' + c + ', your fullname is ' + d + '!';
		} else {
		    return 'Enter more info!';
		}
	    },
	    ".name|value",
	    ".surname|value",
	    ".age|value",
	    "fullname"
	);
	fr.applyTo("body");
	$(".name").val("Mykola").change();
	$(".surname").val("Oleksienko").change();
	$(".age").val(24).change();
	
	fr(".your-evilness|html").is("input[name=evil]|value");
	
	assert.equal("You are Mykola Oleksienko, your age is 24, your fullname is Mykola Oleksienko!", $(".full-info").html())
	
	$("input[name=evil]").click();
	
	assert.equal("true", $(".your-evilness").html());
	
    })
})

describe('Todo MVC)', function(){
     
    var toLowerCase = function(str){
	return str.toLowerCase();
    }    
    
    app = Firera.hash();
    app("task-template").load("../task-template.html");
    app("tasks")
	    .are([{
		    title: 'Fuck Putin',
		    completed: false,
	    }, {
		    title: 'Fuck Yanukovich',
		    completed: true,
	    }, {
		    title: 'Fuck Ruzke',
		    completed: false,
	    }, {
		    title: 'Fuck vatniks',
		    completed: false,
	    }], '.tasks')
	    .template("task-template")
	    .each({
		".complete|click": [
		    ['filter', '!completed'],
		    function(item){ 
			item("completed").set(true);
		    }
		],
		".remove|click": function(item, key, coll){ 
		    coll.remove(key);
		},
		'root|toggleClass(completed)': ['if', 'completed'],
	    })
    app(".how_much|html").counts('tasks');
    app(".how_much_completed|html").counts("completed", 'tasks');
    app(".remove-completed|click").removes('completed', 'tasks').sets('ul.controls|selectedItem', 'All');
    app(".add-task|submit").pushTo('tasks');
    
    app("what_to_show").is("ul.controls|selectedItem").map({    
	'All': '*',    
	'Completed': true,    
	'Active': false
    });
    
    app("ul.controls|selectedItem").set("All");
    app(".task-type|html").is("ul.controls|selectedItem").then(toLowerCase);
	
    it('Testing list', function(){
	app.applyTo(".todo");
	assert.equal($(".tasks > *").length, 4);
	
	
	$(".remove-completed").click();
	assert.equal($(".tasks > *").length, 3);
	
	$(".add-task input[type=text]").val("Fight fire with fire");
	$(".add-task input[type=submit]").click();
	setTimeout(function(){
	    $(".tasks > div:nth-child(1) .complete").click();
	    $(".tasks > div:nth-child(2) .complete").click();
	    $(".tasks > div:nth-child(3) .complete").click();
	    app("tasks").remove('completed');
	    assert.equal($(".tasks > *").length, 1);
	    assert.equal($.trim($(".tasks > *:nth-child(1) .title").html()), 'Fight fire with fire');
	}.bind(this), 1000)
	app("ul.controls|selectedItem").set("All");
    })    
})
describe('OR modificator', function(){
    it('Testing or', function(){
	var a = Firera.hash();
	a("a").just(35);
	a("b").is('a').orJust('42');
	a("a").set(false);
	//assert.equal(a("b").get(), '42');
    })    
})
describe('Chock template engine', function(){
    it('Testing parse()', function(){
	var tmpl = $("#template").html();
	var res = chock.parse(tmpl);
	assert.equal($.trim(res.html), $.trim($("#template-result").html()));
    })    
})