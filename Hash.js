var Parser = require('./Parser');
var utils = require('./utils');
var Obj = utils.Obj;
var Arr = utils.Arr;

var unusual_cell = (cellname) => {
	return !(cellname.match(/^([a-zA-Z0-9\_]*)$/));
}

var create_provider = (app, self) => {
	return {
		pool: {},
		create: function(self, type, link_as, free_vals){
			var child_id = self.app.createHash(type, link_as, free_vals, self.id);
			utils.init_if_empty(self, 'linked_hashes', {}, link_as, child_id);
			this.set(link_as, child_id);
			this.get(link_as).linked_hashes_provider.set('..', self.id);
			app.linkManager.onNewHashAdded(self.id, child_id);
			return child_id;
		},
		set: function(name, hash_id){
			this.pool[name] = hash_id;
		},
		isLinked: function(name){
			return !!this.get(name);
		},
		get: function(name){
			var id = this.pool[name];
			
			return id ? app.hashes[id] : false;
		},
		remove: function(name){
			var id = this.pool[name];
			delete this.pool[name];
			self.app.hashes[id].set('$remove', true);
			delete self.app.hashes[id];
		},
		setCellValues: function(childName, values){
			this.get(childName).set(values);
		},
		initChild: function(name){
			if(!this.get(name).init){
				console.log('strange', this, name);
			}
			this.get(name).init();
		},
		unlinkChildCells: function(name){
			var hsh = this.get(name);
			if(!hsh){
				//console.warn('removing unexisting hash!', name);
				return;
			}
			this.remove(name);
		},
		getLinkedHashCellValue: function(hashname, cellname){
			var hash = this.get(hashname);
			return hash ? hash.cell_value(cellname) : false;
		},
		linkAnyTwoCells: function(slave, master){
			if(slave.indexOf('/') !== -1){
				app.linkManager.initLink(self.id, slave);
			} else {
				add_dynamic_link(self.dynamic_cell_links, slave, '__self', master, 'dynamic');
			}
		},
	}
}

var add_dynamic_link = (pool, cell, grid, slave_cell, type) => {
	utils.init_if_empty(pool, cell, {}, grid, []);
	var links = pool[cell][grid];
	for(let lnk of links){
		if(lnk.cell_name === slave_cell && lnk.type === type){
			// already exists
			return;
		}
	}
	links.push({
		cell_name: slave_cell,
		type: type
	})
}

