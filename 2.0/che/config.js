var trim = $.trim;
window.che_config = {
	syntax: {
		root_token: {
			children: [
				'>',
				{
					type: 'set'
				},
			]
		},
		set: {
			children: [
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
			regex: /^([\>\|\&|\/])+$/,
		},
		item_with_comma: {
			children: [
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
			children: [
				'|', 
				{
					type: 'func',
					optional: true,
				},
				[
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
							type: 'bracket_extended'
						},
					],
					{
						type: 'cond',
						optional: true,
					}, 
					{
						type: 'pipe',
						optional: true,
					},
					{
						type: 'output',
						optional: true,
					},
					{
						type: 'quantifier',
						optional: true,
					}
				]
			]
		},
		bracket_extended: {
			children: [
				'>',
				{
					type: 'bracket',
				},
				{
					type: 'pipe',
					optional: true,
				},
				{
					type: 'output',
					optional: true,
				},
				{
					type: 'quantifier',
					optional: true,
				}
			],
		},
		bracket: {
			start: '(',
			children: [
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
			regex: /^\s?([a-zA-Z0-9_\-])+\s?$/,
		},
		output: {
			start: '/',
			end: '/',
			children: [
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
			regex: /^([a-zA-Z0-9_\-])+$/
		},
		pipe: {
			start: '|',
			free_chars: true,
			regex: /^([a-zA-Z0-9_\-])+$/
		},
		threedots: {
			str: '...',
		},
		cond: {
			start: '?',
			free_chars: true,
			regex: /^([a-zA-Z0-9_\-])+$/
		},
		comma: {
			free_chars: true,
			regex: /^[\,]+$/,
		},
		func: {
			children: [
				'>',
				{
					type: 'cellname',
				},
				{
					type: 'func_params',
				},
				{
					type: 'threedots',
					optional: true,
				},
				{
					type: 'pipe',
					optional: true,
				},
			]
		}, 
		func_params: {
			start: '(',
			free_chars: true,
			end: ')'
		},
		quantifier_char: {
			free_chars: true,
			regex: /^[\*\+]+$/,
		},
		quantifier_num: {
			free_chars: true,
			start: '{',
			end: '}',
		},
		quantifier: {
			children: [
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
		bracket_extended: {
			func: function(struct, parser){
				var revolver = parser(struct.children[0].children[0]);
				var props = struct.children.slice(1);
				if(!props.length){
					return revolver;
				}
				if(revolver.subtype !== '|'){
					console.log('Useless quant or output - wrong revolver type', props);
					return revolver;
				}
				//console.log('OK, props' + revolver.subtype, props);
				for(let child of props){
					if(child.type === 'output'){
						revolver.output = parser(child);
					}
					if(child.type === 'pipe'){
						revolver.pipe = parser(child).chars;
					}
					if(child.type === 'quantifier'){
						var res = {}, quant = parser(child);
						//console.log('Found quantifier', quant);
						switch(quant.chars){
							case '*':
								res.min = 0;
							break;
							case '+':
								res.min = 1;
							break;
							default:
								if(quant.chars.indexOf(',') !== -1){
									var pieces = quant.chars.split(',');
									if(pieces[0]){
										res.min = Number(pieces[0]);
									}
									if(pieces[1]){
										res.max = Number(pieces[1]);
									}
								} else {
									// just one number, like {42}
									res.min = res.max = Number(quant.chars);
								}
							break;
						}
						revolver.quantifier = res;
					}
				}
				return revolver;
			}
			
			/*type: 'door',
			ret: 1,*/
		},
		quantifier: {
			type: 'door',
		},
		quantifier_char: {
			type: 'chars',
		},
		quantifier_num: {
			type: 'chars',
		},
		cond: {
			type: 'chars',
		},
		pipe: {
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
						// ">" be default
						return {
							type: 'revolver',
							subtype: '>',
							children: parser(children),
						}
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
		func: {
			func: (struct, parser) => {
				//console.log('analyzing func!', struct, parser);
				var self = {
					name: struct.children[0].chars,
					params: struct.children[1].chars ? struct.children[1].chars : '',
					type: 'func',
					subtype: 'sync'
				};
				for(let child of struct.children){
					if(child.type === 'output'){
						self.output = parser(child);
					}
					if(child.type === 'pipe'){
						self.pipe = parser(child).chars;
					}
					if(child.type === 'cond'){
						self.cond = parser(child).chars;
					}
					if(child.type === 'threedots'){
						self.subtype = 'async';
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
						var res = {}, quant = parser(child);
						//console.log('Found quantifier', quant);
						switch(quant.chars){
							case '*':
								res.min = 0;
							break;
							case '+':
								res.min = 1;
							break;
							default:
								if(quant.chars.indexOf(',') !== -1){
									var pieces = quant.chars.split(',');
									if(pieces[0]){
										res.min = Number(pieces[0]);
									}
									if(pieces[1]){
										res.max = Number(pieces[1]);
									}
								} else {
									// just one number, like {42}
									res.min = res.max = Number(quant.chars);
								}
							break;
						}
						self.quantifier = res;
					}
					if(child.type === 'pipe'){
						self.pipe = parser(child).chars;
					}
					if(child.type === 'cond'){
						self.cond = parser(child).chars;
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