(function(){
	var var_delimiter = '/';
	var el_delimiter = '|';
	var fulltrim = function(str){return str.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ');};
	
	var chock = {
		parse: function(str){
			var strings = str.split("\n");
			var nest = 0;
			var prev_nest = -1;
			var prev_el = 'text';
			var res = [];
			var closings = {};
			var parents = {};
			var vars = {};
			for(var i = 0;i<strings.length;i++){
				var t = strings[i].match(/(\t*)((\|)([^\s^\.^\/^\(^\:]*)?\:?([^\.^\/^\(\s]*)?(\.[^\(^\/^\s]*)?(\([^\)^\/]*\))?\/?(\.)?([a-zA-Z0-9\_\-]*)?)?(.*)/);			
				nest = t[1].length;
				if(nest < prev_nest || (nest === prev_nest && prev_el !== 'text')){
					for(var j = prev_nest;j>=nest;j--){
						if(closings[j]){
							res.push(closings[j]);
							delete closings[j];
						}
					}
				}
				if(t[3]){// its tag
					var tag = {
						tag: t[4],
						name: t[5],
						classes: t[6] ? t[6].split(".") : [],
						attrs: t[7],
						varname: t[9],
					}
					if(tag.attrs){
						tag.attrs = tag.attrs.slice(1, -1).split(';');
					} else {
						tag.attrs = [];
					}
					tag.tag = tag.tag ? tag.tag : (parents[nest - 1] === 'ul' ? 'li' : 'div');
					switch(tag.tag){
						case 'submit':
						case 'radio':
						case 'checkbox':
						case 'text':
							tag.attrs.push('type=' + tag.tag);
							tag.tag = 'input';
						break;
					}
					var closing = '\n' + t[1] + '</' + tag.tag + '>';
					switch(tag.tag){
						case 'br':
						case 'input':
						case 'img':
							closing = false;
						break;
					}
					parents[nest] = tag.tag;
					if(t[8]) tag.classes.push(t[9]);
					if(tag.varname) {
						tag.classes.push('fir-' + tag.varname);
						vars[tag.varname] = true;
					}
					var classes = tag.classes.length ? ' class="' + fulltrim(tag.classes.join(" ")) + '"' : '';
					res.push('\n' + t[1] + '<' + tag.tag + classes);
					var attrs = {};
					if(tag.attrs){
						for(var f = 0;f<tag.attrs.length;f++){
							if(tag.attrs[f].indexOf('=') === -1 && tag.attrs[f].indexOf(':') !== -1){// style attribute
								if(!attrs['style']) attrs['style'] = [];
								attrs['style'].push(tag.attrs[f]);
							} else {
								var attr = tag.attrs[f].split("=");
								if(attr[0]) attrs[attr[0]] = (attr[1] ? attr[1] : 'true');
							}
						}
					}
					if(attrs.style){
						attrs.style = attrs.style.join(';');
					}
					for(var k in attrs){
						res.push(' ' + k + '="' + attrs[k] + '"');
					}
					if(closing){
						res.push(">");
						closings[nest] = closing;
					} else {
						res.push(" />");
						closings[nest] = '';
					}
					prev_el = 'tag';
					prev_nest = nest;
				} else {
					prev_el = 'text';
				}	
				if(t[10]) res.push('\n' + t[1] + t[10]);
			}

			return {
				html: res.join(''),
				vars: vars,
			}
		}
	}
	this.chock = chock;
})()