var Hash = function(app, parsed_pb_name, name, free_vals, init_later, parent_id, path){
	var self = this;
	var id = ++app.hashIds;
	//////////////////////////
	//bm.start('init', '2', id);
	this.path = path;
	app.setHash(id, this);
	this.id = id;
	this.parent = parent_id;
	this.app = app;
	this.name = name || '__root';
	var parsed_pb;
	this.parsed_pb_name = parsed_pb_name;
	if(typeof parsed_pb_name === 'string'){
		parsed_pb = app.cbs[parsed_pb_name];
	} else {
		var key = '$$$_@@@_tag';
		if(parsed_pb_name[key]){
			parsed_pb = parsed_pb_name[key];
		} else {
			parsed_pb = app.parse_cbs(parsed_pb_name);
			parsed_pb_name[key] = parsed_pb;
		}
	}
	if(!parsed_pb){
		console.error('Cannot find hash to parse:', parsed_pb_name);
		return;
	}
	this.cell_types = parsed_pb.cell_types;
	this.side_effects = parsed_pb.side_effects;
	this.hashes_to_link = parsed_pb.hashes_to_link;
	this.plain_base = Object.create(parsed_pb.plain_base);
	this.link_chains = Object.create(parsed_pb.link_chains || {});
	this.levels = Object.create(parsed_pb.levels);
	//this.setLevels();
	this.linked_hashes_provider = create_provider(app, self);
	this.linked_hashes = {};
	// for "closure" cell type
	this.cell_funcs = {};
	this.dirtyCounter = {};
	this.dynamic_cell_links = {};
	this.dynamic_cells_props = {};
	if(this.cell_types['*']){
		/*var omit_list = this.all_cell_children('*');
		for(let cell in this.cell_types){
			if(omit_list.indexOf(cell) === -1 && can_be_set_to_html(cell, this.app)){
				add_dynamic_link(this.dynamic_cell_links, cell, '__self', '*', '');
			}
		}*/
	}
	this.cell_values = Object.assign({}, this.plain_base.$init || {});
	this.init_values = Object.assign({}, this.plain_base.$init, free_vals || {});
	//////////////////////////
	//bm.stop('init', '2', id);
	//bm.start('init', '1', id);
	Obj.each(this.hashes_to_link, (hash_name, link_as) => this.linkChild(hash_name, link_as));
	// @todo: refactor, make this set in one step
	//console.log('Setting $init values', this.init_values);
	//////////////////////////
	//bm.stop('init', '1', id);
	//bm.start('init', '3', id);

	if(this.plain_base.$init && !init_later){
		this.init();
	}
	//////////////////////////
	//bm.stop('init', '3', id);
	//bm.start('init', '4', id);
	if(parsed_pb.no_args_cells){
		//this.set(parsed_pb.no_args_cells);
		var min_level = Number.POSITIVE_INFINITY;
		var cell_vals = {};
		this.updateTree(parsed_pb.no_args_cells, false, true);
	}
	//////////////////////////
	//bm.stop('init', '4', id);
	//bm.start('init', '5', id);
	if(this.link_chains){
		for(let link in this.link_chains){
			this.initLinkChain(link);
		}
	}
	//////////////////////////
	//bm.stop('init', '5', id);
}

Hash.prototype.changesFinished = function(){
	this.app.changeFinished();
}

Hash.prototype.initIfSideEffectCell = function(cell){
	if(!this.cellExists(cell) && unusual_cell(cell)){
		Parser.parse_cellname(cell, this, 'getter', this.app.packagePool, this);
		this.cell_types = Parser.parse_cell_types(this.plain_base);
		var matched = Parser.findMatcher(cell, this.app.packagePool);
		if(matched){
			this.compute(cell);
		}
		//this.setLevels();
	}
}

Hash.prototype.hasChild = function(name){
	return this.linked_hashes && this.linked_hashes[name];
} 

Hash.prototype.init = function(){
	for(let cell in this.init_values){
		Parser.parse_cellname(cell, this, 'setter', this.app.packagePool);
	}
	this.set(this.init_values);
}
Hash.prototype.updateChildFreeValues = function(childName, values){
	this.linked_hashes_provider.setCellValues(childName, values);
}

Hash.prototype.initLinkChain = function(link){
	this.app.linkManager.initLink(this.id, link);
}

Hash.prototype.linkHash = function(cellname, val){
	//log('RUNNING SIDE EFFECT', this, val); 
	var hash, link1, link2, free_vals;
	cellname = cellname.replace("$child_", "");
	if(val instanceof Array){
		// it's hash and link
		hash = val[0];
		link1 = val[1];
		link2 = val[2];
		free_vals = val[3] || {};
	} else {
		hash = val;
	}
	if(!hash){
		console.warn('Trying to link undefined hash:', hash);
		return;
	}
	var child_id = this.linkChild(hash, cellname, free_vals);
	if(link1){
		//console.info('Linking by link1 hash', link1);
		Obj.each(link1, (his_cell, my_cell) => {
			this.app.linkManager.initLink(this.id, cellname + '/' + his_cell, my_cell);
		})
	}
	if(link2){
		//console.info('Linking by link2 hash', link2);
		Obj.each(link2, (his_cell, my_cell) => {
			this.app.linkManager.initLink(child_id, '../' + his_cell, my_cell);
		})
	}
}

Hash.prototype.getChild = function(link_as){
	return this.app.getGrid(this.linked_hashes_provider.pool[link_as]);
} 

