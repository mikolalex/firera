/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

(function(){
	var get_token = (type) => {
		return {
			type: type,
			children: [],
		}
	}
	var match_start = function(){
		
	}
	
	var is_empty_char = (char) => {
		return char === ' ' || char === '\n' || char === '	';
	}
	var head = (a) => {
		return a[0];
	}
	var tail = (a) => {
		return a.slice(1);
	}
	
	var parse_semantics = function(config, struct){
		if(struct instanceof Array){
			if(struct.length === 1){
				struct = struct[0];
			} else {
				var r = [];
				for(var i in struct){
					r.push(parse_semantics(config, struct[i]));
				}
				return r;
			}
		}
		var type = struct.type;
		var children = struct.children;
		var sem = config[type];
		if(!sem){
			console.error('No token semantic description', type, struct);
			return;
		}
		if(sem.type){
			switch(sem.type){
				case 'door':
					var to_parse = sem.ret ? children[sem.ret - 1] : children;
					return parse_semantics(config, to_parse);
				break;
				case 'chars':
					return {chars: struct.chars}
				break;
			}
		}
		if(sem.func){
			return sem.func(struct, parse_semantics.bind(null, config));
		}
	};
	
	var flatten = function(struct, arr){
		var get_children = function(struct, arr){
			if(struct.children){
				for(var i in struct.children){
					if(struct.children[i].type){
						var child = {
							type: struct.children[i].type,
							children: [],
						}
						if(struct.children[i].chars){
							child.chars = struct.children[i].chars;
						}
						arr.push(child);
						get_children(struct.children[i], child.children);
					} else {
						get_children(struct.children[i], arr);
					}
				}
			}
		}
		var res = [];
		get_children({children: [struct]}, res);
		return res[0];
	}
	
	var parse = function(config, str){
		var parse_rec = function parse_rec(tt, str, pos){
			var original_pos = pos;
			var showpos = function(){
				return str.substr(0, pos) + '@@@' + str.substr(pos);
			}
			if(!tt) debugger;
			//console.log('PR', pos, tt, 'from', showpos());
			var children;
			var res = {
				children: [],
			};
			if(typeof tt === 'string'){
				res.type = tt;
				if(!config.syntax[tt]){
					console.error('Token not found:', tt);
				}
				var tk = config.syntax[tt];
				if(tk.start !== undefined){
					var started = false;
					while(++pos){
						var char = str[pos - 1];
						if(is_empty_char(char)){
							continue;
						}
						if(char !== tk.start){
							//console.log('parsing', tt, 'failed:', pos, 
							//str[pos], 'instead of', tk.start);
							return [false, pos-1];
						} else {
							break;
						}
					}
				}
				if(tk.children_tokens){
					children = tk.children_tokens;
				} else {
					if(tk.free_chars){
						var start_pos = pos;
						if(tk.end || tk.regex){
							var started = false;
							while(++pos){
								var char = str[pos - 1];
								if((char === ' ' || char === '\n') && !started){
									continue;
								}
								if(tk.end && char === tk.end){
									res.chars = str.substr(start_pos, pos - start_pos - 1);
									return [res, pos];
								} else {
									if(tk.regex){
										if(!char || !(char.match(tk.regex))){
											if(started){
												//console.log(char, 'is end for', tt, pos);
												res.chars = str.substr(start_pos, pos - start_pos - 1);
												return [res, pos - 1];
											} else {
												//console.log('DED END!', char, tt);
												return [false, pos - 1];
											}
										}
									}
								}
								started = true;
							}
						} else {
							console.warn('Could not parse free chars without end!');
							return [false, pos];
						}
					} else {
						console.warn('No chars and no tokens - what to do?');
					}
				}
			} else {
				children = tt;
			}
			if(!children) return res;
			var children_type = head(children);
			var rest_children = tail(children);
			//console.log('chtype', children_type, rest_children);
			switch(children_type){
				case '>':
					//console.log('parsing > children', rest_children);
					var p = pos;
					for(var b of rest_children){
						var r;
						var struct_to_parse = b instanceof Array ? b : b.type;
						if(b.multiple){
							while(true){
								var rz = parse_rec(struct_to_parse, str, p);
								r = rz[0];
								p = rz[1];
								if(!r){
									if(b.optional){
										break;
									}
									//console.log('Whole line failed!', tt);
									return [false, p];
								}	
								//console.log('___________Parsed', b, 'results', r, p);
								pos = p;
								res.children.push(r);
							}
						} else {
							var rz = parse_rec(struct_to_parse, str, p);
							r = rz[0];
							p = rz[1];
							if(!r){
								if(b.optional){
									continue;
								}
								//console.log('Whole line failed!', tt);
								return [false, p];
							}	
							//console.log('___________Parsed', b, 'results', r, p);
							pos = p;
							res.children.push(r);
						}
						//++p;
					}
				break;
				case '|':
					//console.log('parsing | children', children);
					for(var b of rest_children){
						var r;
						var struct_to_parse = b instanceof Array ? b : b.type;
						var rz =  parse_rec(struct_to_parse, str, pos);
						r = rz[0];
						p = rz[1];
						if(!r){
							continue;
						} else {
							res.children.push(r);
							pos = p;
							break;
						}
						return [false, pos];
					}
					if(!res.children.length){
						//console.log('Nothing found', tt);
						return [false, pos];
					}
				break;
				default:
					console.error('Unknown children type:', children_type);
				break;
			}
			if(tk && tk.end){
				if(str[pos] === tk.end){
					//console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^', tt, 'finished!')
					++pos;
				} else {
					//console.log('_+_+_+_+_+_+ FAIL FAIL FAIL! look for end of', tt, pos, str[pos]);
				}
			}
			return [res, pos];
		}
		var struct = parse_rec('root_token', str, 0);
		struct = flatten(struct[0]);
		// sematic parsing
		var sematics = parse_semantics(config.semantics, struct);
		console.log('SEMANTICS', sematics);
		return struct;
	}
	this.che_parser = {
		get_parser: (config) => {
			return parse.bind(null, config);
		},
		dump: function(struct){
			var rec = function(struct, level){
				var res = [];
				if(struct.type){
					res.push('Type: ' + struct.type);
				}
				if(struct.chars){
					res.push('Str: ' + struct.chars);
				}
				if(struct.children){
					var r = [];
					for(var i in struct.children){
						r.push(rec(struct.children[i], level+1));
					}
					res.push('<div>' + r.join('	') + '</div>');
				}
				return '<div>' + res.join('<br>') + '</div>';
			}
			return rec(struct, 0);
		}
	}
})()
