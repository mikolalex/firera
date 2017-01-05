var utils = require('./utils');
var LinkManager = function(app){
	this.app = app;
	this.links = [];
	this.linkStruct = {};
	this.workingLinks = {};
	this.pointers = {};
	this.doubleAsterisk = {};
	this.pathToId = {};
};

LinkManager.prototype.onNewHashAdded = function(parent_hash_id, child_id){
	var child_path = this.app.getGrid(child_id).path
	//console.log('new hash added to', parent_hash_id, 'as', child_id, child_path);
	// add doubleAsterisk links
	for(let path in this.doubleAsterisk){
		if(child_path.indexOf(path) === 0){
			// it's a child of master hash
			for(var cellname in this.doubleAsterisk[path]){
				this.addWorkingLink(child_id, cellname, this.pathToId[path], '**/' + cellname, '**', child_path);
			}
		}
	}
	//
	for(var link_id in this.pointers[parent_hash_id]){
		this.actualizeLink(link_id, child_id);
	}
}

LinkManager.prototype.refreshPointers = function(link_id){
	for(let hash_id in this.pointers){
		var links = this.pointers[hash_id];
		for(let i in links){
			if(links[i] == link_id){
				links.splice(i, 1);
			}
		}
	}
	var data = this.links[link_id];
	for(let pointer of data.pointers){
		utils.init_if_empty(this.pointers, pointer.hash_id, {}, link_id, data.path[pointer.pos]);
		//log('considering pointer', link_id, data.str, pointer);
	}
}

LinkManager.prototype.checkUpdate = function(master_hash_id, master_cell, val){
	if(this.workingLinks[master_hash_id] && this.workingLinks[master_hash_id][master_cell]){
		if(val === undefined){
			val = this.app.getGrid(master_hash_id).get(master_cell);
		}
		if(val === Firera.undef){
			return;
		}
		var lnks = this.workingLinks[master_hash_id][master_cell];
		for(var slave_hash_id in lnks){
			for(var slave_cellname in lnks[slave_hash_id]){
				var cell_val = val;
				if(lnks[slave_hash_id] && lnks[slave_hash_id][slave_cellname]){
					var link_data = lnks[slave_hash_id][slave_cellname];
					if(link_data.link_id === '**'){
						cell_val = [cell_val, link_data.path];
					} else {
						var data = this.links[link_data.link_id];
						if(data){
							for(var i = data.path.length - 1; i > -1; i--){
								if(data.path[i] === '*'){
									//console.log('A', i, data.path, link_data.path[i+1]);
									cell_val = [link_data.path[i+1], cell_val];
								}
							}
						}
					}
				}
				// the very meaning of this method
				var slave_grid = this.app.getGrid(slave_hash_id);
				if(!slave_grid){
					var lnk = this.links[link_data.link_id];
					//log('obsolete link!', lnk);
				} else {
					//log('!set', slave_cellname, cell_val);
					slave_grid.set(slave_cellname, cell_val);
				}
			}
		}
	}
	
	
}

LinkManager.prototype.addWorkingLink = function(master_hash_id, master_cellname, slave_hash_id, slave_cellname, link_id, path){
	utils.init_if_empty(this.workingLinks, master_hash_id, {}, master_cellname, {}, slave_hash_id, {}, slave_cellname, {link_id, path});
	//this.app.getGrid(slave_hash_id).set(slave_cellname, val);
	this.app.getGrid(master_hash_id).initIfSideEffectCell(master_cellname);
	this.checkUpdate(master_hash_id, master_cellname);
}

