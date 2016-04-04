var trim = $.trim;
window.che_config = {
	syntax: {
		root_token: {
			children_tokens: [
				'>',
				{
					type: 'set'
				},
			]
		},
		set: {
			children_tokens: [
				'>',
				{
					type: 'operator',
					optional: true,
				},
				{
					type: 'item',
				},
				{
					type: 'item_with_comma',
					multiple: true,
					optional: true,
				}
			],
		},
		operator: {
			free_chars: true,
			regex: /^[\>\|]$/,
		},
		item_with_comma: {
			children_tokens: [
				'>',
				{ 
					type: 'comma'
				},
				{ 
					type: 'item'
				},
			],
		},
		item: {
			children_tokens: [
				'>',
				[
					'|',
					{ 
						type: 'quoted_cellname'
					},
					{ 
						type: 'cellname'
					},
					{
						type: 'bracket'
					},
				],
				{
					type: 'output',
					optional: true,
				},
				{
					type: 'quantifier',
					optional: true,
				}
			]
		},
		bracket: {
			start: '(',
			children_tokens: [
				'>',
				{
					type: 'set',
				}
			],
			end: ')',
		},
		quoted_cellname: {
			start: '"',
			end: '"',
			free_chars: true,
		},
		cellname: {
			free_chars: true,
			regex: /([a-zA-Z0-9_\-])/,
		},
		output: {
			start: '/',
			end: '/',
			children_tokens: [
				'>',
				[
					'|',
					{
						type: 'quoted_cellname'
					},
					{
						type: 'cellname'
					},
				], 
				{
					type: 'pipe',
					multiple: true,
					optional: true,
				}
			],
			regex: /([a-zA-Z0-9_\-])/
		},
		pipe: {
			start: '|',
			free_chars: true,
			regex: /([a-zA-Z0-9_\-])/
		},
		comma: {
			free_chars: true,
			regex: /\,/,
		},
		quantifier_char: {
			free_chars: true,
			regex: /[\*\+]/,
		},
		quantifier_num: {
			free_chars: true,
			start: '{',
			end: '}',
		},
		quantifier: {
			children_tokens: [
				'|',
				{
					type: 'quantifier_char',
					optional: true,
				},
				{
					type: 'quantifier_num',
					optional: true,
				},
			]
		},
	},
	semantics: {
		root_token: {
			type: 'door',
		},
		bracket: {
			type: 'door',
		},
		quantifier: {
			type: 'door',
		},
		quantifier_char: {
			type: 'chars',
		},
		set: {
			func: (struct, parser) => {
				var children = struct.children;
				if(children[0].type === 'operator'){
					return {
						type: 'revolver',
						subtype: children[0].chars,
						children: parser(children.slice(1)),
					}
				} else {
					if(children.length > 1){
						console.log('Wrong semantics: set without operator');
					} else {
						return parser(children[0]);
					}
				}
			}
		},
		output: {
			func: (struct) => {
				var self = {
					title: false,
					pipes: [],
				}
				for(let child of struct.children){
					switch(child.type){
						case 'cellname':
						case 'quoted_cellname':
							self.title = child.chars;
						break;
						default:
							self.pipes.push(child.chars);
						break;
					}
				}
				return self;
			}
		},
		item: {
			func: (struct, parser) => {
				var self = {};
				if(struct.children.length === 1){
					switch(struct.children[0].type){
						case 'cellname':
						case 'quoted_cellname':
							self.event = {
								name: trim(struct.children[0].chars),
								type: 'cell',
							}
						break;
						default:
							return parser(struct.children[0]);
						break;

					}
				}
				switch(struct.children[0].type){
					case 'cellname':
					case 'quoted_cellname':
						self.event = {
							name: trim(struct.children[0].chars),
							type: 'cell',
						}
					break;
					default:
						self.event = parser(struct.children[0]);
					break;

				}
				for(let child of struct.children){
					if(child.type === 'output'){
						self.output = parser(child);
					}
					if(child.type === 'quantifier'){
						self.quantifier = parser(child);
					}
				}
				return self;
			}
		},
		item_with_comma: {
			type: 'door',
			ret: 2,
		}
	}
}