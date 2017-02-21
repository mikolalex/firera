import utils from '../utils';
const Obj = utils.Obj;
const search_fr_bindings = function($el){
	const res = {};
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

const write_changes = function(){
	const pool = {};
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
		$list_template_writer: ['nestedClosure', () => {
			var index_c = 3;
			const index_map = {};
			return function(cb, is_list, deltas, $el){
				if($el === Firera.undef || !is_list || !$el) return;
				for(let i in deltas){
					const type = deltas[i][0];
					const key = deltas[i][1];
					switch(type){
						case 'add':
							$el.insertAdjacentHTML('beforeend', '<div data-fr="' + (++index_c) + '" data-fr-name="' + key + '"></div>');
							index_map[key] = index_c;
							// I domt know...
						break
						case 'remove':
							$el.querySelector('[data-fr="' + index_map[key] + '"]').remove();
						break
					}
				}
				cb('dummy', true);
				cb('index_map', index_map);
				return true;
			}
		}, '-$is_list', '$arr_data.changes', '$real_el'],
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
					const auto_template = keys.map((k) => {
						return '<div>' + k + ':<div data-fr="' + k + '"></div></div>';
					}).join(' ');
					$el.innerHTML = auto_template;
				}
			}, '$template', '$html_template', '$no_auto_template', '-$real_keys', '-$real_el'
		],
		'$html_skeleton_changes': [utils.id, '$template_writer'],
		'$htmlbindings': [(is_list, a, b, c) => {
			if(!is_list){
				return search_fr_bindings(a, b);
			} else {
				if(!a || !c) return;
				const res = Obj.map(c, (n, i) => {
					return get_by_selector(c[i], a);
				})
				return res;
			}
		}, '-$is_list', '-$real_el', '$template_writer', '$list_template_writer.index_map'],
		'$writer': ['closureFunnel', write_changes, '$htmlbindings', '*']
	}
}