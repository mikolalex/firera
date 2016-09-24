	var ozenfant_config = require('./config');
	var parser = require('../che/parser').get_parser(ozenfant_config);
	var Ozenfant = function(str){
		this.struct = parser(str);
		this.node_vars_paths = {};
		this.text_vars_paths = {};
		this.nodes_vars = {};
		get_vars({children: this.struct.semantics}, this.node_vars_paths, this.text_vars_paths, this.nodes_vars, '.');
	};
	var get_varname = (node) => {
		var key = node.varname;
		if(!key.length){
			if(node.classnames){
				key = node.classnames.substr(1).split('.')[0];
			} else {
				console.warn('Incorrect statement: variable without name and default class!');
			}
		}
		return key;
	}
	
	var get_vars = (node, node_pool, text_pool, path_pool, path) => {
		if(node.children){
			var nodes_lag = 0;
			var text_lag = 0;
			for(var i in node.children){
				var zild = node.children[i];
				if(!zild.tagname && !zild.classnames){
					//console.log('text node!', node.children[i]);
						++nodes_lag;
				} else {
						++text_lag;
				}
				var new_path = path + '/*[' + (Number(i) + 1 - nodes_lag) + ']';
				if(zild.type){
					get_vars(zild, node_pool, text_pool, path_pool, new_path);
				} else if(zild.varname !== undefined){
					node_pool[get_varname(zild)] = new_path;
					//console.log('Found var!', get_varname(node.children[i]), new_path);
				} else if(zild.quoted_str){
					//console.log('str!', node.children[i].quoted_str);
					zild.quoted_str.replace(/\$([a-zA-Z0-9]*)/g, (_, key) => {
						var text_path = path + '/text()[' + (Number(i) + 1 - text_lag) + ']';
						if(!path_pool[text_path]){
							path_pool[text_path] = zild.quoted_str;
						}
						text_pool[key] = text_path;
						//console.log('text key found', key, text_path);
					})
				} else {
					get_vars(zild, node_pool, text_pool, path_pool, new_path);
				}
			}
		}
	}
	
	var html_attrs = new Set(['href', 'src', 'style', 'target', 'id', 'class', 'rel', 'type'])
	var input_types = new Set(['text', 'submit', 'checkbox', 'radio']);
	
	var toHTML = function(node, context, parent_tag){
		var indent = `
` + new Array(node.level).join('	');
		var res1 = [], res2 = [], after = '';
		if(node.type === 'ELSE'){
			return '';
		}
		var childs = node.children;
		if(node.type === 'IF'){
			if(!context[node.varname]){
				// "ELSE" part
				childs = node.else_children.children;
			}
		}
		if(node.tagname || node.classnames || !parent_tag){
			// it's a node
			var tag;
			if(node.tagname){
				if(input_types.has(node.tagname)) {
					node.assignments = node.assignments || [];
					node.assignments.push('type: ' + node.tagname);
					tag = 'input';
				} else {
					tag = node.tagname;
				}
			} else {
				switch(parent_tag){
					case 'ol':
					case 'ul':
						tag = 'li';
					break;
					case 'tr':
						tag = 'td';
					break;
					default:
						tag = 'div';
					break;
				}
			}
			for(let child of childs){
				res1.push(toHTML(child, context, tag));
			}
			if(parent_tag){
				res2.push(indent + '<' + tag);
				if(node.classnames && node.classnames.length > 1){
					res2.push(' class="' + node.classnames.substr(1).replace(/\./g, " ") + '"');
				}
				if(node.assignments){
					var styles = [];
					for(let ass of node.assignments){
						var assign = ass.split(':');
						var key = assign[0].trim();
						var val = assign[1].trim();
						if(html_attrs.has(key) || key.match(/^data\-/)){
							res2.push(' ' + key + '="' + val + '"');
						} else {
							styles.push(key + ': ' + val + ';');
						}
					}
					if(styles.length){
						res2.push(' style="' + styles.join('') + '"');
					}
				}
				res2.push('>');
				if(node.varname !== undefined && !node.type){
					var key = get_varname(node);
					res2.push(indent + '	' + (context[key] !== undefined ? context[key] : ''));
				} else {
					res2.push(res1.join(' '));
				}
				res2.push(indent + '</' + tag + '>');
				return res2.join('');
			}
		} else {
			// its var of text node
			if(node.quoted_str){
				return indent + node.quoted_str.replace(/\$([a-zA-Z0-9]*)/g, function(_, key){
					//console.log('Found!', key, context[key]);
					return context[key] !== undefined ? context[key] : '';
				});
			}
			if(node.variable){
				return indent + node.variable;
			}
		}
		return res1.join(' ');
	}
	
	Ozenfant.prototype.toHTML = function(context = {}){
		var res = toHTML({children: this.struct.semantics}, context = context);
		return res;
	}
	
	Ozenfant.prototype.searchByPath = function(path){
		return Ozenfant.xpOne(path, this.root);
	}
	
	Ozenfant.prototype.updateBindings = function(){
		this.bindings = {};
		for(let varname in this.node_vars_paths){
			this.bindings[varname] = this.searchByPath(this.node_vars_paths[varname]);
			if(!this.bindings[varname]){
				console.warn('No node found for path:', this.node_vars_paths[varname], 'in context', this.root);
			}
		}
		for(let varname in this.text_vars_paths){
			this.bindings[varname] = this.searchByPath(this.text_vars_paths[varname]);
			if(!this.bindings[varname]){
				console.warn('No node found for path:', this.text_vars_paths[varname], 'in context', this.root);
			}
		}
	}
	Ozenfant.prototype.render = function(node, context){
		this.root = node;
		this.state = context;
		node.innerHTML = this.toHTML(this.state);
		this.updateBindings();
	}
	Ozenfant.prototype.set = function(key, val){
		this.state[key] = val;
		if(!this.bindings[key]){
			//console.warn('Unknown key for binding:', key);
			return;
		}
		if(!this.root) return;
		//console.log('path', this.text_vars_paths[key], 'vars', this.nodes_vars);
		if(this.nodes_vars[this.text_vars_paths[key]]){
			var template = this.nodes_vars[this.text_vars_paths[key]]
			var new_str = template.replace(/\$([a-zA-Z0-9]*)/g, (_, key) => {
				return this.state[key];
			});
			this.bindings[key].textContent = new_str;
		} else {
			this.bindings[key].textContent = val;
		}
	}
	Ozenfant.xpOne = (path, node = document) => {
		//console.log('NODE', node);
		return document.evaluate(path, node, null, XPathResult.ANY_TYPE, null).iterateNext(); 
	}
	
	module.exports = Ozenfant;

