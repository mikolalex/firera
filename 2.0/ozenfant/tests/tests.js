var $ = require('../../jquery');
var assert = require('./assert');
var che_parser = require("../../che/parser");
var ozenfant_config = require('../config');
var Ozenfant = require('../ozenfant');

var id = a => a;
var always = (a) => {
	return () => a;
}
var example = `
body
	.wrapper
		menu
		.content
			.login-block
				"Hello, Mr."
				$username
				". Welcome
				to our 
				site!
				"
				
			ul.comments
				.comment
					.$date
					.$user
					.comment-text
						$text
				.comment
					.$date
					.$user
					.comment-text
						$text
				
			form.add-comment(method: post, background-color: $color, $font-size)
				.
					text(name: username)
				.
					textarea(name: )
				

 `;
var exp_struct = {
	"tag": "body",
	"children": [{
		"tag": "menu",
		"children": [{
			"tag": "li",
			"children": [{
				"tag": "a",
				"children": []
			}]
		}, {
			"tag": "li",
			"children": [{
				"tag": "a",
				"children": []
			}]
		}, {
			"tag": "li",
			"children": [{
				"tag": "a",
				"children": []
			}]
		}, {
			"tag": "li",
			"children": [{
				"tag": "a",
				"children": []
			}]
		}]
	}, {
		"tag": "section",
		"children": [{
			"tag": "header",
			"children": [{
				"children": [{
					"children": []
				}, {
					"children": []
				}]
			}]
		}]
	}, {
		"tag": "footer",
		"children": [{
			"children": []
		}]
	}]
}


describe('Amadee Ozenfant', function () {
	var do_in_tree = (node, cb, child_key = 'children') => {
		if(!node) return;
		var res = cb(node);
		//console.log('Node', node, 'children', node[child_key], child_key);
		if(node[child_key] && node[child_key] instanceof Array){
			res.children = [];
			for(let child of node[child_key]){
				if(!child) continue;
				res.children.push(do_in_tree(child, cb, child_key));
			}
		}
		return res;
	}
	var key = (k) => {
		var fnc = (a) => { return a[k] };
		return fnc;
	}
	it('Testing simple example', function(){
		console.log('CONFIG', ozenfant_config);
		var parser = che_parser.get_parser(ozenfant_config);
		var res = parser(example);
		//console.log('Got', res.semantics);
		//$(".test-parser > *:nth-child(1)").html(che_parser.dump(res.syntax));
	})
	it('Testing Ozenfant tag structure', function(){
		var tmpl = `
		
		body
			menu
				li
					a(href: index.html, target: _blank)
				li
					a(href: index.html)
				li
					a(href: index.html)
				li
					a(href: index.html)
			section
				header.ololo
						.user
							.name
								"Your name:"
								span$name
								". Welcome, mr. $name!"
							.surname$
			footer
				"(c) Mikolalex"
		`;
		var tmpl = new Ozenfant(tmpl);
		//$(".test-parser > *:nth-child(2)").html(che_parser.dump(tmpl.struct.syntax));
		var html = tmpl.toHTML();
		//$(".test-html > *:nth-child(1)").text(html);
		var struct = do_in_tree(tmpl.struct.semantics[0], (a) => {
			return {tag: a.tagname};
		})
		//assert.equal(JSON.stringify(struct), JSON.stringify(exp_struct));
	})
	
	it('Testing variables', function(){
		var context = {
			login: 'Mikolalex',
			email: 'laaazyyy@gmail.com',
			date: '2011-01-01',
			year: 2016
		};
		var tmpl = `
			.
				.user
					.login$
					.e-mail$email
					.
						"Registered from"
						.$date
						" until now"
					.
						"Dummy!"
				footer
					"Some info. Copyright (c) $year"
		`;
		var tmpl = new Ozenfant(tmpl);
		tmpl.render($(".test-variables").get(0), context);
		var html = tmpl.toHTML(context);
		//console.log('Semantics', tmpl.struct.semantics[0]);
		console.log('HTML', html);
		//console.log('bindings', tmpl.bindings);
		
		tmpl.set('login', 'Ed1do');
		tmpl.set('year', '2011');
		
		assert.equal($(".test-variables .login").html(), 'Ed1do');
		assert.equal($(".test-variables footer").html(), 'Some info. Copyright (c) 2011');
		
	})
})

