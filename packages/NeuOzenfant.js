
var rendered = {};
var templates = {};
var closest_templates = {};
var utils = require('../utils');

var raw = utils.raw;

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
var is_list_without_templates = (struct) => {
	return Object.keys(struct.children).length && (!struct.children[0].val);
}

var get_arr_val = (app, grid_id) => {
	var vals = app.getGrid(grid_id).getChildrenValues();
	return vals;
}

var render_rec = (app, struct, closest_existing_template_path, skip) => {
	var grid = app.getGrid(struct.grid_id);
	utils.init_if_empty(rendered, app.id, {}, grid.id, true);
	if(struct.val){
		var context = Object.assign({}, grid.cell_values);
		utils.init_if_empty(templates, app.id, {});
		templates[app.id][grid.path] = struct.tmpl = new Firera.Ozenfant(struct.val);
		
		for(let key in struct.children){
			if(is_list_without_templates(struct.children[key])){
				context[key] = get_arr_val(app, struct.children[key].grid_id);
				render_rec(app, struct.children[key], grid.path, true);
			} else {
				context[key] = render_rec(app, struct.children[key], grid.path);
			}
		}
		return struct.tmpl.getHTML(context);
	} else {
		
		
		if(!skip){
			var res = [];
			for(let key in struct.children){
					res.push(render_rec(app, struct.children[key]));
			}
			return res.join('');
		} else {
			utils.init_if_empty(closest_templates, app.id, {});
			var path0 = grid.path.replace(closest_existing_template_path, '/');
			var p0 = path0.split('/');
			var res = '';
			for(let p of p0){
				if(p === '') continue;
				if(Number(p) == p){
					res += '[' + p + ']';
				} else {
					res += '/' + p;
				}
			}
			//console.log('R', res);
			closest_templates[app.id][grid.path] = {
				template: templates[app.id][closest_existing_template_path],
				path: res
			};
			for(let key in struct.children){
				render_rec(app, struct.children[key], closest_existing_template_path, true);
			}
		}
	}
}
var set_bindings_rec = (app, struct, el, is_root, skip) => {
	var grid = app.getGrid(struct.grid_id);
	el = raw(el);
	if(struct.tmpl){
		el.setAttribute('data-fr-grid-root', 1);
		if(is_root){
			struct.tmpl.setFirstNode(el).updateBindings();
		} else {
			struct.tmpl.setRoot(el).updateBindings();
		}
		grid.set('$real_el', el);
		for(let key in struct.children){
			let el = struct.tmpl.bindings[key];
			if(el){
				set_bindings_rec(app, struct.children[key], el, false, true);
			}
		}
	} else {
		if(el && !skip){
			grid.set('$real_el', el);
			el.setAttribute('data-fr-grid-root', 1);
		}
		for(let key in el.children){
			if(el.children.hasOwnProperty(key) && struct.children[key]){
				set_bindings_rec(app, struct.children[key], el.children[key], true, !skip);
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

var container;

var get_root_node_from_html = (html) => {
	container.innerHTML = html;
	var children = container.children;
	if(children[1]){
		console.error('Template should have only one root node,', children, html);
	}
	return children[0];
}

/*var get_path_binding = (app_id, path) => {
	var pieces = path.split('/');
	var last = pieces[pieces.length - 1];
	if(Number(last) == last){
		// it's list item
		var parent_name = pieces[pieces.length - 2];
		var parpar_path = pieces.slice(0, pieces.length - 2).join('/');
		parpar_path = parpar_path === '' ? '/' : parpar_path;
		return templates[app_id][parpar_path].bindings[parent_name].childNodes[Number(last) + 1];
	} else {
		console.log('should be implemented!');
	}
}*/

module.exports = {
	eachGridMixin: {
		'$ozenfant.writer': [([cell, val], template_path, app_id) => {
				if(cell[0] === '$') return;
				if(!template_path || !app_id || !templates[app_id] || cell.indexOf('/') !== -1) return;
				var template = templates[app_id] ? templates[app_id][template_path] : false;
				if(!template) {
					if(!closest_templates[app_id]) return;
					var dt = closest_templates[app_id][template_path];
					var path = dt.path + '/' + cell;
					dt.template.set(path, val);
					return;
				}
				//console.log('Set', cell, val, template.state[cell]);
				template.set(cell, val);
		}, '*', '-$path', '-$app_id'],
		'$html_skeleton_changes': ['$real_el'],
		'$ozenfant.remover': [(_, path, app_id) => {
			var template = templates[app_id][path];
			if(template && template.root){
				template.root.remove();
			} else {
				//debugger;
			}
			delete templates[app_id][path];
		}, '$remove', '-$path', '-$app_id']
	},
	onBranchCreated: (app, grid_id, path, parent) => {
		var self = app.getGrid(grid_id);
		if(!parent){
			if(!self.cell_values.$el){
				return;
			}
			var node = raw(self.cell_values.$el);
			container = document.createElement('div');
			container.style.display = 'none';
			container.setAttribute('id', 'ozenfant-container-hidden');
			document.getElementsByTagName('body')[0].appendChild(container);
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
				var node = get_root_node_from_html(html);
				//parpar_binding.insertAdjacentHTML("beforeend", html);
				parpar_binding.appendChild(node);
				set_bindings_rec(app, struct, node, true);
			}
		}
	}
}