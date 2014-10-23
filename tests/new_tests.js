var fequal = function (fvar, val) {
    assert.equal(fvar.get(), val);
}

describe('Simple values', function () {
    it('Testing simple values', function () {
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

    it('Calling not existing variable', function () {

        var user1 = new Firera;
        user1('login').just('Lobster');
        user1('type').just('user');

        var user2 = new Firera;
        user2('login').just('Salmon');
        user2('type').just('admin');

        var user3 = new Firera;
        user3('login').just('Carp');
        user3('type').just('moder');

        // Their rights should be defined automatically, based on user type

        user1('rights').is(function (type) {
            switch (type) {
                case 'user':
                    return 'r';
                case 'admin':
                    return 'rw';
                default:
                    return '';
                    break;
            }

        }, 'type');

        assert.equal(user1('rights').get(), 'r');
        assert.equal(user2('rights').get(), undefined);

    })

    it('Testing arrays(length, etc)', function () {
        var app = new Firera;
        app('items').are([1, 2, 3]);
        app('itemnum').is('items/$length');
        assert.equal(app('itemnum').get(), '3');
        app('items').push(4);
        assert.equal(app('itemnum').get(), '4');


    })

    it('Testing visualization package', function () {
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
    })

    it('Testing join', function () {
        var app = {
            each: {
                fullname: ['is', function (a, b) {
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

    it('Testing adding custom methods', function () {
        var app = new Firera;
        Firera.addCellFunction('abs', function (num) {
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

    it('Testing templates and input bindings', function () {
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

    it('Testing sync', function () {
        var app = new Firera;
        app('items').are([1, 2, 3]);
        var first = app('items').get(0);
        console.dir(first);
        // to be continued...
        //app('items').shared('datasource').sync();
    })

})

describe('Tests from guide', function () {

    it('Cells with dependancy', function () {
        /*
         * 
         * Tests from guide
         * 
         */

        var app = new Firera;
        app('a').just(42);
        app('b').is(function (num) {
            return num + 3;
        }, 'a');
        assert.equal(app('b').get(), 45);// 45
        // now the most important

        app('a').set(10);
        assert.equal(app('b').get(), 13);// 13


        var get_greeting = function (firstname, lastname) {
            return 'Hello, ' + firstname + ' ' + lastname + '!';
        }

        app('name').just('Aare');
        app('surname').just('Olander');

        app('greeting').is(get_greeting, 'name', 'surname');

        fequal(app('greeting'), 'Hello, Aare Olander!');

    })

    it('Simple arrays', function () {
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

    it('Lists from array of objects', function () {
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
            isbig: [function (num) {
                    return num > 1000000;
                }, 'population']
        })
        assert.deepEqual(app('cities/1').get(), {name: "Kharkiv", population: 1500000, country: "Ukraine", isbig: true});
    })

    it('Testing shared for lists', function () {
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
            square: [function (p, r) {
                    return Math.round(p * r * r)
                }, 'pi', 'radius'],
        })
        fequal(app('rounds/2/square'), 5542);

    })

    it('testing basic HTML binding', function () {
        var validate_string = function (str) {
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

    it('Testing $template', function () {
        var app = new Firera;
        var get_user_template_by_gender = function (gender) {
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

    it('Testing array template - from HTML', function () {
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

        assert.equal('<div class="firera-item"><div class="model">\n' +
                '					<h3>Name</h3>\n' +
                '					<div data-fr="name">CMYK</div>\n' +
                '					<h3>Description</h3>\n' +
                '					<div data-fr="descr">Cyan, Magenta, Yellow, BlacK</div>\n' +
                '				</div></div><div class="firera-item"><div class="model">\n' +
                '					<h3>Name</h3>\n' +
                '					<div data-fr="name">RGB</div>\n' +
                '					<h3>Description</h3>\n' +
                '					<div data-fr="descr">Red, Green, Blue</div>\n' +
                '				</div></div><div class="firera-item"><div class="model">\n' +
                '					<h3>Name</h3>\n' +
                '					<div data-fr="name">LAB</div>\n' +
                '					<h3>Description</h3>\n' +
                '					<div data-fr="descr">Lightness, A, B</div>\n' +
                '				</div></div>', $(".models-list [data-fr=models]").html())

    })

    it('Testing HTMl template - from shared', function () {
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

    it('Testing array again', function () {

        var app = new Firera;
        // Init empty list
        app('fruits').are([]);

        // create link for quick access
        var fruits = app('fruits');

        // Add an item to it
        fruits.push('apple');
        fruits.push('pear');

        // Count the number of items in list
        assert.equal(fruits.shared('$length').get(), 2);// 2
        assert.equal(fruits.list[0].get(), fruits.list[0]('__val').get());


        fruits.setData(['apricot', 'peach']);
        assert.deepEqual(fruits.get(), ['apricot', 'peach']);


        app('rounds').are({
            $data: [// $data field contains plain data
                {
                    radius: 10,
                },
                {
                    radius: 44,
                },
                {
                    radius: 37,
                },
            ],
            each: {// each field contains cell dependencies, formulas
                area: [function (r) {
                        return Math.PI * r * r;
                    }, 'radius'],
            }
        })

        // So it will look like

        assert.deepEqual([
            {
                "radius": 10,
                "area": 314.1592653589793
            },
            {
                "radius": 44,
                "area": 6082.123377349839
            },
            {
                "radius": 37,
                "area": 4300.840342764427
            }
        ], app('rounds').get());

        app('rounds').each({
            circumference: [function (r) {
                    return Math.round(2 * Math.PI * r);
                }, 'radius']
        })

        assert.deepEqual(app('rounds').pick(['circumference', 'radius']), [{"circumference": 63, "radius": 10}, {"circumference": 276, "radius": 44}, {"circumference": 232, "radius": 37}]);

        assert.deepEqual(app('rounds').pick('circumference'), [63, 276, 232]);


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

    it('Testing "picks" predicate', function () {
        var fr = new Firera;
        fr('locos').are([
            {
                type: 'steam',
                adhesion_weight: 2000,
                name: 'A10',
            }, 
            {
                type: 'diesel',
                adhesion_weight: 3000,
                name: '2TE116',
            }, 
            {
                type: 'diesel',
                adhesion_weight: 2500,
                name: '2TE10L',
            }, 
        ])
        
        fr('locos').each({
            'diesel': [_.isEqualTo('diesel'), 'type']
        })
        
        
        fr('diesels').takes('locos.diesel', ['adhesion_weight', 'name']);
        
        fr('locos').push({
            type: 'diesel',
            adhesion_weight: 3000,
            name: '2TE10M',
        });
        
        /*assert.deepEqual(fr('diesels').get(), [
            {name: '2TE116', adhesion_weight: '3000'}, 
            {name: '2TE10L', adhesion_weight: '2500'}, 
            {name: '2TE10M', adhesion_weight: '3000'}
        ]);*/
        
    })



})