Hash.prototype.linkChild = function(type, link_as, free_vals){
	if(this.linked_hashes_provider.isLinked(link_as)){
		var pb = this.getChild(link_as).parsed_pb_name;
		if(pb === type){
			this.getChild(link_as).set(free_vals);
			return this.linked_hashes_provider.pool[link_as];
		} else {
			this.unlinkChild(link_as);
		}
	}
	var id = this.linked_hashes_provider.create(this, type, link_as, free_vals);
	this.linked_hashes_provider.initChild(link_as);
	return id;
}

Hash.prototype.cellExists = function(cellname){
	return this.cell_types[cellname] !== undefined;
}

Hash.prototype.unlinkChild = function(link_as){
	this.linked_hashes_provider.unlinkChildCells(link_as);
}

Hash.prototype.doRecursive = function(func, cell, skip, parent_cell, already_counted_cells = {}, run_async){
	var cb = this.doRecursive.bind(this, func);
	if(!skip) {
		//console.log('--Computing cell', this.cell_type(cell));
		func(cell, parent_cell);
		already_counted_cells[cell] = true;
	} else {
		//throw new Error('Skipping!', arguments);
	}
	if(this.cell_has_type(cell, 'async') && !run_async) {
		//console.log('Skipping counting children of async');
		return;
	}
	Obj.eachKey(this.cell_children(cell), (child_cell_name) => {
		if(!already_counted_cells[child_cell_name]){
			already_counted_cells[child_cell_name] = true,
			this.doRecursive(func, child_cell_name, false, cell, Object.create(already_counted_cells));
		} else {
			//console.error('Circular dependency found!', child_cell_name, already_counted_cells, this);
		}
	});
}


