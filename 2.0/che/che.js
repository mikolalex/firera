(function(){
	
	var parserPackage = che_parser;
	var config = che_config;
	
	var parser = parserPackage.get_parser(che_config);
	var parsed_pool = {};
	
	var get_subscriptions = function(struct, cells_set){
		if(!struct) 
			debugger;
		if(!struct.type){
			console.warn('No type', struct);
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
	
	var absorb = function(struct, mirror_struct, cellname, value){
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
						return true;
					}
				break;
				case 'revolver':
					if(!mirror_struct.children[i]){
						mirror_struct.children[i] = {
							children: [],
							parent: mirror_struct,
							struct: child,
						}
					}
					return absorb(child, mirror_struct.children[i], cellname, value);
				break;
			}
		}
		switch(struct.subtype){
			case '|':
				for(let i in struct.children){
					res = check(i);
					if(res){
						//console.log('| REVOLVER SUCCESS!');
						return true;
					}
				}
			break;
			case '>':
				var pos = mirror_struct.pos || 0;
				res = check(pos);
				if(res){
					var next_pos = ++pos;
					if(!struct.children[next_pos]){
						//console.log(struct.children, next_pos, '> REVOLVER SUCCESS!');
						return true;
					} else {
						mirror_struct.pos = next_pos;
					}
				}
			break;
		}
		return false;
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
	
	State.prototype.absorb = function(cellname, value){
		return absorb(this.struct, this.mirror, cellname, value);
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
					var res = state.absorb(cellname, val);
					if(res){
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