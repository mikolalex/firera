
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
				{
					type: 'str',
					optional: true,
				},
				{
					type: 'lineend',
				}
			]
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