Hash.prototype.compute = function(cell, parent_cell_name){
	var real_cell_name = this.real_cell_name(cell);
	var val;
	var props = this.cell_type_props(cell);
	var parents = this.cell_parents(real_cell_name);
	var dynamic = parents.indexOf(parent_cell_name) == -1;
	var func = this.cell_func(real_cell_name);
	var arg_num = this.cell_arg_num(real_cell_name);
	if(props.dynamic && dynamic){
		var real_props = this.dynamic_cells_props[cell];
		func = real_props.func;
		parents = real_props.parents;
		props = {dynamic: true};
		arg_num = parents.length;
		//console.log('computing dynamic cell val', parents);
	}
	// getting func
	if(props.hasOwnProperty('map') && props.map){
		if(!parent_cell_name){
			throw new Error('Cannot calculate map cell value - no parent cell name provided!');
		}
		if(func[parent_cell_name] === undefined){
			throw new Error('Cannot compute MAP cell: parent cell func undefined or not function!');
		}
		func = func[parent_cell_name];
	} else if(props.closure){
		if(!this.cell_funcs[real_cell_name]){
			var new_func = func();
			//console.log('Setting closure function', new_func);
			this.cell_funcs[real_cell_name] = new_func;
		}
		func = this.cell_funcs[real_cell_name];
	}
	// getting arguments
	var args;
	switch(arg_num){
		case 1:
			args = [this.cell_value(Parser.get_real_cell_name(parents[0]))];
		break;
		case 2:
			args = [
				this.cell_value(Parser.get_real_cell_name(parents[0])),
				this.cell_value(Parser.get_real_cell_name(parents[1]))
			];
		break;
		case 3:
			args = [
				this.cell_value(Parser.get_real_cell_name(parents[0])),
				this.cell_value(Parser.get_real_cell_name(parents[1])),
				this.cell_value(Parser.get_real_cell_name(parents[2]))
			];
		break;
		case 4:
			args = [
				this.cell_value(Parser.get_real_cell_name(parents[0])),
				this.cell_value(Parser.get_real_cell_name(parents[1])),
				this.cell_value(Parser.get_real_cell_name(parents[2])),
				this.cell_value(Parser.get_real_cell_name(parents[3]))
			];
		break;
		default:
			var args = this.cell_parents(real_cell_name).map((parent_cell_name) => {
				return this.cell_value(Parser.get_real_cell_name(parent_cell_name))
			});
		break;
	}
	if(props.funnel){
		if(!parent_cell_name){
			throw new Error('Cannot calculate map cell value - no parent cell name provided!');
		}
		parent_cell_name = Parser.get_real_cell_name(parent_cell_name);
		args = [parent_cell_name, this.cell_value(parent_cell_name)];
	}
	if(props.nested){
		args.unshift((cell, val) => {
			var cell_to_update = real_cell_name + '.' + cell;
			this.set_cell_value(cell_to_update, val);
			this.doRecursive(this.compute.bind(this), cell_to_update, true);
		});
	} else if(props.async){
		args.unshift((val) => {
			//console.log('ASYNC callback called!',val); 
			this.set_cell_value(real_cell_name, val);
			this.doRecursive(this.compute.bind(this), real_cell_name, true, null, {}, true);
			this.changesFinished();
		});
	}
	/*for(var n of args){
		if(n === Firera.undef){
			//console.log('UNDEF FOUND!', cell);
			return;
		}
	}*/
	// counting value
	if(props.hasOwnProperty('map') && props.map){
		var val = func instanceof Function 
					  ? func(this.cell_value(Parser.get_real_cell_name(parent_cell_name)))
					  : func;
	} else {
		var val;
		switch(args.num){
			case 1:
				val = func(args[0]);
			break;
			case 2:
				val = func(args[0], args[1]);
			break;
			case 3:
				val = func(args[0], args[1], args[2]);
			break;
			default: 
				val = func.apply(null, args);
			break;
		}
	}
	if(
		val === Firera.noop
		||
		(
			val === this.cell_value(real_cell_name)
			&&
			this.isValue(real_cell_name)
		)
	){
		return Firera.noop;
	}
	if(this.isSignal(real_cell_name)){
		if(!val){
			return Firera.noop;
		} else {
			val = true;
		}
	}
	if(props.async || props.nested){
		
	} else if(props.dynamic && !dynamic) {
		var fs = Parser.parse_arr_funcstring(val, cell, {plain_base:{}}, this.app.packagePool);
		Parser.parse_cell_type(cell, fs, this.dynamic_cells_props, []);
		parents = this.dynamic_cells_props[cell].parents;
		for(let parent_cell of parents){
			this.linked_hashes_provider.linkAnyTwoCells(parent_cell, cell);
		}
		this.setLevel(cell, parents.concat(this.cell_parents(real_cell_name)));
		this.compute(cell);
	} else {
		this.set_cell_value(real_cell_name, val);
	}
}

Hash.prototype.get = function(cell, child){
	if(child){
		// setting value for some linked child hash
		//log('Trying to set', child, cell, val);
		var path = child.split('/');
		var childname = path[0];
		var child = this.linked_hashes_provider.get(childname);
		if(!child){
			console.warn('Cannot get - no such path', path);
			return;
		}
		var child_path = path[1] ? path.slice(1).join('/') : undefined;
		return child.get(cell, child_path);
	} else {
		var val = this.cell_values[cell];
		return val === undefined ? (this.cell_values.hasOwnProperty(cell) ? val : Firera.undef) : val;
	}
}

Hash.prototype.setLevel = function(cell, parents){
	//console.log('got parents', parents);
	var max_level = 0;
	for(let prnt of parents){
		var lvl = this.levels[prnt];
		if(lvl > max_level){
			max_level = lvl;
		}
	}
	this.levels[cell] = max_level + 1;
	//console.log('got max level', max_level);
}

