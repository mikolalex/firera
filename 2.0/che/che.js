var parserPackage = require('./parser');
var config = require('./config');

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

var no_luck = new function NoLuck(){}
var is_luck = (a) => a !== no_luck;

var is_multiple = (quant) => {
	return !!(quant && (quant.max !== quant.min));
}


var Chex = function(struct, linking, callbacks){
	this.struct = struct;
	this.onOutput = linking.onOutput;
	this.onSuccess = linking.onSuccess;
	this.callbacks = callbacks;
	this.state = {};
	this.mirror = {
		children: [],
	};
	this.refreshSubscriptions();
	this.activate_needed_events();
};

Chex.prototype.getStruct = function(struct){
	return this.struct;
}

Chex.prototype.absorb = function(struct, mirror_struct, cellname, value){
	//console.log('checking children', struct.children);
	var res;
	var check = (i) => {
		let child = struct.children[i];
		if(child.event){
			child = child.event;
		}
		switch(child.type){
			case 'cell':
				if(child.name === cellname){
					var cond = struct.children[i].cond;
					if(cond){
						--cond; // because it's 1-based
						if(!this.callbacks[cond]){
							console.error('No callback for cond:', cond);
						}
						var lakmus = this.callbacks[cond](this.state, value);
						if(!lakmus) return no_luck;
					} 
					var pipe = struct.children[i].pipe;
					if(pipe){
						--pipe; // because it's 1-based
						if(!this.callbacks[pipe]){
							console.error('No callback for pipe:', pipe);
						}
						this.state = this.callbacks[pipe](this.state, value);
					} else {
						// regular join
						var as_array = is_multiple(struct.children[i].quantifier);
						if(as_array){
							if(!this.state[cellname]){
								this.state[cellname] = [];
							}
							this.state[cellname].push(value);
						} else {
							this.state[cellname] = value;
						}
					}
					return value;
				}
			break;
			case 'revolver':
				if(!mirror_struct.children[i]){
					mirror_struct.children[i] = {
						children: [],
					}
				}
				return this.absorb(child, mirror_struct.children[i], cellname, value);
			break;
		}
		return no_luck;
	}
	var output = (output, val) => {
		var title = output.title;
		if(output.pipes.length){
			for(let cb_num of output.pipes){
				if(!this.callbacks[cb_num - 1]){
					console.error('No callback provided - ', cb_num);
					continue;
				}
				val = this.callbacks[cb_num - 1](this.state, val);
			}
		}
		this.onOutput(title, val);
	}
	switch(struct.subtype){
		case '|':
			for(let i in struct.children){
				//console.log('checking', struct.children[i]);
				res = check(i);
				if(is_luck(res)){
					if(struct.children[i].output){
						output(struct.children[i].output, res);
					}
					return value;
				}
			}
		break;
		case '&':
			mirror_struct.count_all_counter = mirror_struct.count_all_counter || 0;
			mirror_struct.count_all_each_event = mirror_struct.count_all_each_event || {};
			for(let i in struct.children){
				//console.log('checking', struct.children[i], i, mirror_struct.count_all_counter);
				res = check(i);
				if(is_luck(res)){
					if(struct.children[i].output){
						output(struct.children[i].output, res);
					}
					if(!mirror_struct.count_all_each_event[i]){
						mirror_struct.count_all_counter++;
						if(mirror_struct.count_all_counter === struct.children.length){
							//console.log('Full success!');
							return value;
						}
					}
					mirror_struct.count_all_each_event[i] = true;
				}
			}
		break;
		case '>':
			var pos = mirror_struct.pos || 0;
			//console.log('________________________', cellname, pos);
			for(let i = pos; ; i++){
				if(!struct.children[i]){
					break;
				}
				res = check(i);
				//console.log('Check', struct.children[i].event.name, cellname, is_luck(res));
				if(is_luck(res)){
					if(mirror_struct.counter === undefined){
						mirror_struct.counter = 0;
					}
					++mirror_struct.counter;

					if(struct.children[i].output){
						output(struct.children[i].output, res);
					}
					var next_pos = pos + 1;
					if(!struct.children[next_pos]){
						// revolver finished
						//console.log(struct.children, next_pos, '> REVOLVER SUCCESS!');
						return value;
					} else {
						if(!struct.children[i].quantifier 
								|| mirror_struct.counter > struct.children[i].quantifier.max){
							//console.log(struct.children[i].quantifier, mirror_struct.counter);
							// if it's finite
							pos = i;
							++pos;
							mirror_struct.pos = pos;
						}
					}
				} else {
					if(
							struct.children[i].quantifier 
							&& struct.children[i].quantifier.min !== 0
							//&& struct.children[i].quantifier.max !== undefined
					){
						break;
					}
				}
				if(!struct.children[i].quantifier || !is_multiple(struct.children[i].quantifier)){
					//console.log('should break', struct.children[i].quantifier);
					break;
				}
				if(
						struct.children[i].quantifier 
						&& struct.children[i].quantifier.max !== undefined
						&& mirror_struct.counter < struct.children[i].quantifier.max
				){
					//console.log);
					// struct.children[i].quantifier.max < mirror_struct.counter
					//console.log('should break', struct.children[i].quantifier);
					break;
				}
			}
		break;
	}
	return no_luck;
}

