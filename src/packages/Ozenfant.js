import utils from '../utils';

const rendered = {};
const templates = {};
const closest_templates = {};

const raw = utils.raw;

const parse_rec = (app, grid_id, cells) => {
	const grid = app.getGrid(grid_id);
	const res = {
		grid_id,
		children: {},
	};
	for(let cell of cells){
		res[cell] = grid.cell_values[cell]
	}
	for(let gridname in grid.linked_grids){
			const gr_id = grid.linked_grids[gridname];
			res.children[gridname] = parse_rec(app, gr_id, cells);
	}
	return res;

}
const is_list_without_templates = (struct) => {
	return Object.keys(struct.children).length && (!struct.children[0].$template);
}

const get_arr_val = (app, grid_id) => {
	const vals = app.getGrid(grid_id).getChildrenValues();
	return vals;
}

const render_rec = (app, struct, closest_existing_template_path, skip) => {
	const grid = app.getGrid(struct.grid_id);
	utils.init_if_empty(rendered, app.id, {}, grid.id, true);
	if(struct.$template){
		const context = Object.assign({}, grid.cell_values);
		utils.init_if_empty(templates, app.id, {});
		templates[app.id][grid.path] = struct.tmpl = new Firera.Ozenfant(struct.$template);
		//console.log('____ TMPL', struct.tmpl); 
		
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
		if(struct.$el){
			// just ready HTML
			utils.init_if_empty(templates, app.id, {});
			templates[app.id][grid.path] = {
				fake: true,
				$el: struct.$el,
				set: (a, b) => {
					//console.log('FAKE set', a, b);
				},
			}
		}
		
		if(!skip){
			const res = [];
			for(let key in struct.children){
					res.push(render_rec(app, struct.children[key]));
			}
			return res.join('');
		} else {
			utils.init_if_empty(closest_templates, app.id, {});
			const path0 = grid.path.replace(closest_existing_template_path, '/');
			const p0 = path0.split('/');
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
const set_bindings_rec = (app, struct, el, is_root, skip) => {
	const grid = app.getGrid(struct.grid_id);
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
			let el = get_binding(struct.tmpl, key);
			if(el){
				set_bindings_rec(app, struct.children[key], el, false, true);
			}
		}
	} else {
		if(el && !skip){
			grid.set('$real_el', el);
			el.setAttribute('data-fr-grid-root', 1);
		}
		for(let ch in struct.children){
			var child_el;
			var child_skip = !skip;
			if(!el){
				return;
			}
			if(Number(ch) == ch){
				// int
				child_el = el.children[ch];
			} else {
				child_el = document.querySelector('[data-fr=' + ch + ']', el);
				child_skip = false;
			}
			set_bindings_rec(app, struct.children[ch], child_el, true, child_skip);
		}
		/*for(let key in el.children){
			if(el.children.hasOwnProperty(key) && struct.children[key]){
				set_bindings_rec(app, struct.children[key], el.children[key], true, !skip);
			}
		}*/
	}
}
const render = function(app, start, node){
		const struct = parse_rec(app, start.id, ['$template', '$el']);
		const html = render_rec(app, struct);
		if(html !== ''){
			node.innerHTML = html;
		}
		set_bindings_rec(app, struct, node);
		//console.log('html', html);
}

const get_parent_grid = (app, grid_id) => {
	return app.getGrid(app.getGrid(grid_id).parent);
}

const get_template = (app, path) => {
	return templates[app.id][path];
}

const get_binding = (template, name) => {
	if(template instanceof Firera.Ozenfant){
		return template.bindings[name];
	} else {
		var bnd = template.$el.querySelector('[data-fr=' + name + ']');
		// @refactor! too much searches
		return bnd;
	}
}

var container;

const get_root_node_from_html = (html) => {
	container.innerHTML = html;
	const children = container.children;
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
				const template = templates[app_id] ? templates[app_id][template_path] : false;
				if(!template) {
					if(!closest_templates[app_id]) return;
					const dt = closest_templates[app_id][template_path];
					const path = dt.path + '/' + cell;
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
		const self = app.getGrid(grid_id);
		if(!parent){
			if(!self.cell_values.$el){
				return;
			}
			const node = raw(self.cell_values.$el);
			container = document.createElement('div');
			container.style.display = 'none';
			container.setAttribute('id', 'ozenfant-container-hidden');
			document.getElementsByTagName('body')[0].appendChild(container);
			render(app, self, node);
		}
		if(rendered[app.id] && rendered[app.id][parent]){
			const parent_path = app.getGrid(parent).path;
			if(!templates[app.id]){
				templates[app.id] = {};
			}
			const parent_tmpl = templates[app.id][parent_path];
			if(parent_tmpl) {
				const node = get_binding(parent_tmpl, self.name);
				if(!node){
					console.error('No binding found for', self.name, 'in path', parent_path);
					return;
				}
				render(app, self, node);
			} else {
				// it's a list
				const parpar_template = get_template(app, get_parent_grid(app, parent).path);
				if(!parpar_template){
					return;
				}
				const parpar_binding = get_binding(parpar_template, app.getGrid(parent).name);
				if(!parpar_binding) {
					//console.log('parent binding is absent!', get_parent_grid(app, parent).path);
					return;
				}
				const struct = parse_rec(app, grid_id, ['$template', '$el']);
				const html = render_rec(app, struct);
				if(html === ''){
					console.warn('Empty $template!');
					return;
				}
				const node = get_root_node_from_html(html);
				//parpar_binding.insertAdjacentHTML("beforeend", html);
				parpar_binding.appendChild(node);
				set_bindings_rec(app, struct, node, true);
			}
		}
	}
}