Hash.prototype.updateTree = function(cells, no_args = false, compute = false){
	var set = Object.keys(cells);
	var start_level = Number.POSITIVE_INFINITY;
	var levels = {};
	for(let cell in cells){
		if(compute){
			this.compute(cell);
		}
		if(!no_args){
			var val1 = compute ? this.cell_values[cell] : cells[cell];
			this.set_cell_value(cell, val1);
		}
		var lvl = this.levels[cell];
		if(lvl < start_level){
			start_level = this.levels[cell];
		}
		if(!levels[lvl]){
			levels[lvl] = new Set();
		}
		levels[lvl].add(cell);
	}
	var already = new Set();
	var x = start_level;
	var parents = {};
	while(levels[x] !== undefined){
		for(let cell of levels[x]){
			var skip = false;
			var needed_lvl = x+1;
			var children = this.cell_children(cell);
			var ct = this.cell_type(cell);
			if(
				!this.cell_has_type(cell, 'free')
				&& (cells[cell] === undefined || no_args)
				&& this.cell_types[cell].func
			){
				var res = this.compute(cell, parents[cell]);
				if(res === Firera.noop){
					skip = true;
				}
			}
			if(this.cell_has_type(cell, 'async') || skip) {
				continue;
			}
			for(var child in children){
				var lvl = this.levels[child];
				if(!levels[lvl]){
					levels[lvl] = new Set();
				}
				if(!cells[child]){
					levels[lvl].add(child);
				}
				parents[child] = cell;
				for(var j = lvl - 1; j > x; j--){
					if(!levels[j]){
						levels[j] = new Set();
					}
				}
				if(already.has(child)){
					console.log('skipping2', child);
					//continue;
				}
			}
		}
		x++;
	}
}

Hash.prototype.set = function(cells, val, child, no_args){
	if(child){
		// setting value for some linked child hash
		var path = child.split('/');
		var childname = path[0];
		var child = this.linked_hashes_provider.get(childname);
		if(!child){
			console.warn('Cannot set - no such path', path);
			return;
		}
		var child_path = path[1] ? path.slice(1).join('/') : undefined;
		child.set(cells, val, child_path);
		return;
	}
	if(!(cells instanceof Object)){
		var a = {};
		a[cells] = val;
		cells = a;
	}
	this.updateTree(cells, no_args);
} 