Chex.prototype.refreshSubscriptions = function(){
	var subscr = new Set;
	this.subscriptions = get_subscriptions(this.getStruct(), subscr);
}

Chex.prototype.sleep = function(){
	this.mirror = {
		children: [],
	};
	this.state = {};
	this.sleeping = true;
}

Chex.prototype.awake = function(){
	this.sleeping = false;
}

Chex.prototype.activate_needed_events = function(){
	this.needed_events = this.get_active_cells(this.struct, this.mirror);
	// @todo: check for linked chex' and activate them
}

Chex.prototype.get_active_cells = function(branch, mirror, cells = new Set){
	var res = [];
	if(branch.type === 'revolver'){
		if(!mirror.children){
			mirror.children = [];
		}
		switch(branch.subtype){
			case '>':
				//console.log('Activate selected part of > revolver');
				mirror.pos = mirror.pos || 0;
				for(let p = mirror.pos; p < branch.children.length; p++){
					if(!mirror.children[p]){
						mirror.children[p] = {children: []};
					}
					this.get_active_cells(branch.children[p], 
					mirror.children[p], cells);
				}
			break;
			default:
				for(let p in branch.children){
					if(!mirror.children[p]){
						mirror.children[p] = {children: []};
					}
					this.get_active_cells(branch.children[p], 
					mirror.children[p], cells);
				}
				//console.log('Activate each part of revolver');
			break;
		}
	} else {
		switch(branch.event.type){
			case 'cell':
				cells.add(branch.event.name);
			break;
			case 'revolver':
				if(!mirror.children[0]){
					mirror.children[0] = {children: []};
				}
				this.get_active_cells(branch.event, 
				mirror.children[0], cells);
			break;
		}
	}
	return cells;
}

Chex.prototype.drip = function(cellname, val){
	if(this.finished){
		//console.log('No way, it\'s over!');
		return;
	}
	if(this.sleeping){
		//console.log('No, I\'m sleeping!');
		return;
	}
	if(!this.needed_events.has(cellname)){
		//console.log('We are not interested in this event now', cellname);
		return;
	}
	var res = this.absorb(this.struct, this.mirror, cellname, val);
	this.activate_needed_events();
	if(res !== no_luck){
		// pattern done
		//console.log('________ FINISH!');
		this.finished = true;
		this.mirror = {
			children: [],
		};
		if(this.onSuccess){
			this.onSuccess();
		}
	}
}

module.exports = {
	create: function(che_expression, linking, ...callbacks){
		var struct;
		if(parsed_pool[che_expression]){
			struct = parsed_pool[che_expression];
		} else {
			struct = parsed_pool[che_expression] = parser(che_expression);
		}
		var state = new Chex(struct.semantics, linking, callbacks);
		return state;
	},
}