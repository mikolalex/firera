(function(){
	var parser = che_parser.get_parser(ozenfant_config);
	var Ozenfant = function(str){
		this.struct = parser(str);
		this.node_vars_paths = {};
		this.text_vars_paths = {};
		this.nodes_vars = {};
		get_vars({children: this.struct.semantics}, this.node_vars_paths, this.text_vars_paths, this.nodes_vars, '.');
	};
	
	var get_varname = (node) => {
		var key = node.variable.substr(1);
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
				if(!node.children[i].tagname && !node.children[i].classnames){
					//console.log('text node!', node.children[i]);
					++nodes_lag;
				} else {
					++text_lag;
				}
				var new_path = path + '/*[' + (Number(i) + 1 - nodes_lag) + ']';
				if(node.children[i].variable){
					node_pool[get_varname(node.children[i])] = new_path;
					//console.log('Found var!', get_varname(node.children[i]), new_path);
				} else if(node.children[i].quoted_str){
					//console.log('str!', node.children[i].quoted_str);
					node.children[i].quoted_str.replace(/\$([a-zA-Z0-9]*)/g, (_, key) => {
						var text_path = path + '/text()[' + (Number(i) + 1 - text_lag) + ']';
						if(!path_pool[text_path]){
							path_pool[text_path] = node.children[i].quoted_str;
						}
						text_pool[key] = text_path;
						//console.log('text key found', key, text_path);
					})
				} else {
					get_vars(node.children[i], node_pool, text_pool, path_pool, new_path);
				}
			}
		}
	}
	
	var toHTML = function(node, context){
		var res1 = [], res2 = [], after = '';
		for(let child of node.children){
			res1.push(toHTML(child, context));
		}
		var indent = `
` + new Array(node.level).join('	');
		if(node.tagname || node.classnames){
			// it's a node
			var tag = node.tagname ? node.tagname : 'div';
			//console.log('TAG', tag, node.classnames);
			res2.push(indent + '<' + tag);
			if(node.classnames && node.classnames.length > 1){
				res2.push(' class="' + node.classnames.substr(1).replace(/\./g, " ") + '"');
			}
			res2.push('>');
			if(node.variable){
				var key = get_varname(node);
				res2.push(indent + '	' + (context[key] !== undefined ? context[key] : ''));
			} else {
				res2.push(res1.join(' '));
			}
			res2.push(indent + '</' + tag + '>');
			return res2.join('');
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
		return toHTML({children: this.struct.semantics}, context = context);
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
			console.warn('Unknown key for binding:', key);
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
	
	window.Ozenfant = Ozenfant;
})()

