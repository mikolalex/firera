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
		$(".test-parser").html(che_parser.dump(res.syntax));
	})
})


