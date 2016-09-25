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
		//console.log('HTML', html);
		//console.log('bindings', tmpl.bindings);
		
		tmpl.set('login', 'Ed1do');
		tmpl.set('year', '2011');
		
		assert.equal($(".test-variables .login").html(), 'Ed1do');
		assert.equal($(".test-variables footer").html(), 'Some info. Copyright (c) 2011');
		
	})
	it('Testing if/else expression', function(){
		var tmpl = `
			
				.$logged_in?
					"Hello, mr."
					span.username$
					"!"
				:
					"Please, log in!"
					.no_luck$
		`;
		var ctx = {logged_in: true, username: 'Mikolalex', no_luck: 'Looser!'};
		var tmpl = new Ozenfant(tmpl);
		tmpl.render($(".test-if").get(0), ctx);
		//console.log('tmpl', tmpl, tmpl.struct.syntax, tmpl.struct.semantics);
		
		
		tmpl.set('logged_in', false);
		tmpl.set('username', 'Antin');
		assert.equal($(".test-if .username").length, 0);
		assert.equal($(".test-if .no_luck").length, 1);
		tmpl.set('no_luck', 'Please log in!2');
		assert.equal($(".test-if .no_luck").html(), 'Please log in!2');
		tmpl.set('logged_in', true);
		assert.equal($(".test-if .username").length, 1);
		assert.equal($(".test-if .no_luck").length, 0);
		assert.equal($(".test-if .username").html().trim(), 'Antin');
		tmpl.set('logged_in', false);
		tmpl.set('no_luck', 'Looser!');
		assert.equal($(".test-if .no_luck").html(), 'Looser!');
		
	})
})

