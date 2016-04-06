(function(){
	var fields = ['classnames', 'tagname', 'str', 'quoted_str', 'variable'];
	window.ozenfant_config = {
		syntax: {
			root_token: {
				children: [
					'>',
					{
						type: 'item',
						multiple: true,
						optional: true,
					},
				]
			},
			item: {
				children: [
					'>',
					{
						type: 'indent',
						optional: true,
					},
					{
						type: 'tagname',
						optional: true,
					},
					{
						type: 'classnames',
						optional: true,
					},
					[
						'|', 
						{
							type: 'quoted_str',
							optional: true,
						}, {
							type: 'variable',
							optional: true,
						},
						'optional'
					],
					/*{
						type: 'bracket',
						optional: true,
					},*/
					{
						type: 'str',
						optional: true,
					},
					{
						type: 'lineend',
					}
				]
			},
			comma: {
				regex: /^\,\s?$/,
			},
			bracket: {
				start: '(',
				children: [
					'>',
					{
						type: 'assign',
						optional: true,
					},
					[
						'>',
						{
							type: 'comma',
						},
						{
							type: 'assign'
						},
						'optional'
					]
					
				],
				end: ')',
			},
			assign: {
				free_chars: true,
				regex: /^[^\)]*$/
			},
			quoted_str: {
				regex: /^\"[^\\"]*\"?$/,
				free_chars: true,
			},
			variable: {
				regex: /^\$[a-zA-Z0-9]*$/,
				free_chars: true,
			},
			indent: {
				regex: /^\t+$/,
				free_chars: true,
			},
			classnames: {
				regex: /^\.[\\.a-zA-Z0-9\\-]*$/,
				free_chars: true,
			},
			tagname: {
				regex: /^[a-zA-Z0-9]+$/,
				free_chars: true,
			},
			str: {
				regex: /^[^\n]+$/,
				free_chars: true,
			},
			lineend: {
				regex: /\n$/,
				free_chars: true,
			},
		},
		semantics: {
			root_token: {
				func: (struct, parser) => {

					var res = {children: []};
					var last_of_level = {
						"-1": res,
					}
					var che = parser(struct.children);
					for(let child of che){
						if(!child.tagname && !child.classnames && !child.quoted_str && !child.variable) continue;
						var lvl = child.level || 0;
						var put_to = lvl - 1;
						child.children = [];
						if(!last_of_level[put_to]){
							console.log('oops', last_of_level[put_to]);
							continue;
						}
						last_of_level[put_to].children.push(child);
						last_of_level[lvl] = child;
					}
					return res.children;
				}
			},
			item: {
				func: (struct, parser) => {
					var res = {};
					for(let child of struct.children){
						switch(child.type){
							case 'indent':
								res.level = child.chars.length;
								//console.log('INDEX', res.level);
							break;
						}
						if(fields.indexOf(child.type) !== -1){
							res[child.type] = child.chars;
						}
					}
					return res;
				}
			},
			indent: {
				type: 'chars',
			}
		}
	}
}())
