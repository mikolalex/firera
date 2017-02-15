var utils = require('../utils');

var search_fr_bindings = function($el){
	var res = {};
	if(!Firera.is_def($el)) return res;
	$el = utils.raw($el);
	if(!$el){
		return res;
	}
	$el.querySelectorAll('[data-fr]').forEach(function(node, k){
		var name = node.getAttribute('data-fr-name');
		if(!name){
			name = node.getAttribute('data-fr');
		}
		res[name] = node;
	})
	return res;
}

var write_changes = function(){
	var pool = {};
	return (cell, val) => {
		if(cell === '*'){
			pool[val[0]] = val[1];
		} else {
			// htmlbindings, obviously
			for(let i in pool){
				if(val && val[i]){
					val[i].innerHTML = pool[i];
				}
			}
		}
	}
}

module.exports = {
	eachGridMixin: {
		$el: ['closure', () => {
			var prev_el;
			return (name, map) => {
				return map ? map[name] : null;
			}
		}, '$name', '../$htmlbindings'],
		'$real_el': ['firstDefined', '$el'],
		'$html_template': [
			'skipIf',
			([$prev_el], [$el]) => {
				if(Firera.is_def($prev_el) && Firera.is_def($el) && $prev_el === $el){
					return false;
				} else {
					return true;
				}
			},
			function($el){
				$el = utils.raw($el);
				var str = '';
				if(Firera.is_def($el)){
					str = !$el ? '' : $el.innerHTML.trim();
				}
				return str;
			}, 
			'$real_el'
		],
		'$template_writer': [
			function(real_templ, $html_template, no_auto, keys, $el){
				$el = utils.raw($el);
				if(Firera.is_def(real_templ) && Firera.is_def($el) && $el){
						$el.innerHTML = real_templ;
						return true;
				}	
				if(!$html_template && Firera.is_def($el) && keys && !no_auto && $el){
					var auto_template = keys.map((k) => {
						return '<div>' + k + ':<div data-fr="' + k + '"></div></div>';
					}).join(' ');
					$el.innerHTML = auto_template;
				}
			}, '$template', '$html_template', '$no_auto_template', '-$real_keys', '-$real_el'
		],
		'$html_skeleton_changes': [utils.id, '$template_writer'],
		'$htmlbindings': [search_fr_bindings, '-$real_el', '$template_writer'],
		'$writer': ['closureFunnel', write_changes, '$htmlbindings', '*']
	}
}