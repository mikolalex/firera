var Parser = require('../Parser');
var $ = require('jquery');

/* gator v1.2.4 craig.is/riding/gators */
(function(){function t(a){return k?k:a.matches?k=a.matches:a.webkitMatchesSelector?k=a.webkitMatchesSelector:a.mozMatchesSelector?k=a.mozMatchesSelector:a.msMatchesSelector?k=a.msMatchesSelector:a.oMatchesSelector?k=a.oMatchesSelector:k=e.matchesSelector}function q(a,b,c){if("_root"==b)return c;if(a!==c){if(t(a).call(a,b))return a;if(a.parentNode)return m++,q(a.parentNode,b,c)}}function u(a,b,c,e){d[a.id]||(d[a.id]={});d[a.id][b]||(d[a.id][b]={});d[a.id][b][c]||(d[a.id][b][c]=[]);d[a.id][b][c].push(e)}
function v(a,b,c,e){if(d[a.id])if(!b)for(var f in d[a.id])d[a.id].hasOwnProperty(f)&&(d[a.id][f]={});else if(!e&&!c)d[a.id][b]={};else if(!e)delete d[a.id][b][c];else if(d[a.id][b][c])for(f=0;f<d[a.id][b][c].length;f++)if(d[a.id][b][c][f]===e){d[a.id][b][c].splice(f,1);break}}function w(a,b,c){if(d[a][c]){var k=b.target||b.srcElement,f,g,h={},n=g=0;m=0;for(f in d[a][c])d[a][c].hasOwnProperty(f)&&(g=q(k,f,l[a].element))&&e.matchesEvent(c,l[a].element,g,"_root"==f,b)&&(m++,d[a][c][f].match=g,h[m]=d[a][c][f]);
b.stopPropagation=function(){b.cancelBubble=!0};for(g=0;g<=m;g++)if(h[g])for(n=0;n<h[g].length;n++){if(!1===h[g][n].call(h[g].match,b)){e.cancel(b);return}if(b.cancelBubble)return}}}function r(a,b,c,k){function f(a){return function(b){w(g,b,a)}}if(this.element){a instanceof Array||(a=[a]);c||"function"!=typeof b||(c=b,b="_root");var g=this.id,h;for(h=0;h<a.length;h++)k?v(this,a[h],b,c):(d[g]&&d[g][a[h]]||e.addEvent(this,a[h],f(a[h])),u(this,a[h],b,c));return this}}function e(a,b){if(!(this instanceof
e)){for(var c in l)if(l[c].element===a)return l[c];p++;l[p]=new e(a,p);return l[p]}this.element=a;this.id=b}var k,m=0,p=0,d={},l={};e.prototype.on=function(a,b,c){return r.call(this,a,b,c)};e.prototype.off=function(a,b,c){return r.call(this,a,b,c,!0)};e.matchesSelector=function(){};e.cancel=function(a){a.preventDefault();a.stopPropagation()};e.addEvent=function(a,b,c){a.element.addEventListener(b,c,"blur"==b||"focus"==b)};e.matchesEvent=function(){return!0};"undefined"!==typeof module&&module.exports&&
(module.exports=e);window.Gator=e})();



var filter_attr_in_path = (e, delegateEl) => {
	if(!delegateEl) debugger;
	if(e){
		var el = e.target;
		while(el){
			if(el.getAttribute('data-fr-grid-root')){
				return false;
			}
			el = el.parentNode;
			if(el === delegateEl){
				break;
			}
		}
	}
	return true;
}
var filter_attr_in_parents = (parent_node, index, el) => {
	for(;;){
		el = el.parentElement;
		if(!el) return true;
		if(el.hasAttribute('data-fr')){
			return el.children[0] === parent_node;
		}
	}
}
var htmlPipeAspects = {
	attr: (el, attr) => {
		if(!el) return;
		return $(el).attr(attr);
	}
}

var raw = a => a[0];