Hash.prototype.set2 = function(cell, val, child){
	if(child){
		// setting value for some linked child hash
		//log('Trying to set', child, cell, val);
		var path = child.split('/');
		var childname = path[0];
		var child = this.linked_hashes_provider.get(childname);
		if(!child){
			console.warn('Cannot set - no such path', path);
			return;
		}
		var child_path = path[1] ? path.slice(1).join('/') : undefined;
		child.set(cell, val, child_path);
		return;
	}
	if(cell instanceof Object){
		// batch update
		//console.log('Computing batch update', cell);
		cell.eachKey(
			(key) => {
				this.force_set(key, cell[key], true);
				this.doRecursive((cell) => {
					this.dirtyCounter[cell] 
						? this.dirtyCounter[cell]++ 
						: (this.dirtyCounter[cell] = 1);
				}, key)
			}
		);
		//console.log('dirty counter', this.dirtyCounter);
		cell.eachKey(this.doRecursive.bind(this, (cell2, parent_cell_name) => {
			if(--this.dirtyCounter[cell2] === 0 && cell[cell2] === undefined){
				//console.log('Computing after batch change', cell2, cell);
				this.compute(cell2, parent_cell_name);
			//} else {
				//console.log('Cell ', cell2, 'is not ready', this.dirtyCounter[cell2]);
			}
		}));
	} else {
		//console.log('SETT', arguments);
		//console.log('Setting cell value', cell, val);
		if(!this.cell_type(cell) === 'free'){
			throw Exception('Cannot set dependent cell!');
		}
		this.force_set(cell, val);
		//this.doRecursive(this.compute.bind(this), cell);
		//console.log('Cell values after set', this.cell_values);
	}
}
Hash.prototype.force_set = function(cell, val, omit_updating_children){
	this.set_cell_value(cell, val);
	if(omit_updating_children) return;
	Obj.eachKey(this.cell_children(cell), (child_cell_name) => {
		this.doRecursive(this.compute.bind(this), child_cell_name, false, cell);
	});
}
Hash.prototype.cell_parents = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].parents : [];
}
Hash.prototype.cell_arg_num = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].arg_num : 0;
}
Hash.prototype.cell_children = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].children : {};
}
Hash.prototype.all_cell_children = function(cell, arr){
	if(!this.cell_types[cell]){
		return [];
	}
	arr = arr || [];
	Obj.eachKey(this.cell_types[cell].children, (cl) => {
		arr.push(cl);
		this.all_cell_children(cl, arr);
	});
	return arr;
}
Hash.prototype.cell_func = function(cell){
	var a;
	if(a = this.cell_types[cell].func) {
		return a;
	} else {
		throw new Error('Cannot find cell func for cell '+cell);
	}
}
Hash.prototype.cell_type = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].type : [];
}
Hash.prototype.cell_has_type = function(cell, type){
	var types = this.cell_types[cell];
	if(types){
		return types.props[type];
	} else {
		return false;
	}
}
Hash.prototype.cell_type_props = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].props : {};
}
Hash.prototype.isValue = function(real_cell_name){
	return this.cell_types[real_cell_name].additional_type === '=';
}
Hash.prototype.isSignal = function(real_cell_name){
	return this.cell_types[real_cell_name].additional_type === '~';
}
Hash.prototype.real_cell_name = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].real_cell_name : {};
}
Hash.prototype.cell_value = function(cell){
	switch(cell){
		case '$real_keys':
			return [...(new Set(Object.keys(this.plain_base).concat(Object.keys(this.plain_base.$init))))].filter((k) => {
				return k.match(/^(\w|\d|\_|\-)*$/);
			})
		break;
		case '$real_values':
			var res = {};
			Obj.each([...(new Set(Object.keys(this.cell_values)
						.concat(Object.keys(this.init_values))))].filter((k) => {
				return k.match(/^(\w|\d|\_|\-)*$/);
			}), (k, v) => {
				res[k] = this.cell_value(k);
			})
			return res;
		break;
		case '$path':
			return this.path;
		break;
		case '$app_id':
			return this.app.id;
		break;
		case '$name':
			return this.name;
		break;
		default:
			if(this.cell_values.hasOwnProperty(cell)){
				return this.cell_values[cell];
			} else {
				return Firera.undef;
				//return this.cell_values[cell];
			}
	}
}
Hash.prototype.set_cell_value = function(cell, val){
	var same_song = val === this.cell_values[cell];
	this.cell_values[cell] = val;
	if(this.side_effects[cell]){	
		if(!Parser.side_effects[this.side_effects[cell]]) console.info('I SHOULD SET side-effect', cell, this.side_effects[cell], Parser.side_effects);
		Parser.side_effects[this.side_effects[cell]].func.call(this, cell, val);
		//console.log('Child', real_cell_name, 'val is', val);
	}
	//if(cell === 'text' || cell === '*') console.log('Set cell value', cell, val, this.dynamic_cell_links[cell]);
	var omit_list = this.all_cell_children('*');
	if(this.cell_types['*'] && cell !== '*' && omit_list.indexOf(cell) === -1){
		this.set('*', [cell, val]);
	}
	if(this.dynamic_cell_links[cell]){
		Obj.each(this.dynamic_cell_links[cell], (links, hash_name) => {
			var own = hash_name === '__self';
			var hsh = own ? this : this.linked_hashes_provider.get(hash_name);
			//console.log('Updating dynamic cell links for cell', cell, links, hash_name, this.linked_hashes_provider, hsh);
			if(hsh){
				for(var link of links){
					//console.log('Writing dynamic cell link ' + link.cell_name, link.type === 'val', this.name);
					if(link.type === 'val'){
						hsh.set(link.cell_name, val);
					} else if(link.type === 'dynamic'){
						hsh.compute(link.cell_name, cell);
					} else {
						//log('Updating links', hash_name, link.cell_name, [hash_name !== '__self' ? this.name : cell, val]);
						hsh.set(link.cell_name, [own ? cell : this.name, val]);
					}
				}
			}
		})
	}
	this.app.linkManager.checkUpdate(this.id, cell, val);
}

module.exports = Hash;