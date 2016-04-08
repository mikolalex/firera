(function(){
	var parser = che_parser.get_parser(ozenfant_config);
	var Ozenfant = function(str){
		this.struct = parser(str);
	};
	
	var get_vars = (node, pool, path) => {
		if(node.children){
			for(var i in node.children){
				
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
				var key = node.variable.substr(1);
				if(!key.length){
					if(node.classnames){
						key = node.classnames.substr(1).split('.')[0];
					} else {
						console.warn('Incorrect statement: variable without name and default class!');
					}
					// first class name, by convention
				}
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
	Ozenfant.prototype.render = function(node, context){
		node.innerHTML = this.toHTML(context);
	}
	Ozenfant.xpOne = (path, node = document) => {
		return document.evaluate(path, node, null, XPathResult.ANY_TYPE, null).iterateNext(); 
	}
	
	window.Ozenfant = Ozenfant;
})()

