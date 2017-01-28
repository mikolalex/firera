
var rendered = {};
var templates = {};
var utils = require('../utils');
var $ = require('jquery');

var parse_rec = (app, grid_id, cell) => {
	var grid = app.getGrid(grid_id);
	var res = {
		val: grid.cell_values[cell],
		grid_id,
		children: {},
	};
	for(let gridname in grid.linked_grids){
			var gr_id = grid.linked_grids[gridname];
			res.children[gridname] = parse_rec(app, gr_id, cell);
	}
	return res;

}
var render_rec = (app, struct) => {
	var grid = app.getGrid(struct.grid_id);
	utils.init_if_empty(rendered, app.id, {}, grid.id, true);
	if(struct.val){
		var context = Object.create(grid.cell_values);
		for(let key in struct.children){
				context[key] = render_rec(app, struct.children[key])
		}
		utils.init_if_empty(templates, app.id, {});
		templates[app.id][grid.path] = struct.tmpl = new Firera.Ozenfant(struct.val);
		return struct.tmpl.getHTML(context);
	} else {
		var res = [];
		for(let key in struct.children){
				res.push(render_rec(app, struct.children[key]));
		}
		return res.join('');
	}
}
var set_bindings_rec = (app, struct, el) => {
	if(!struct) debugger;
	var grid = app.getGrid(struct.grid_id);
	if(struct.tmpl){
		grid.set('$el', $(el));
		struct.tmpl.setRoot(el).updateBindings();
		for(let key in struct.children){
			let el = struct.tmpl.bindings[key];
			set_bindings_rec(app, struct.children[key], el);
		}
	} else {
		for(let key in el.children){
			if(el.children.hasOwnProperty(key)){
				set_bindings_rec(app, struct.children[key], el.children[key]);
			}
		}
	}
}
var render = function(app, start, node){
		var struct = parse_rec(app, start.id, '$template');
		var html = render_rec(app, struct);
		if(!node) debugger; 
		node.innerHTML = html;
		set_bindings_rec(app, struct, node);
		//console.log('html', html);
}

var get_parent_grid = (app, grid_id) => {
	return app.getGrid(app.getGrid(grid_id).parent);
}

var get_template = (app, path) => {
	return templates[app.id][path];
}

var get_binding = (template, name) => {
	return template.bindings[name];
}

module.exports = {
	onBranchCreated: (app, grid_id, path, parent) => {
		console.log('branch created', path);
		var self = app.getGrid(grid_id);
		if(!parent){
			var node = self.cell_values.$el.get()[0];
			render(app, self, node);
		}
		if(rendered[app.id] && rendered[app.id][parent]){
			var parent_path = app.getGrid(parent).path;
			var parent_tmpl = templates[app.id][parent_path];
			if(parent_tmpl) {
				var node = parent_tmpl.bindings[self.name];
				if(!node){
					console.error('No binding found for', self.name, 'in path', parent_path);
					return;
				}
				render(app, self, node);
			} else {
				// it's a list
				var parpar_template = get_template(app, get_parent_grid(app, parent).path);
				var parpar_binding = get_binding(parpar_template, app.getGrid(parent).name);
				if(!parpar_binding) {
					console.log('parent binding is absent!', get_parent_grid(app, parent).path);
					return;
				}
				var struct = parse_rec(app, grid_id, '$template');
				var html = render_rec(app, struct);
				parpar_binding.insertAdjacentHTML("beforeend", html);
				//console.log('insert list item', parpar_binding, html);
			}
		}
	}
}