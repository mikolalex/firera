(function(){
	
	var parserPackage = che_parser;
	var config = che_config;
	
	var parser = parserPackage.get_parser(che_config);
	var parsed_pool = {};
	
	var get_subscriptions = function(struct, cells_set){
		if(struct.event) struct = struct.event;
		if(!struct.type){
			console.warn('No type', struct);debugger;
		}
		switch(struct.type){
			case 'revolver':
				switch(struct.subtype){
					case '|':
						for(var i = 0;i < struct.children.length; i++){
							var child = struct.children[i];
							if(child.event){
								child = child.event;
							}
							get_subscriptions(struct.children[i], cells_set);
						}
					break;
					case '>':
						var child = struct.children[0];
						if(child.event){
							child = child.event;
						}
						get_subscriptions(child, cells_set);
					break;
				}
			break;
			case 'cell':
				cells_set.add(struct.name);
			break;
		}
		return cells_set;
	}
	
	var output = function(){
		
	}
	
	var no_luck = {};
	
	var absorb = function(struct, mirror_struct, cellname, value, output_cb){
		//console.log('Absorb', arguments);
		//console.log('checking children', struct.children);
		var res;
		var check = function(i){
			let child = struct.children[i];
			if(child.event){
				child = child.event;
			}
			switch(child.type){
				case 'cell':
					//console.log('CHCKING CELL', child.name, cellname);
					if(child.name === cellname){
						return value;
					}
				break;
				case 'revolver':
					if(!mirror_struct.children[i]){
						mirror_struct.children[i] = {
							children: [],
						}
					}
					return absorb(child, mirror_struct.children[i], cellname, value, output_cb);
				break;
			}
			return no_luck;
		}
		var output = function(output, val){
			var title = output.title;
			output_cb(title, val);
		}
		switch(struct.subtype){
			case '|':
				for(let i in struct.children){
					res = check(i);
					if(res !== no_luck){
						//console.log('| REVOLVER SUCCESS!', struct.children[i]);
						if(struct.children[i].output){
							output(struct.children[i].output, res);
						}
						return value;
					}
				}
			break;
			case '>':
				var pos = mirror_struct.pos || 0;
				res = check(pos);
				if(res !== no_luck){
					if(struct.children[pos].output){
						output(struct.children[pos].output, res);
					}
					var next_pos = ++pos;
					if(!struct.children[next_pos]){
						// revolver finished
						//console.log(struct.children, next_pos, '> REVOLVER SUCCESS!');
						return value;
					} else {
						mirror_struct.pos = next_pos;
					}
				}
			break;
		}
		return no_luck;
	}
	
	var State = function(struct){
		this.struct = struct;
		this.mirror = {
			children: [],
		};
		this.refreshSubscriptions();
	};
	
	State.prototype.getStruct = function(struct){
		return this.struct;
	}
	
	State.prototype.absorb = function(cellname, value, output_cb){
		return absorb(this.struct, this.mirror, cellname, value, output_cb);
	}
	
	State.prototype.refreshSubscriptions = function(){
		var subscr = new Set;
		this.subscriptions = get_subscriptions(this.getStruct(), subscr);
	}
	
	window.che = {
		link: function(che_expression, linking){
			var struct;
			if(parsed_pool[che_expression]){
				struct = parsed_pool[che_expression];
			} else {
				struct = parsed_pool[che_expression] = parser(che_expression);
			}
			console.log('got struct', struct);
			var state = new State(struct.semantics);
			return {
				drip: function(cellname, val){
					var res = state.absorb(cellname, val, linking.onOutput);
					//console.log('Drip', val, 'to', cellname + ',', 'got', res);
					if(res !== no_luck){
						// pattern done
						if(linking.onSuccess){
							linking.onSuccess();
						}
					}
				},
				state: state
			}
		},
	}
})()