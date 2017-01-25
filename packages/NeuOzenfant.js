
var rendered = {};
var templates = {};

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
		el.children.each((node, key) => {
			if(el.children.hasOwnProperty(key)){
				set_bindings_rec(app, struct.children[key], node);
			}
		})
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

module.exports = {
	onGridCreated: (app, grid_id, path, parent) => {
		if(!parent){
			var self = app.getGrid(grid_id);
			var node = self.cell_values.$el.get()[0];
			render(app, self, node);
		}
		if(rendered[app.id] && rendered[app.id][parent]){
			var self = app.getGrid(grid_id);
			var parent_path = app.getGrid(parent).path;
			var parent_tmpl = templates[app.id][parent_path];
			//if(!parent_tmpl) debugger;
			var node = parent_tmpl.bindings[self.name];
			render(app, self, node);
		}
		//console.log('grid created', path, parent_path);
	}
}