
var get_ozenfant_template = (str, context) => {
	if(str){
		var template = new Ozenfant(str);
		var filtered_context = {};
		for(let k in context){
			if(context[k] instanceof Object){
				// dont write objects to html!
			} else {
				filtered_context[k] = context[k];
			}
		}
		//template.state = filtered_context;
		return template;
	}
}

var get_fields_map = function(){
	var map = {};
	return ([key, val]) => {
		map[key] = val;
		return val;
	}
} 

var write_ozenfant_changes = function(change, template){
	if(!template) return;
	var [k, v] = change;
	if(unusual_cell(k)) return;
	if(v instanceof Object){
		// lol dont write objects to html!
		return;
	}
	template.set(...change);
}

var collect_map = () => {
	var map = {};
	return ([key, val]) => {
		map[key] = val;
		return map;
	} 
}

module.exports = {
	eachHashMixin: {
		'$ozenfant_el': [(searcher, name) => {
				var res;
				if(searcher instanceof Function){
					res = searcher(name);
				}
				return res ? $(res) : false;
		}, '../$ozenfant.bindings_search', '$name'],
		'$list_el': [(name, $el, map) => {
				//console.log('search list', name, $el, map);
				if(name === null || name === undefined || !map) return;
				var num = map[name];
				return get_by_selector(num, $el, true);
		}, '$name', '../$real_el', '../$list_template_writer.index_map'],
		'$real_el': ['firstTrueCb', ($el) => { return $el && $el.length }, '$el', '$list_el', '$ozenfant_el'],
		'$ozenfant_template2': [get_ozenfant_template, '$template', '-$real_values'],
		'$ozenfant': ['nested', (cb, template, $el, context) => {
				if(!template || !is_def($el)) return;
				var filtered_context = {};
				for(let k in context){
					if(context[k] instanceof Object){
						// dont write objects to html!
					} else {
						filtered_context[k] = context[k];
					}
				}
				if($el){
					template.render($el.get(0), filtered_context);
				}
				cb('bindings_search', (str) => {
					return template.bindings ? template.bindings[str] : false;
				})
				cb('html', template);
		}, ['html', 'bindings_search'], '$ozenfant_template2', '$real_el', '-$real_values'],
		//'$ozenfant_nested_templates': ['closure', get_fields_map, '*/$ozenfant.template'],
		'$ozenfant_writer': [write_ozenfant_changes, '*', '-$ozenfant_template2'],
		/*'$ozenfant_something': [(a, b) => {
			return {
				template: a,
				children: b,
			}
		}, '$ozenfant_template2', '$templates_map'],*/
		'$ozenfant_first_render': [(_, struct, $el) => {
				//var html = ozenfant_to_html_rec(struct);
				//console.log('First render!', struct, $el, html);
				//$el.html(html);				
		}, '$inited', '-$ozenfant_something', '-$real_el'],
		//'$templates_map': ['closure', collect_map, '*/$ozenfant_something'],
		'$html_skeleton_changes': ['$ozenfant.html'],
		'$ozenfant_remove': [function(_, $el){
			if($el){
				$el.html('');
			}
		}, '$remove', '-$real_el']
	}
}