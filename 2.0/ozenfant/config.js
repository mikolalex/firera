
window.ozenfant_config = {
	syntax: {
		root_token: {
			children: [
				'>',
				{
					type: 'item',
					multiple: true,
				},
			]
		},
		item: {
			end: `
`,
			children: [
				'>',
				{
					type: 'indent',
					optional: true,
				},
				{
					type: 'str',
				}
			]
		},
		indent: {
			regex: /\t/,
			free_chars: true,
		},
		str: {
			regex: /[^\n]/,
			free_chars: true,
		},
	},
	semantics: {
		root_token: {
			type: 'door',
		},
		item: {
			func: (struct, parser) => {
				return struct.children;
			}
		},
		indent: {
			type: 'chars',
		}
	}
}
