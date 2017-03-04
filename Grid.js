import Parser from './Parser';
import utils from './utils';
const Obj = utils.Obj;
const Arr = utils.Arr;

const unusual_cell = (cellname) => {
	return !(cellname.match(/^([a-zA-Z0-9\_]*)$/));
}

const create_provider = (app, self) => {
	return {
		pool: {},
		create(self, type, link_as, free_vals) {
			const child_id = self.app.createGrid(type, link_as, free_vals, self.id);
			utils.init_if_empty(self, 'linked_grids', {}, link_as, child_id);
			this.set(link_as, child_id);
			this.get(link_as).linked_grids_provider.set('..', self.id);
			app.linkManager.onNewGridAdded(self.id, child_id);
			return child_id;
		},
		set(name, grid_id) {
			this.pool[name] = grid_id;
		},
		isLinked(name) {
			return !!this.get(name);
		},
		get(name) {
			const id = this.pool[name];
			return id ? app.grids[id] : false;
		},
		eachChild(cb) {
			for(let child in this.pool){
				if(child === '..') continue;
				cb(this.pool[child], child);
			}
		},
		remove(name) {
			const id = this.pool[name];
			delete this.pool[name];
			self.app.grids[id].set('$remove', true);
			delete self.app.grids[id];
		},
		setCellValues(childName, values, skipsame) {
			this.get(childName).set(values, false, false, false, skipsame);
		},
		initChild(name) {
			if(!this.get(name).init){
				console.log('strange', this, name);
			}
			this.get(name).init();
		},
		unlinkChildCells(name) {
			const hsh = this.get(name);
			if(!hsh){
				utils.warn('removing unexisting grid!', name);
				return;
			}
			this.remove(name);
		},
		getLinkedGridCellValue(gridname, cellname) {
			const grid = this.get(gridname);
			return grid ? grid.cell_value(cellname) : false;
		},
		linkAnyTwoCells(slave, master) {
			if(slave.indexOf('/') !== -1){
				app.linkManager.initLink(self.id, slave);
			} else {
				add_dynamic_link(self.dynamic_cell_links, slave, '__self', master, 'dynamic');
			}
		},
	}
}

