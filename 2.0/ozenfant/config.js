var fields = ['classnames', 'tagname', 'str', 'quoted_str', 'variable'];
module.exports = {
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
				{
					type: 'bracket',
					optional: true,
				},
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
			free_chars: true,
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
			regex: /^[^\)^\,]*$/
		},
		quoted_str: {
			start: '"',
			end: '"',
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
				var che_results = parser(struct.children);
				//console.log('Results', che_results);
				var max_level = 0;
				for(let i in che_results){
					let child = che_results[i];
					if(!child.tagname && !child.classnames && !child.quoted_str && !child.variable) continue;
					var lvl = child.level || 0;
					if(lvl > max_level){
						max_level = lvl;
					}
					var put_to = lvl - 1;
					child.children = [];
					if(!last_of_level[put_to]){
						for(;put_to--;put_to > -2){
							if(last_of_level[put_to]) break;
						}
						if(!last_of_level[put_to]){
							continue;
						}
					}
					//console.log('putting', child, 'to', last_of_level[put_to]);
					last_of_level[put_to].children.push(child);
					last_of_level[lvl] = child;
					if(lvl + 1 < max_level){
						//console.log('lvl', lvl+1, max_level);
						var j = lvl + 1;
						for(var j = lvl + 1;j <= max_level;j++){
							if(!last_of_level[j]) break;
							//console.log('delete', last_of_level[j]);
							delete last_of_level[j];
						}
					}
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
						case 'bracket':
							res.assignments = [];
							for(let child1 of child.children){
								if(child1.type === 'assign'){
									res.assignments.push(child1.chars);
								}
							}
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
