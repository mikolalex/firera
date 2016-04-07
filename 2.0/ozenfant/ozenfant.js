(function(){
	var parser = che_parser.get_parser(ozenfant_config);
	var Ozenfant = function(str){
		this.struct = parser(str);
	};
	
	var toHTML = function(node){
		var res1 = [], res2 = [], after = '';
		for(let child of node.children){
			res1.push(toHTML(child));
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
			res2.push(res1.join(' '));
			res2.push(indent + '</' + tag + '>');
			return res2.join('');
		} else {
			// its var of text node
			if(node.quoted_str){
				return indent + node.quoted_str;
			}
			if(node.variable){
				return indent + node.variable;
			}
		}
		return res1.join(' ');
	}
	
	Ozenfant.prototype.toHTML = function(){
		return toHTML({children: this.struct.semantics});
	}
	
	
	window.Ozenfant = Ozenfant;
})()

