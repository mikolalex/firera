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


describe('Amadee Ozenfant', function () {
	it('Testing simple example', function(){
		
		var parser = che_parser.get_parser(ozenfant_config);
		var res = parser(example);
		console.log('Got', res.semantics);
		$(".test-parser > *:nth-child(1)").html(che_parser.dump(res.syntax));
	})
	it('Testing Ozenfant', function(){
		var tmpl = `
		
		body
			menu
				li
					a(href: index.html)
				li
					a(href: index.html)
				li
					a(href: index.html)
				li
					a(href: index.html)
			section
				header.ololo
						.user
							.name$
							.surname$
			footer
				"(c) Mikolalex"
		`;
		var tmpl1 = `
		
			form.add-comment(method: post, background-color: $color, $font-size)
		`;
		var tmpl = new Ozenfant(tmpl);
		$(".test-parser > *:nth-child(2)").html(che_parser.dump(tmpl.struct.syntax));
		var html = tmpl.toHTML();
		$(".test-html > *:nth-child(1)").text(html);
		console.log('tmpl', tmpl.struct.semantics);
		console.log('html', html);
	})
})


