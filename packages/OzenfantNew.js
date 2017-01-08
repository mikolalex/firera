var Ozenfant = require('../../ozenfant/ozenfant');
var $ = require('jquery');

var is_def = (a) => {
	return (a !== undefined) && (a !== Firera.undef);
}
var init_from_path = function(obj, path, val) {
	if(!(path instanceof Array)){
		path = path.split('/');
	}
	for(let k in path){
		let key = path[k];
		if(key === '') continue;
		if(obj[key] === undefined){
			if(path[Number(k) + 1]){
				obj[key] = {};
			} else {
				obj[key] = val;
			}
		}
		if(!(obj[key] instanceof Object)){
			obj[key] = {};
		}
		obj = obj[key];
	}
}

var Tree = function(){
	this.template_hash = {};
	this.template_tree = {};
	this.bindings = {};
	this.onUpdateBindingsCbs = {};
}
Tree.prototype.getHTML = function(path, node){
	if(!node) return;
	if(node instanceof Ozenfant){
		// its final template
		return this.template_hash[path].getHTML();
	} else {
		var template;
		if(template = this.template_hash[path]){
			// its object
			for(let key in node){
				var new_path = path == '/' ? path + key : path + '/' + key;
				template.set(key, this.getHTML(new_path, node[key]));
			}
			return template.getHTML();
		} else {
			// its array
			var res = [];
			for(let key in node){
				var new_path = path == '/' ? path + key : path + '/' + key;
				res.push('<div data-fr="' + key + '" data-fr-name="' + key + '">'
						+ this.getHTML(new_path, node[key])
						+ '</div>'
						)
			}
			return res.join(' ');
		}
	}
}

Tree.prototype.onUpdateBinding = function(path, cb){
	this.onUpdateBindingsCbs[path] = cb;
}

Tree.prototype.updateBindings = function(path, struct, el = false){
	var template = this.template_hash[path];
	if(el){
		this.bindings[path] = el;
	}
	if(!template){
		// its list
		for(var child of el.children){
			var num = child.getAttribute('data-fr-name');
			if(struct[num]){
				var new_path = path == '/' ? path + num : path + '/' + num;
				this.updateBindings(new_path, struct[num], child);
			}
		}
		return;
	}
	if(el){
		template.setRoot(el);
	}
	template.updateBindings();
	if(this.onUpdateBindingsCbs[path]){
		this.onUpdateBindingsCbs[path]($(this.template_hash[path].root));
	}
	if(!(struct instanceof Object) || (struct instanceof Ozenfant)){
		return;
	}
	for(let key in struct){
		var new_path = path == '/' ? path + key : path + '/' + key;
		if(template.bindings[key]){
			this.updateBindings(new_path, struct[key], template.bindings[key]);
		} else {
			//console.log('bindings not found!', template.bindings, key);
		}
	}
}



Tree.prototype.getBindingsRec = function(path){
	//console.log('Look for bindings!', path);
	var parent = path.split('/');
	var key = parent.pop();
	var parent = parent.join('/');
	if(parent === ''){
		parent = '/';
	}
	var template = this.template_hash[parent];
	if(template){
		return template.bindings[key];
	} else {
		var bnd = this.bindings[parent];
		if(!bnd){
			if(parent){
				bnd = this.getBindingsRec(parent);
			}
		}
		var bv = $(bnd).children('[data-fr=' + key + ']');
		if(!bv.length){
			bv = $("<div/>").attr('data-fr', key).appendTo(bnd);
		}
		return bv.get()[0];
	}
}

Tree.prototype.render = function(root_path){
	//timer('render', root_path);
	var branch = get_branch(this.template_tree, root_path);
	var res = this.getHTML(root_path, branch);
	var root_el = this.template_hash[root_path] ? this.template_hash[root_path].root : false;
	if(!root_el){
		root_el = this.bindings[root_path];
	}
	if(!root_el){
		root_el = this.getBindingsRec(root_path);
	}
	if(!root_el){
		console.warn('Root DOM node($el) is undefined');
		return;
		// oh god...
	}
	root_el.innerHTML = res;
	//timer('update Bindings', root_path);
	this.updateBindings(root_path, branch, root_el);
	//timer('--- render finished', root_path);
}