module.exports = {
	cellMatchers: {
		HTMLAspects: {
			// ^foo -> previous values of 'foo'
			name: 'HTMLAspects',
			regexp: new RegExp('^(\-|\:)?([^\|]*)?\\|(.*)', 'i'),
			func(matches, pool, context, packages) {
				var get_params = (aspect) => {
					var params = aspect.match(/([^\(]*)\(([^\)]*)\)/);
					if(params && params[1]){
						aspect = params[1];
						params = params[2].split(',');
					}  
					return [aspect, params || []];
				}
				var cellname = matches[0];
				var aspects = matches[3].split('|');
				//console.log('Got following aspects', aspects);
				var aspect = aspects[0];
				var pipe = aspects.slice(1);
				if(pipe.length){
					pipe = pipe.map(get_params);
				}
				
				var make_resp = !pipe.length ? (cb, val) => { 
					return cb(val);
				} : function(cb, e){
					var res = e.target;
					for(const [asp, pars] of pipe){
						if(!htmlPipeAspects[asp]){
							console.error('Unknown pipe aspect:', asp);
							continue;
						}
						res = htmlPipeAspects[asp](res, ...pars);
					}
					return cb(res);
				}
				var selector = matches[2];
				var all_subtree = false;
				var func, params;
				var setters = new Set(['visibility', 'display', 'setval', 'hasClass', 'css']);
                [aspect, params] = get_params(aspect);
				if(aspect[0] === '>'){
					all_subtree = true;
					aspect = aspect.substr(1);
				}
				//console.info('Aspect:', aspect, context, params, matches[2]);
				//if(context === null && setters.has(aspect)) context = 'setter';
				if(
					(context === 'setter' && !setters.has(aspect))
					||
					(context !== 'setter' && setters.has(aspect))
				){
					return;
				}
				switch(aspect){
					case 'getval':
						func = function(cb, vals){
							var onch = (el) => {
								var type = el.attr('type');
								var val;
								if(type == 'checkbox'){
									val = el.prop('checked');
								} else {
									val = el.val();
								}
								//console.log('CHange', el, val, selector);
								make_resp(cb, val);
							}
							var [$prev_el, $now_el] = vals;
							var el = raw($now_el);
							var onChange = function(e){
								if(!all_subtree && !filter_attr_in_path(e, el)){
									return;
								}
								onch($(e.target));
							};
							var onKeyup = function(e){
								if(!all_subtree && !filter_attr_in_path(e, el)){
									return;
								}
								var elem = $(e.target);
								var type = elem.attr('type');
								var val;
								if(type == 'checkbox'){
									return;
								} else {
									val = elem.val();
								}
								make_resp(cb, val);
							};
							//console.log('Assigning handlers for ', cellname, arguments, $now_el.find(selector));
							if(Firera.is_def($prev_el)){
								$prev_el.off('keyup', selector);
								$prev_el.off('change', selector);
							}
							if(Firera.is_def($now_el)){
								Gator(raw($now_el)).on('keyup', selector, onKeyup);
								Gator(raw($now_el)).on('change', selector, onChange);
							}
						}
					break;
					case 'click':
						if(selector === 'other'){
							func = function(cb, vals){
								if(!vals) return;
								var [$prev_el, $now_el] = vals;
								if(!Firera.is_def($now_el)) return;
								if($now_el === Firera.undef) return;
								$(document).click(function(e, originalTarget){
									var is_other = !$.contains($now_el.get()[0], originalTarget);
									if(is_other){
										make_resp(cb, true);
									}
								})
							}
						} else {
							func = function(cb, vals){
								if(!vals) return;
								var [$prev_el, $now_el] = vals;
								if(!Firera.is_def($now_el)) return;
								if($now_el === Firera.undef) return;
								//console.log('Assigning handlers for ', cellname, arguments, $now_el);
								if($prev_el && $prev_el !== Firera.undef){
									$prev_el.off('click', selector);
								}
								if($now_el.length === 0){
									console.warn('Assigning handlers to nothing', $now_el);
								}
								var el = raw($now_el);
								var prev_el = $prev_el ? raw($prev_el) : false;
								Gator(el).on('click', selector, function(e){
									if(!all_subtree && !filter_attr_in_path(e, el)){
										return;
									}
									make_resp(cb, e);
									if(e.originalEvent && e.originalEvent.target){
										$(document).trigger('click', e.originalEvent.target);
									}
									e.preventDefault();
									//return false;
								});
							}
						}
					break;
					case 'focus':
						func = function(cb, vals){
							if(!vals) return;
							var [$prev_el, $now_el] = vals;
							if(!Firera.is_def($now_el)) return;
							if($prev_el){
								
							}
							if($now_el.length === 0){
								console.log('Assigning handlers to nothing', $now_el);
							}
							var el = raw($now_el);
							Gator(el).on('focus', selector, (e) => {
								if(!all_subtree && !filter_attr_in_path(e, el)){
									return;
								}
								make_resp(cb, e);
								return false;
							});
						}
					break;
					case 'press':
						func = function(cb, vals){
							var [$prev_el, $now_el] = vals;
							if(!Firera.is_def($now_el)) return;
							//console.log('Assigning handlers for ', cellname, arguments, $now_el);
							if($prev_el){
								//$prev_el.off('keyup', selector);
							}
							var el = raw($now_el);
							Gator(el).on('keyup', selector, function(e){
								if(!all_subtree && !filter_attr_in_path(e, el)){
									return;
								}
								var btn_map = {
									'13': 'Enter',
									'27': 'Esc',
								}
								if(params.indexOf(btn_map[e.keyCode]) !== -1){
									make_resp(cb, e);
								}
							});
						}
					break;
					case 'hasClass':
						func = function($el, val){
							if(!Firera.is_def($el)) return;
							if(!Firera.is_def(val)){
								val = false;
							}
							var [classname] = params;
							$el.toggleClass(classname, val);
						}
					break;
					case 'enterText':
						func = function(cb, vals){
							var [$prev_el, $now_el] = vals;
							if(!$now_el) return;
							if($prev_el){
								//$prev_el.off('keyup', selector);
							}
							var el = $now_el[0];
							el.onkeyup = function(e) {
								if(e.target === $now_el.find(selector)[0]){
									if(!all_subtree && !filter_attr_in_path(e, el)){
										return;
									}
									if(e.keyCode == 13){
										make_resp(cb, e.target.value);
									}
								}
							};
						}
					break;
					case 'visibility':
						func = function($el, val){
							if(!Firera.is_def($el)){
								return;
							}
							if(val === undefined){
								return;
							}
							if(val){
								$el.css('visibility', 'visible');
							} else {
								$el.css('visibility', 'hidden');
							}
						}
					break;
					case 'css':
						var [property] = params;
						func = function($el, val){
							//console.log('running css setter', $el);
							$el.css(property, val);
						}
					break;
					case 'display':
						func = function($el, val){
							if(!Firera.is_def($el) || val === undefined){
								return;
							}
							if(val){
								$el.css('display', 'block');
							} else {
								$el.css('display', 'none');
							}
						}
					break;
					case 'setval':
						func = function($el, val){
							$el.val(val);
						}
					break;
					default:
						throw new Error('unknown HTML aspect: ' + aspect);
					break;
				}
				if(context === 'setter'){
					Parser.parse_fexpr([func, [(a) => {
						if(!Firera.is_def(a)) return $();
						if(!selector) return a;
						if(selector === 'other') return a;
						var node = a.find(selector)
								.filter(filter_attr_in_parents.bind(null, a.get()[0]));
						return node;
					}, '-$real_el', '$html_skeleton_changes'], cellname], pool, Parser.get_random_name(), packages);
					//console.log('OLOLO2', Object.keys(pool.cell_types.$real_el.children), packages);
				} else {
					Parser.parse_fexpr(['asyncClosure', () => {
						var el;
						return (cb, val) => {
							func(cb, [el, val]);
							el = val;
						}
					}, '-$real_el', '$html_skeleton_changes'], pool, cellname, packages);
				}
			}
		}
	}
}