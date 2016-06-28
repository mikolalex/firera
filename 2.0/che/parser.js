/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

	var get_token = (type) => {
		return {
			type: type,
			children: [],
		}
	}
	var match_start = function(){

	}
	var empty_chars_default = [' ', '	', `
`];
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
		if(!struct){
			console.warn('oops', config, struct);
			return;
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

	var parse = function(config, str, debug){
		var is_empty_char = (char) => {
			var empty_chars = config.empty_chars || empty_chars_default;
			return empty_chars.indexOf(char) !== -1;
		}
		var parse_rec = function parse_rec(tt, str, pos){
			var original_pos = pos;
			var showpos = function(){
				return str.substr(0, pos) + '@@@' + str.substr(pos);
			}
			//console.log('Parsing', '___' + tt + '___', 'token from', pos, showpos());
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
				//console.log('Token props:', tk);
				if(tk.start !== undefined){
					var started = false;
					var start_pos = pos;
					while(++pos){
						var char = str[pos - 1];
						if(is_empty_char(char)){
							continue;
						}
						if(char !== tk.start){
							//console.log('parsing', tt, 'failed:', pos, 
							//str[pos], 'instead of', tk.start);
							return [false, start_pos];
						} else {
							break;
						}
					}
				}
				if(tk.children){
					children = tk.children;
				} else {
					if(tk.free_chars){
						//console.log('Parsing free chars');
						var start_pos = pos;
						if(tk.end || tk.regex){
							var started = false;
							var lag = 0;
							while(++pos){
								var char = str[pos - 1];
								//console.log('Considering char', char);
								if(char === undefined){
									// we reached the end!
									if(pos - start_pos > 1){
										//console.log('we reached the end!');
										res.chars = str.substr(start_pos, pos - start_pos - 1);
										return [res, pos - 1];
									} else {
										return false;
									}
									//return [res, pos + 1];
								}
								//console.log('parsing free chars', '"' + char + '"', 'as', tt);
								if(is_empty_char(char) && !started){
									++lag;
									continue;
								}
								if(tk.end && char === tk.end){
									res.chars = str.substr(start_pos, pos - start_pos - 1 + lag);
									return [res, pos];
								} else {
									if(tk.regex){
										var string_to_compare = str.substr(start_pos + lag, pos - start_pos - lag);
										//console.log('matching regex', tk.regex, 'against', string_to_compare);
										var a1 = !!char.match(tk.regex);
										var a2 = !!string_to_compare.match(tk.regex);
										//if(a1 !== a2){
										//console.log('Comparing', start_pos, a1, a2, tt, '"' + char + '"', 'vs.', '"' + string_to_compare + '".match(' + tk.regex + ')');
										//}
										if(!char || !(string_to_compare.match(tk.regex))){
											if(started){
												res.chars = str.substr(start_pos + lag, pos - start_pos - 1 - lag);
												//console.log('______________ success', res.chars);
												return [res, pos - 1];
											} else {
												//console.log('DED END!', char, tt);
												return [false, pos - 1 - lag];
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
						console.warn('No chars and no tokens - what to do?', tk);
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
					//console.log('parsing > children', tt);
					var p = pos;
					for(var b of rest_children){
						if(typeof b === 'string') continue;
						var r;
						var struct_to_parse = b instanceof Array ? b : b.type;
						var optional = b.optional;
						var multiple = b.multiple;
						if(struct_to_parse instanceof Array && typeof struct_to_parse[struct_to_parse.length - 1] === 'string'){
							optional = true;
							multiple = true;
						}
						while(true){
							//console.log('parsing multiple', struct_to_parse, 'as', tt);
							var rz = parse_rec(struct_to_parse, str, p);
							r = rz[0];
							p = rz[1];
							if(!r){
								if(optional){
										break;
								}
								return [false, p];
							}	
							pos = p;
							res.children.push(r);
							if(multiple){
								if(str[p] === undefined){
									break;
								}
							} else {
								break;
							}
						}
					}
				break;
				case '|':
					//console.log('parsing | children', children);
					for(var b of rest_children){
						if(typeof b === 'string') continue;
						var r;
						var struct_to_parse = b instanceof Array ? b : b.type;
						var rz = parse_rec(struct_to_parse, str, pos);
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
				var pp = pos;
				while(++pp){
					var char = str[pp - 1];
					if(is_empty_char(char)){
						continue;
					}
					if(char === tk.end){
						pos = pp;
					}
					break;
				}
			}
			return [res, pos];
		}
		var struct = parse_rec('root_token', str, 0);
		struct = flatten(struct[0]);
		// sematic parsing
		var semantics = parse_semantics(config.semantics, struct);
		return {syntax: struct, semantics};
	}
	module.exports = {
		get_parser: (config) => {
			return parse.bind(null, config);
		},
		dump: function(struct){
			var rec = function(struct, level){
				if(!struct) return;
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