Tree.prototype.refresh = function(){
	var root_path;
	if(this.refreshPrefixPath){
		root_path = this.refreshPrefixPath.join('/');
		this.refreshPrefixPath = false;
		root_path = root_path == '' ? '/' : root_path;
		if(root_path[0] !== '/'){
			root_path = '/' + root_path;
		}
	} else {
		root_path = '/';
	}
	this.render(root_path);
}

Tree.prototype.addToRefreshPool = function(path, pth){
	if(!this.refreshPrefixPath){
		this.refreshPrefixPath = pth;
	} else {
		for(var key in pth){
			if(this.refreshPrefixPath[key] !== pth[key]){
				break;
			}
		}
		this.refreshPrefixPath = this.refreshPrefixPath.slice(0, key);
	}
}

Tree.prototype.removeLeaf = function(path, skip_remove_node){
	var skip_further = true;
	if(!skip_remove_node){
		if(this.template_hash[path] && this.template_hash[path].root){
			this.template_hash[path].root.remove();
		} else {
			skip_further = false;
		}
	}
	delete this.template_hash[path];
	delete this.bindings[path];
	var struct = get_branch(this.template_tree, path);
	for(var key in struct){
		var new_path = path + '/' + key;
		this.removeLeaf(new_path, skip_further);
	}
} 

var get_parent_path = (path) => {
	var p = path.split('/');
	var name = p.pop();
	if(Number(name) == name){
		p.pop();
	}
	var parent = p.join('/');
	if(parent == ''){
		parent = '/';
	}
	return [name, parent];
}

Tree.prototype.setTemplate = function(path, template, context, el){
	var pth = path.split('/'); 
	if(pth[0] === ''){
		pth = pth.slice(1);
	}
	if(pth[0] === ''){
		pth = pth.slice(1);
	}
	var tmpl = new Ozenfant(template);
	tmpl.state = context;
	if(el){
		tmpl.root = el;
	}
	this.template_hash[path] = tmpl;
	init_from_path(this.template_tree, path, {});
	this.addToRefreshPool(path, pth);
	var [name, parent] = get_parent_path(path);
	if(this.template_hash[parent] && !((Number(name) == name) && name.length)){
		this.refresh(); 
	}
}

var ozenfant_trees = {};

var get_branch = (tree, path) => {
	var pth = path.split('/');
	for(let k of pth){
		if(k === '') continue;
		if(!tree[k]){
			break;
		}
		tree = tree[k];
	}
	return tree;
}

var get_tree = (app_id) => {
	var tree;
	if(!ozenfant_trees[app_id]){
		ozenfant_trees[app_id] = tree = new Tree();
	} else {
		tree = ozenfant_trees[app_id];
	}
	return tree;
}


var ozenfant_new = {
	eachHashMixin: {
		'$real_el': ['asyncClosure', () => {
			var hashname, template;
			return (cb, template, path, app_id, context, el) => {
				if(!app_id) return;
				var pth = path === '/' ? '' : path;
				var tree = get_tree(app_id);
				tree.onUpdateBinding(path, cb);
				tree.setTemplate(path, template, context, is_def(el)? el.get()[0] : false);
			}
		}, '$template', '-$path', '-$app_id', '-$real_values', '-$el'],
		'$ozenfant.list_render': [
			(_, path, app_id) => {
				var parent = get_parent_path(path)[1];
				var tree = get_tree(app_id);
				if(tree.bindings[parent]){
						tree.render(parent);
				}				
			}, 
			'$all_children', '-$path', '-$app_id'],
		'$ozenfant.writer': [([cell, val], template_path, app_id) => {
				if(!template_path || !app_id || !ozenfant_trees[app_id]) return;
				var pth = template_path;
				var template = get_tree(app_id).template_hash[pth];
				if(!template) {
					return;
				}
				template.set(cell, val);
		}, '*', '-$path', '-$app_id'],
		'$html_skeleton_changes': ['$real_el'],
		'$ozenfant.remover': [(_, path, app_id) => {
				ozenfant_trees[app_id].removeLeaf(path);
		}, '$remove', '-$path', '-$app_id']
	}
}

module.exports = ozenfant_new;