LinkManager.prototype.actualizeLink = function(link_id, first_child_id){
	var gridname, current_pointer;
	var data = this.links[link_id];
	var curr_hash_id = data.hash_id, curr_hash;
	
	var move_further = (curr_hash_id, i, start_pos, path) => {
		if(!path) debugger;
		path = path.slice();
		var curr_hash = this.app.getGrid(curr_hash_id);
		if(path.indexOf(curr_hash.name) !== -1){
			//console.log('hm', path, curr_hash.name);
		} else {
			path.push(curr_hash.name);
		}
		var gridname = data.path[i];
		var next_hash_id;
		if(!data.path[i + 1]){
			//log('~~~ success!', data.str, path);
			// its cellname
			if(!data.pointers[start_pos].fixed){
				data.pointers.splice(start_pos, 1);
			}
			this.addWorkingLink(curr_hash_id, gridname, data.hash_id, data.slave_cellname, link_id, path);
			return;
		}

		if(gridname === '..'){
			// looking for parent
			next_hash_id = curr_hash.parent;
		} else if(gridname === '*'){
			// all children
			if(i === current_pointer.pos){
				if(first_child_id !== undefined) {
					//log('--- checking first child', data.str, link_id, first_child_id);
					move_further(first_child_id, i+1, start_pos, path);
				} else {
					data.pointers[start_pos].fixed = true;
					data.pointers[start_pos].hash_id = curr_hash_id;
					//log('--- what to do then?', link_id, 1, curr_hash.linked_hashes);
					for(var child_name in curr_hash.linked_hashes){
						var child_id = curr_hash.linked_hashes[child_name];
						move_further(child_id, i+1, start_pos, path);
					}
				}
			} else {
				//log('--- remove old pointer', link_id, data.str, i, data.pointers[start_pos].fixed);
				// remove old pointer
				if(!data.pointers[start_pos].fixed){
					data.pointers.splice(start_pos, 1);
				}
				data.pointers.push({
					pos: i,
					hash_id: curr_hash_id,
					fixed: true,
					path
				})
				for(var child_name in curr_hash.linked_hashes){
					var child_id = curr_hash.linked_hashes[child_name];
					move_further(child_id, i+1, start_pos, path);
				}
				return;
			}
		} else {
			if(curr_hash.linked_hashes && (curr_hash.linked_hashes[gridname] !== undefined)){
				next_hash_id = curr_hash.linked_hashes[gridname];
			} else {
				//console.log('_____________ NOT FOUND');
				return;
			}
		}
		if(next_hash_id !== undefined){
			move_further(next_hash_id, i+1, start_pos, path);
		}
	}
	
	for(var pointer_index in data.pointers){
		var current_pointer = data.pointers[pointer_index];
		move_further(
				current_pointer.hash_id, 
				current_pointer.pos, 
				pointer_index, 
				current_pointer.path
		);
	}
	this.refreshPointers(link_id);
}

LinkManager.prototype.initLink = function(hash_id, link, slave_cellname){
	var path = link.split('/');
	if(path.length == 2 && path[0] === '..'){
		/*var curr_hash = this.app.getGrid(hash_id);
		var parent = curr_hash.parent;
		if(parent === undefined) {
			console.log('parent undefined! child', curr_hash);
			return;
		}
		this.addWorkingLink(parent, path[1], curr_hash.id, link);
		//console.log('Simple!', link, parent);
		//ttimer.stop('ilc');
		return;*/
	}
	if(path[0] == '**'){
		if(path.length > 2){
			console.error('You cannot listen to such path', path.join('/'));
			return;
		}
		var cellname = path[1];
		var grid_path = this.app.getGrid(hash_id).path;
		this.pathToId[grid_path] = hash_id;
		utils.init_if_empty(this.doubleAsterisk, grid_path, {}, cellname, true);
		// check already added grids
		this.app.eachChild(hash_id, (child) => {
			this.addWorkingLink(child.id, cellname, hash_id, '**/' + cellname, '**', child.path);
		})
		return;
	}
	if(path[0] == '^^'){
		if(path.length > 2){
			console.error('You cannot listen to such path', path.join('/'));
			return;
		}
		var cellname = path[1];
		this.app.eachParent(hash_id, (hash) => {
			this.addWorkingLink(hash.id, cellname, hash_id, '^^/' + cellname);
		})
		return;
	}
	if(path[0] == ''){
		if(path.length > 2){
			console.error('You cannot listen to such path', path.join('/'));
			return;
		}
		var cellname = path[1];
		var grid_path = this.app.getGrid(hash_id).path;
		this.addWorkingLink(this.app.hashes[1].id, cellname, hash_id, '/' + cellname);
		return;
	}
	var obj = {
		path: path,
		target: path[path.length - 1],
		pointers: [{
			pos: 0,
			path: [],
			hash_id,
			fixed: false,
		}],
		str: link,
		slave_cellname: slave_cellname || link,
		hash_id: hash_id,
		status: null,
	};
	utils.init_if_empty(this.linkStruct, hash_id, {});
	if(this.linkStruct[hash_id][link] == undefined){
		var link_id = this.links.push(obj) - 1;
		this.linkStruct[hash_id][link] = link_id;
		this.actualizeLink(link_id);
	} else {
		this.actualizeLink(this.linkStruct[hash_id][link]);
	}
	//ttimer.stop('ilc');
}

module.exports = LinkManager;