const add_dynamic_link = (pool, cell, grid, slave_cell, type) => {
	utils.init_if_empty(pool, cell, {}, grid, []);
	const links = pool[cell][grid];
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

const Grid = function(app, parsed_pb_name, name, free_vals, init_later, parent_id, path){
	const self = this;
	const id = ++app.gridIds;
	//////////////////////////
	//bm.start('init', '2', id);
	this.path = path;
	app.setGrid(id, this);
	this.id = id;
	this.parent = parent_id;
	this.app = app;
	this.name = name || '__root';
	var parsed_pb;
	this.parsed_pb_name = parsed_pb_name;
	if(typeof parsed_pb_name === 'string'){
		parsed_pb = app.cbs[parsed_pb_name];
	} else {
		const key = '$$$_@@@_tag';
		if(parsed_pb_name[key]){
			parsed_pb = parsed_pb_name[key];
		} else {
			parsed_pb = app.parse_cbs(parsed_pb_name);
			parsed_pb_name[key] = parsed_pb;
		}
	}
	if(!parsed_pb){
		utils.error('Cannot find grid to parse:', parsed_pb_name);
		return;
	}
	this.cell_types = parsed_pb.cell_types;
	this.side_effects = parsed_pb.side_effects;
	this.grids_to_link = parsed_pb.grids_to_link;
	this.plain_base = Object.create(parsed_pb.plain_base);
	this.link_chains = Object.create(parsed_pb.link_chains || {});
	this.levels = Object.create(parsed_pb.levels);
	//this.setLevels();
	this.linked_grids_provider = create_provider(app, self);
	this.linked_grids = {};
	// for "closure" cell type
	this.cell_funcs = {};
	this.dirtyCounter = {};
	this.dynamic_cell_links = {};
	this.dynamic_cells_props = {};
	this.cell_values = Object.assign({}, this.plain_base.$init || {});
	this.init_values = Object.assign({}, this.plain_base.$init, free_vals || {});
	this.asterisk_omit_list = this.all_cell_children('*');
	Obj.each(this.grids_to_link, (grid_name, link_as) => this.linkChild(grid_name, link_as));
	// @todo: refactor, make this set in one step

	if(this.plain_base.$init && !init_later){
		this.init();
	} else {
		if(this.init_values){
			for(let cell in this.init_values){
				//this.cell_values[cell] = this.init_values[cell];
			}
		}
	}
	if(parsed_pb.no_args_cells){
		//this.set(parsed_pb.no_args_cells);
		this.updateTree(parsed_pb.no_args_cells, false, true);
	}
	if(this.link_chains){
		for(let link in this.link_chains){
			this.initLinkChain(link);
		}
	}
}

Grid.prototype.changesFinished = function(){
	this.app._changeFinished();
}

Grid.prototype.initIfSideEffectCell = function(cell){
	if(!this.cellExists(cell) && unusual_cell(cell)){
		Parser.parse_cellname(cell, this, 'getter', this.app.packagePool, this);
		this.cell_types = Parser.parse_cell_types(this.plain_base);
		const matched = Parser.findMatcher(cell, this.app.packagePool);
		if(matched){
			this.compute(cell);
		}
		// update levels for this new cell
		if(this.cell_types[cell]){
			var max_level = 0;
			for(let parent of this.cell_types[cell].parents){
				if(this.levels[parent] > max_level){
					max_level = this.levels[parent];
				}
			}
			this.levels[cell] = max_level + 1;
		}
	}
}

Grid.prototype.hasChild = function(name){
	return this.linked_grids && this.linked_grids[name];
} 

Grid.prototype.init = function(){
	for(let cell in this.init_values){
		Parser.parse_cellname(cell, this, 'setter', this.app.packagePool);
	}
	this.set(this.init_values);
}
Grid.prototype.updateChildFreeValues = function(childName, values, skipsame){
	this.linked_grids_provider.setCellValues(childName, values, skipsame);
}

Grid.prototype.initLinkChain = function(link){
	this.app.linkManager.initLink(this.id, link);
}

Grid.prototype.linkGrid = function(cellname, val){
	++this.app.grid_create_counter;
	//log('RUNNING SIDE EFFECT', this, val); 
	var grid, link1, link2, free_vals;
	cellname = cellname.replace("$child_", "");
	if(val instanceof Array){
		// it's grid and link
		grid = val[0];
		link1 = val[1];
		link2 = val[2];
		free_vals = val[3] || {};
	} else {
		grid = val;
	}
	if(!grid){
		utils.warn('Trying to link undefined grid:', grid);
		return;
	}
	const child_id = this.linkChild(grid, cellname, free_vals);
	if(!child_id) return;
	if(link1){
		//console.info('Linking by link1 grid', link1);
		Obj.each(link1, (his_cell, my_cell) => {
			this.app.linkManager.initLink(this.id, cellname + '/' + his_cell, my_cell);
		})
	}
	if(link2){
		//console.info('Linking by link2 grid', link2);
		Obj.each(link2, (his_cell, my_cell) => {
			this.app.linkManager.initLink(child_id, '../' + his_cell, my_cell);
		})
	}
	--this.app.grid_create_counter;
	//console.log('grid created', this.app.getGrid(child_id).path);
	if(this.app.grid_create_counter === 0){
		this.app.branchCreated(child_id);
	}
}

Grid.prototype.getChild = function(link_as){
	return this.app.getGrid(this.linked_grids_provider.pool[link_as]);
} 

Grid.prototype.linkChild = function(type, link_as, free_vals){
	if(this.linked_grids_provider.isLinked(link_as)){
		const pb = this.getChild(link_as).parsed_pb_name;
		if(pb === type){
			const chld = this.getChild(link_as);
			if(free_vals){
				chld.set(free_vals);
			}
			return this.linked_grids_provider.pool[link_as];
		} else {
			this.unlinkChild(link_as);
		}
	}
	const id = this.linked_grids_provider.create(this, type, link_as, free_vals);
	if(!this.app.grids[id]){
		return false;
	}
	this.linked_grids_provider.initChild(link_as);
	return id;
}

Grid.prototype.unlinkChild = function(link_as){
	this.linked_grids_provider.unlinkChildCells(link_as);
}
Grid.prototype.getChildrenValues = function(){
	const res = [];
	this.linked_grids_provider.eachChild((child, key) => {
		res[key] = this.app.getGrid(child).cell_values;
	})
	return res;
}

Grid.prototype.doRecursive = function(func, cell, skip, parent_cell, already_counted_cells = {}, run_async){
	const cb = this.doRecursive.bind(this, func);
	if(!skip) {
		//console.log('--Computing cell', this.cell_type(cell));
		var zzz = func(cell, parent_cell);
		already_counted_cells[cell] = true;
		if(zzz === Firera.skip){
			return;
		}
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


Grid.prototype.compute = function(cell, parent_cell_name){
	const real_cell_name = this.real_cell_name(cell);
	var val;
	var props = this.cell_type_props(cell);
	var parents = this.cell_parents(real_cell_name);
	const dynamic = parents.indexOf(parent_cell_name) == -1;
	var func = this.cell_func(real_cell_name);
	var arg_num = this.cell_arg_num(real_cell_name);
	if(props.dynamic && dynamic){
		const real_props = this.dynamic_cells_props[cell];
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
			var new_func = func(this.cell_values[real_cell_name]);
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
			args = this.cell_parents(real_cell_name).map((parent_cell_name) => {
				return this.cell_value(Parser.get_real_cell_name(parent_cell_name))
			});
		break;
	}
	if(props.funnel){
		if(!parent_cell_name){
			utils.warn('Cannot calculate map cell value - no parent cell name provided!');
			return;
		}
		parent_cell_name = Parser.get_real_cell_name(parent_cell_name);
		args = [parent_cell_name, this.cell_value(parent_cell_name)];
	}
	if(props.nested){
		args.unshift((cell, val) => {
			const cell_to_update = real_cell_name + '.' + cell;
			this.set_cell_value(cell_to_update, val);
			this.doRecursive(this.compute.bind(this), cell_to_update, true);
		});
	} else if(props.async){
		args.unshift((val) => {
			//console.log('ASYNC callback called!',val); 
			this.app.startChange();
			this.set_cell_value(real_cell_name, val);
			this.doRecursive(this.compute.bind(this), real_cell_name, true, null, {}, true);
			this.changesFinished();
			this.app.endChange();
		});
	}
	/*for(let n of args){
		if(n === Firera.undef){
			//console.log('UNDEF FOUND!', cell);
			return;
		}
	}*/
	// counting value
	var val;
	if(props.hasOwnProperty('map') && props.map){
		val = func instanceof Function 
					  ? func(this.cell_value(Parser.get_real_cell_name(parent_cell_name)))
					  : func;
	} else {
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
		val === Firera.skip
		||
		(
			val === this.cell_value(real_cell_name)
			&&
			this.isValue(real_cell_name)
		)
	){
		return Firera.skip;
	}
	if(this.isSignal(real_cell_name)){
		if(!val){
			return Firera.skip;
		} else {
			val = true;
		}
	}
	if(props.async || props.nested){
		
	} else if(props.dynamic && !dynamic) {
		const fs = Parser.parse_arr_funcstring(val, cell, {plain_base:{}}, this.app.packagePool);
		Parser.parse_cell_type(cell, fs, this.dynamic_cells_props, []);
		parents = this.dynamic_cells_props[cell].parents;
		for(let parent_cell of parents){
			this.linked_grids_provider.linkAnyTwoCells(parent_cell, cell);
		}
		this.setLevel(cell, parents.concat(this.cell_parents(real_cell_name)));
		this.compute(cell);
	} else {
		this.set_cell_value(real_cell_name, val);
	}
}

Grid.prototype.get = function(cell, child){
	if(child){
		// setting value for some linked child grid
		//log('Trying to set', child, cell, val);
		const path = child.split('/');
		const childname = path[0];
		child = this.linked_grids_provider.get(childname);
		if(!child){
			utils.warn('Cannot get - no such path', path);
			return Firera.undef;
		}
		const child_path = path[1] ? path.slice(1).join('/') : undefined;
		return child.get(cell, child_path);
	} else {
		const val = this.cell_values[cell];
		return val === undefined ? (this.cell_values.hasOwnProperty(cell) ? val : Firera.undef) : val;
	}
}

Grid.prototype.setLevel = function(cell, parents){
	//console.log('got parents', parents);
	var max_level = 0;
	for(let prnt of parents){
		const lvl = this.levels[prnt];
		if(lvl > max_level){
			max_level = lvl;
		}
	}
	this.levels[cell] = max_level + 1;
	//console.log('got max level', max_level);
}

Grid.prototype.updateTree = function(cells, no_args = false, compute = false){
	const set = Object.keys(cells);
	var start_level = Number.POSITIVE_INFINITY;
	const levels = {};
	for(let cell in cells){
		if(compute){
			this.compute(cell);
		}
		if(!no_args){
			const val1 = compute ? this.cell_values[cell] : cells[cell];
			this.set_cell_value(cell, val1);
		}
		const lvl = this.levels[cell];
		if(lvl < start_level){
			start_level = this.levels[cell];
		}
		if(!levels[lvl]){
			levels[lvl] = new Set();
		}
		levels[lvl].add(cell);
	}
	const already = new Set();
	var x = start_level;
	const parents = {};
	while(levels[x] !== undefined){
		for(let cell of levels[x]){
			var skip = false;
			var needed_lvl = x+1;
			var children = this.cell_children(cell);
			const ct = this.cell_type(cell);
			if(
				!this.cell_has_type(cell, 'free')
				&& (cells[cell] === undefined || no_args)
				&& this.cell_types[cell].func
			){
				const res = this.compute(cell, parents[cell]);
				if(res === Firera.skip){
					skip = true;
				}
			}
			if(this.cell_has_type(cell, 'async') || skip) {
				continue;
			}
			for(let child in children){
				const lvl = this.levels[child];
				if(!levels[lvl]){
					levels[lvl] = new Set();
				}
				if(!cells[child]){
					levels[lvl].add(child);
				}
				parents[child] = cell;
				for(let j = lvl - 1; j > x; j--){
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

Grid.prototype.cellExists = function(cn){
	cn = Parser.get_real_cell_name(cn);
	return this.cell_values.hasOwnProperty(cn) 
			|| (this.cell_types.hasOwnProperty(cn) && this.cell_types[cn].type !== 'fake')
			|| (this.fake_cells.indexOf(cn) !== -1);
} 

Grid.prototype.set = function(cells, val, child, no_args, skipsame){
	if(child){
		// setting value for some linked child grid
		const path = child.split('/');
		const childname = path[0];
		child = this.linked_grids_provider.get(childname);
		if(!child){
			utils.warn('Cannot set - no such path', path);
			return;
		}
		const child_path = path[1] ? path.slice(1).join('/') : undefined;
		child.set(cells, val, child_path);
		return;
	}
	if(!(cells instanceof Object)){
		const a = {};
		a[cells] = val;
		cells = a;
	}
	if(skipsame){
		//console.log('SLI{DAME');
		const res = {};
		for(let cellname in cells){
			if(this.cell_value(cellname) === cells[cellname]){
				// skip
				//console.log('skip', cellname, cells[cellname]);
			} else {
				res[cellname] = cells[cellname];
			}
		}
		cells = res;
	}
	this.updateTree(cells, no_args);
} 

Grid.prototype.set2 = function(cell, val, child){
	if(child){
		// setting value for some linked child grid
		//log('Trying to set', child, cell, val);
		const path = child.split('/');
		const childname = path[0];
		child = this.linked_grids_provider.get(childname);
		if(!child){
			utils.warn('Cannot set - no such path', path);
			return;
		}
		const child_path = path[1] ? path.slice(1).join('/') : undefined;
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
Grid.prototype.force_set = function(cell, val, omit_updating_children){
	this.set_cell_value(cell, val);
	if(omit_updating_children) return;
	Obj.eachKey(this.cell_children(cell), (child_cell_name) => {
		this.doRecursive(this.compute.bind(this), child_cell_name, false, cell);
	});
}
Grid.prototype.cell_parents = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].parents : [];
}
Grid.prototype.cell_arg_num = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].arg_num : 0;
}
Grid.prototype.cell_children = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].children : {};
}
Grid.prototype.all_cell_children = function(cell, arr){
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
Grid.prototype.cell_func = function(cell){
	var a;
	if(a = this.cell_types[cell].func) {
		return a;
	} else {
		throw new Error('Cannot find cell func for cell '+cell);
	}
}
Grid.prototype.cell_type = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].type : [];
}
Grid.prototype.cell_has_type = function(cell, type){
	const types = this.cell_types[cell];
	if(types){
		return types.props[type];
	} else {
		return false;
	}
}
Grid.prototype.cell_type_props = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].props : {};
}
Grid.prototype.isValue = function(real_cell_name){
	return this.cell_types[real_cell_name].additional_type === '=';
}
Grid.prototype.isSignal = function(real_cell_name){
	return this.cell_types[real_cell_name] ? this.cell_types[real_cell_name].additional_type === '~' : false;
}
Grid.prototype.real_cell_name = function(cell){
	return this.cell_types[cell] ? this.cell_types[cell].real_cell_name : {};
}
Grid.prototype.fake_cells = ['$real_keys', '$real_values', '$path', '$app_id', '$name'];
Grid.prototype.cell_value = function(cell){
	switch(cell){
		case '$real_keys':
			return [...(new Set(Object.keys(this.plain_base).concat(Object.keys(this.plain_base.$init))))].filter((k) => {
				return k.match(/^(\w|\d|\_|\-)*$/);
			})
		break;
		case '$real_values':
			const res = {};
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
Grid.prototype.set_cell_value = function(cell, val){
	this.cell_values[cell] = val;
	if(this.app.config.trackChanges 
			&& this.app.changeObj 
			&& (this.asterisk_omit_list.indexOf(cell) === -1) 
			&& (cell !== '*')){
		if((this.app.config.trackChanges instanceof Array)
			&& 
			(this.app.config.trackChanges.indexOf(cell) === -1)){
			return;
		}
		const change = [this.path, cell, val, this.levels[cell]];
		if(this.app.config.trackChangesType === 'log'){
			this.app.changeObj.push(change);
		} 
		if(this.app.config.trackChangesType === 'imm'){
			this.app.logChange(change);
		}
	}
	if(this.side_effects[cell]){	
		if(!Parser.side_effects[this.side_effects[cell]]) console.info('I SHOULD SET side-effect', cell, this.side_effects[cell], Parser.side_effects);
		Parser.side_effects[this.side_effects[cell]].func.call(this, cell, val);
		//console.log('Child', real_cell_name, 'val is', val);
	}
	//if(cell === 'text' || cell === '*') console.log('Set cell value', cell, val, this.dynamic_cell_links[cell]);
	if(this.cell_types['*'] && cell !== '*' && this.asterisk_omit_list.indexOf(cell) === -1){
		this.set('*', [cell, val]);
	}
	if(this.dynamic_cell_links[cell]){
		Obj.each(this.dynamic_cell_links[cell], (links, grid_name) => {
			const own = grid_name === '__self';
			const hsh = own ? this : this.linked_grids_provider.get(grid_name);
			//console.log('Updating dynamic cell links for cell', cell, links, grid_name, this.linked_grids_provider, hsh);
			if(hsh){
				for(let link of links){
					//console.log('Writing dynamic cell link ' + link.cell_name, link.type === 'val', this.name);
					if(link.type === 'val'){
						hsh.set(link.cell_name, val);
					} else if(link.type === 'dynamic'){
						hsh.compute(link.cell_name, cell);
					} else {
						//log('Updating links', grid_name, link.cell_name, [grid_name !== '__self' ? this.name : cell, val]);
						hsh.set(link.cell_name, [own ? cell : this.name, val]);
					}
				}
			}
		})
	}
	this.app.linkManager.checkUpdate(this.id, cell, val);
}

module.exports = Grid;