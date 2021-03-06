import utils from '../utils';

/* gator v1.2.4 craig.is/riding/gators */
(function(){function t(a){return k?k:a.matches?k=a.matches:a.webkitMatchesSelector?k=a.webkitMatchesSelector:a.mozMatchesSelector?k=a.mozMatchesSelector:a.msMatchesSelector?k=a.msMatchesSelector:a.oMatchesSelector?k=a.oMatchesSelector:k=e.matchesSelector}function q(a,b,c){if("_root"==b)return c;if(a!==c){if(t(a).call(a,b))return a;if(a.parentNode)return m++,q(a.parentNode,b,c)}}function u(a,b,c,e){d[a.id]||(d[a.id]={});d[a.id][b]||(d[a.id][b]={});d[a.id][b][c]||(d[a.id][b][c]=[]);d[a.id][b][c].push(e)}
function v(a,b,c,e){if(d[a.id])if(!b)for(let f in d[a.id])d[a.id].hasOwnProperty(f)&&(d[a.id][f]={});else if(!e&&!c)d[a.id][b]={};else if(!e)delete d[a.id][b][c];else if(d[a.id][b][c])for(f=0;f<d[a.id][b][c].length;f++)if(d[a.id][b][c][f]===e){d[a.id][b][c].splice(f,1);break}}function w(a,b,c){if(d[a][c]){var k=b.target||b.srcElement,f,g,h={},n=g=0;m=0;for(f in d[a][c])d[a][c].hasOwnProperty(f)&&(g=q(k,f,l[a].element))&&e.matchesEvent(c,l[a].element,g,"_root"==f,b)&&(m++,d[a][c][f].match=g,h[m]=d[a][c][f]);
b.stopPropagation=function(){b.cancelBubble=!0};for(g=0;g<=m;g++)if(h[g])for(n=0;n<h[g].length;n++){if(!1===h[g][n].call(h[g].match,b)){e.cancel(b);return}if(b.cancelBubble)return}}}function r(a,b,c,k){function f(a){return function(b){w(g,b,a)}}if(this.element){a instanceof Array||(a=[a]);c||"function"!=typeof b||(c=b,b="_root");var g=this.id,h;for(h=0;h<a.length;h++)k?v(this,a[h],b,c):(d[g]&&d[g][a[h]]||e.addEvent(this,a[h],f(a[h])),u(this,a[h],b,c));return this}}function e(a,b){if(!(this instanceof
e)){for(let c in l)if(l[c].element===a)return l[c];p++;l[p]=new e(a,p);return l[p]}this.element=a;this.id=b}var k,m=0,p=0,d={},l={};e.prototype.on=function(a,b,c){return r.call(this,a,b,c)};e.prototype.off=function(a,b,c){return r.call(this,a,b,c,!0)};e.matchesSelector=function(){};e.cancel=function(a){a.preventDefault();a.stopPropagation()};e.addEvent=function(a,b,c){a.element.addEventListener(b,c,"blur"==b||"focus"==b)};e.matchesEvent=function(){return!0};"undefined"!==typeof module&&module.exports&&
(module.exports=e);window.Gator=e})();



const filter_attr_in_path = (e, delegateEl) => {
	if(e && e.path){
		for(let nd of e.path){
			if(nd === e.target){
				continue;
			}
			if(nd === delegateEl){
				break;
			}
			if(nd === document){
				break;
			}
			if(nd.getAttribute('data-fr-grid-root')){
				return false;
			}
		}
	}
	return true;
}
const filter_attr_in_parents = function(parent_node, index, el){
	for(;;){
		el = el.parentElement;
		if(!el) return true;
		if(el.hasAttribute('data-fr-grid-root')){
			return el.children[0] === parent_node;
		}
	}
}
const htmlPipeAspects = {
	attr: (e, attr) => {
		if(!e) return;
		/*debugger;
		for(var attrName in attr){
			el.setAttribute(attrName, attr[attrName]);
		}*/
		return e.target.getAttribute(attr);
	},
	files: (e) => {
		return e.target.files;
	}
}

const raw = a => {
	if(a instanceof Node  || !a){
		return a;
	} else {
		return a[0];
	}
}

const make_resp1 = (cb, val) => { 
	return cb(val);
}

const make_resp2 = function(pipe, cb, e){
	var res;
	for(const [asp, pars] of pipe){
		if(!htmlPipeAspects[asp]){
			console.error('Unknown pipe aspect:', asp);
			continue;
		}
		res = htmlPipeAspects[asp](e, ...pars);
	}
	return cb(res);
}

const toggle_class = (el, clas, val) => {
	if(!el) return;
	const cls_string = el.getAttribute('class') || '';
	const cls = cls_string.split(' ');
	const pos = cls.indexOf(clas);
	var toggle;
	if(val !== undefined){
		toggle = val;
	} else {
		toggle = pos === -1;
	}
	if(toggle){
		if(cls.indexOf(clas) === -1){
			el.setAttribute('class', cls_string + ' ' + clas);
		}
	} else {
		if(pos !== -1){
			cls.splice(pos, 1);
		}
		el.setAttribute('class', cls.join(' '));
	}
}

const trigger_event = function(name, element, fakeTarget){
	var event; // The custom event that will be created
	if(element instanceof $){
		for(let el of element){
			trigger_event(name, el);
		}
		return;
	}
	if (document.createEvent) {
		event = document.createEvent("HTMLEvents");
		event.initEvent(name, true, true);
	} else {
		event = document.createEventObject();
		event.eventType = name;
	}

	event.eventName = name;
	if(fakeTarget){
		e.target = fakeTarget;
	}

	if (document.createEvent) {
		element.dispatchEvent(event);
	} else {
		element.fireEvent("on" + event.eventType, event);
	}
}

var get_handler = (event, selector, all_subtree, make_resp) => {
	return function(cb, vals){
		if(!vals) return;
		const [$prev_el, $now_el] = vals;
		if(!Firera.is_def($now_el)) return;
		const prev_el = raw($prev_el);
		const now_el = raw($now_el);
		//console.log('Assigning handlers for ', cellname, arguments, $now_el);
		if(prev_el && prev_el !== Firera.undef){
			Gator(prev_el).off(event);
		}
		if(!$now_el){
			utils.warn('Assigning handlers to nothing', $now_el);
		}
		Gator(now_el).on(event, selector, function(e){
			if(!all_subtree && !filter_attr_in_path(e, now_el)){
				return;
			}
			make_resp(cb, e);
			if(e.originalEvent && e.originalEvent.target){
				trigger_event(event, document, e.originalEvent.target);
			}
		});
	}
}

module.exports = {
	eachGridMixin: {
		'$html_skeleton_changes': ['$real_el'],
	},
	cellMatchers: {
		HTMLAspects: {
			// ^foo -> previous values of 'foo'
			name: 'HTMLAspects',
			regexp: new RegExp('^(\-|\:)?([^\|]*)?\\|(.*)', 'i'),
			func(matches, context) {
				const get_params = (aspect) => {
					var params = aspect.match(/([^\(]*)\(([^\)]*)\)/);
					if(params && params[1]){
						aspect = params[1];
						params = params[2].split(',');
					}  
					return [aspect, params || []];
				}
				const cellname = matches[0];
				const aspects = matches[3].split('|');
				//console.log('Got following aspects', aspects);
				var aspect = aspects[0];
				var pipe = aspects.slice(1);
				if(pipe.length){
					pipe = pipe.map(get_params);
				}
				
				const make_resp = !pipe.length ? make_resp1 : make_resp2.bind(null, pipe);
				const selector = matches[2];
				var all_subtree = false;
				var func, params;
				const setters = new Set(['visibility', 'css', 'display', 'setval', 'hasClass', 'hasAttr', 'html', 'setfocus', 'html']);
				const getters = new Set(['mousemove', 'keyup', 'focus', 'blur', 'getval', 'change', 'click', 'dblclick', 'getfocus', '', 'scrollPos', 'press', 'hasClass', 'enterText']);
                [aspect, params] = get_params(aspect);
				if(aspect[0] === '>'){
					all_subtree = true;
					aspect = aspect.substr(1);
				}
				//console.info('Aspect:', aspect, context, params, matches[2]);
				//if(context === null && setters.has(aspect)) context = 'setter';
				
				if(aspect === 'mousepressed'){
					var b = 'bbb';
					/*
					 *  @TODO!
					 Parser.parse_fexpr([func, [(a) => {
						if(!Firera.is_def(a)) return false;
						if(!selector) return a;
						if(selector === 'other') return a;
						a = raw(a);
						if(!a){
							return a;
						}
						return a.querySelectorAll(selector);
						/*var node = a.find(selector) @todo
								.filter(filter_attr_in_parents.bind(null, a));
					}, '-$real_el', '$html_skeleton_changes'], cellname], pool, Parser.get_random_name(), packages);*/
				}
				
				if(!setters.has(aspect) && !getters.has(aspect)){
					utils.error('Aspect "' + aspect + '" not found!');
					return;
				}
				if(context === 'setter' && !setters.has(aspect)){
					//utils.error('HTML setter ' + aspect + ' not found! In ' + matches[0]);
					return;
				}
				if(context !== 'setter' && setters.has(aspect)){
					//utils.error('Using HTML setter ' + aspect + ' not in setter context!');
					return;
				}
				
				switch(aspect){
					case 'getval':
						func = function(cb, vals, old_val){
							const onch = (el) => {
								const type = el.getAttribute('type');
								var val;
								if(type == 'checkbox'){
									val = el.checked;
								} else {
									val = el.value;
								}
								//console.log('CHange', el, val, selector);
								if(val !== old_val){
									make_resp(cb, val);
								}
								old_val = val;
							}
							const [$prev_el, $now_el] = vals;
							const prev_el = raw($prev_el);
							const el = raw($now_el);
							const onChange = function(e){
								if(!all_subtree && !filter_attr_in_path(e, el)){
									return;
								}
								onch(e.target);
							};
							const onKeyup = function(e){
								if(!all_subtree && !filter_attr_in_path(e, el)){
									return;
								}
								const elem = e.target;
								const type = elem.getAttribute('type');
								var val;
								if(type == 'checkbox'){
									return;
								} else {
									val = elem.value;
								}
								if(val !== old_val){
									make_resp(cb, val);
								}
								old_val = val;
							};
							//console.log('Assigning handlers for ', cellname, arguments, $now_el.find(selector));
							if(Firera.is_def($prev_el)){
								Gator(prev_el).off('keyup', selector);
								Gator(prev_el).off('change', selector);
							}
							if(Firera.is_def($now_el)){
								Gator(el).on('keyup', selector, onKeyup);
								Gator(el).on('change', selector, onChange);
							}
						}
					break;
					case 'click':
						if(selector === 'other'){
							func = function(cb, vals){
								if(!vals) return;
								var [$prev_el, $now_el] = vals;
								$prev_el = raw($prev_el);
								$now_el = raw($now_el);
								if(!Firera.is_def($now_el)) return;
								document.addEventListener('click', function(e){
									const ot = e.srcElement || e.originalTarget;
									const is_other = !($now_el.contains(ot));
									if(is_other){
										make_resp(cb, true);
									}
								});
							}
						} else {
							func = function(cb, vals){
								if(!vals) return;
								const [$prev_el, $now_el] = vals;
								if(!Firera.is_def($now_el)) return;
								const prev_el = raw($prev_el);
								const now_el = raw($now_el);
								//console.log('Assigning handlers for ', cellname, arguments, $now_el);
								if(prev_el && prev_el !== Firera.undef){
									Gator(prev_el).off('click');
								}
								if(!$now_el){
									utils.warn('Assigning handlers to nothing', $now_el);
								}
								if(!selector){
									now_el.addEventListener('click', function(e){
										make_resp(cb, e);
										if(e.originalEvent && e.originalEvent.target){
											trigger_event('click', document, e.originalEvent.target);
										}
										e.preventDefault();
									});
								} else {
									Gator(now_el).on('click', selector, function(e){
										if(!all_subtree && !filter_attr_in_path(e, now_el)){
											return;
										}
										make_resp(cb, e);
										if(e.originalEvent && e.originalEvent.target){
											trigger_event('click', document, e.originalEvent.target);
										}
										e.preventDefault();
										//return false;
									});
								}
							}
						}
					break;
					case 'keyup':
						func = function(cb, vals){
							if(!vals) return;
							const [$prev_el, $now_el] = vals;
							if(!Firera.is_def($now_el)) return;
							const prev_el = raw($prev_el);
							const now_el = raw($now_el);
							//console.log('Assigning handlers for ', cellname, arguments, $now_el);
							if(prev_el && prev_el !== Firera.undef){
								Gator(prev_el).off('keyup');
							}
							if(!$now_el){
								utils.warn('Assigning handlers to nothing', $now_el);
							}
							if(!selector){
								now_el.addEventListener('keyup', function(e){
									make_resp(cb, e.srcElement.value);
									if(e.originalEvent && e.originalEvent.target){
										trigger_event('click', document, e.originalEvent.target);
									}
									e.preventDefault();
								});
							} else {
								Gator(now_el).on('keyup', selector, function(e){
									if(!all_subtree && !filter_attr_in_path(e, now_el)){
										return;
									}
									make_resp(cb, e.srcElement.value);
									if(e.originalEvent && e.originalEvent.target){
										trigger_event('keyup', document, e.originalEvent.target);
									}
									e.preventDefault();
									//return false;
								});
							}
						}
					break;
					case 'dblclick':
					case 'change':
					case 'mousemove':
						func = get_handler(aspect, selector, all_subtree, make_resp);
					break;
					case 'focus':
						func = function(cb, vals){
							if(!vals) return;
							const [$prev_el, $now_el] = vals;
							if(!Firera.is_def($now_el)) return;
							if($prev_el){
								// @todo
							}
							const el = raw($now_el);
							Gator(el).on('focus', selector, (e) => {
								if(!all_subtree && !filter_attr_in_path(e, el)){
									return;
								}
								make_resp(cb, e);
								return false;
							});
						}
					break;
					case 'blur':
						func = function(cb, vals){
							if(!vals) return;
							const [$prev_el, $now_el] = vals;
							if(!Firera.is_def($now_el)) return;
							if($prev_el){
								// @todo
							}
							const el = raw($now_el);
							Gator(el).on('blur', selector, (e) => {
								if(!all_subtree && !filter_attr_in_path(e, el)){
									return;
								}
								make_resp(cb, e);
								return false;
							});
						}
					break;
					case '':
						func = function(cb, vals){
							if(!vals) return;
							const [$prev_el, $now_el] = vals;
							if(!Firera.is_def($now_el)) return;
							make_resp(cb, $now_el.querySelectorAll(selector));
						}
					break;
					case 'scrollPos':
						func = function(cb, vals){
							if(!vals) return;
							const [$prev_el, $now_el] = vals;
							if(!Firera.is_def($now_el)) return;
							if($prev_el){
								// @todo
							}
							const el = raw($now_el);
							const element = el.querySelector(selector);
							const [direction] = params;
							const mn = {'Y': 'scrollTop', 'X': 'scrollLeft'}[direction];
							element.addEventListener('scroll', function(e) {
								make_resp(cb, e.target[mn]);
							});
						}
					break;
					case 'press':
						func = function(cb, vals){
							var [prev_el, now_el] = vals;
							if(!Firera.is_def(now_el)) return;
							//console.log('Assigning handlers for ', cellname, arguments, $now_el);
							if(prev_el){
								//$prev_el.off('keyup', selector);
							}
							now_el = raw(now_el);
							const btn_map = {
								'13': 'Enter',
								'27': 'Esc',
								'38': 'Up',
								'40': 'Down',
								'37': 'Left',
								'39': 'Right',
							}
							var onkeyup = function(e){
								if(!all_subtree && !filter_attr_in_path(e, now_el)){
									return;
								}
								if(params.indexOf(btn_map[e.keyCode]) !== -1){
									make_resp(cb, e);
								}
							}
							if(selector){
								Gator(now_el).on('keyup', selector, onkeyup);
							} else {
								now_el.addEventListener('keyup', onkeyup);
							}
						}
					break;
					case 'hasClass':
						func = function($el, val){
							if(!Firera.is_def($el)) return;
							if(!Firera.is_def(val)){
								val = false;
							}
							$el = raw($el);
							const [classname] = params;
							toggle_class($el, classname, val);
						}
					break;
					case 'hasAttr':
						func = function($el, val){
							if(!Firera.is_def($el)) return;
							if(!Firera.is_def(val)){
								val = false;
							}
							$el = raw($el);
							if(!$el) return;
							const [attrname] = params;
							if(val){
								$el.setAttribute(attrname, true);
							} else {
								$el.removeAttribute(attrname);
							}
						}
					break;
					case 'enterText':
						func = function(cb, vals){
							const [$prev_el, $now_el] = vals;
							if(!$now_el) return;
							if($prev_el){
								//$prev_el.off('keyup', selector);
							}
							const el = raw($now_el);
							el.onkeyup = function(e) {
								if(e.target === el.querySelector(selector)){
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
						func = function(el, val){
							if(Firera.is_falsy(el)){
								return;
							}
							if(val === undefined){
								return;
							}
							el = raw(el);
							if(val){
								el.style.visibility = 'visible';
							} else {
								el.style.visibility = 'hidden';
							}
						}
					break;
					case 'css':
						var [property, unit] = params;
						if(unit){
							unit = unit.trim();
						}
						func = function(el, val){
							if(unit){
								val = val + unit;
							}
							if(el && el[0]){
								el[0].style[property] = val;
							}
						}
					break;
					case 'html':
						func = function(el, val){
							el = raw(el);
							if(Firera.is_falsy(el)){
								return;
							}
							if(el instanceof NodeList){
								for(let elem of el){
									elem.innerHTML = val;
								}
							} else {
								el.innerHTML = val;
							}
						}
					break;
					case 'setfocus':
						func = function(el, val){
							el = raw(el);
							el.focus();
						}
					break;
					case 'display':
						func = function(el, val){
							if(Firera.is_falsy(el) || (val === undefined)){
								return;
							}
							el = raw(el);
							if(Firera.is_falsy(el)){
								return;
							}
							if(val){
								el.style.display = 'block';
							} else {
								el.style.display = 'none';
							}
						}
					break;
					case 'setval':
						func = function(el, val){
							if(!Firera.is_def(el) || !Firera.is_def(val)){
								return;
							}
							for(let element of el){
								const type = element.getAttribute('type');
								switch(type){
									case 'radio':
										if(element.value == val){
											element.checked = true;
										} else {
											element.checked = false;
										}
									break;
									default: 
										element.value = val;
									break;
								}
							}
						}
					break;
					default:
						throw new Error('unknown HTML aspect: =' + aspect + '=');
					break;
				}
				if(context === 'setter'){
					return {
						'@random': [func, [(a) => {
							if(!Firera.is_def(a)) return false;
							if(!selector) return a;
							if(selector === 'other') return a;
							a = raw(a);
							if(!a){
								return a;
							}
							return a.querySelectorAll(selector);
							/*var node = a.find(selector) @todo
									.filter(filter_attr_in_parents.bind(null, a));*/
						}, '-$real_el', '$html_skeleton_changes'], cellname]};
				} else {
					return {
						[cellname]: ['asyncClosure', () => {
							var el;
							return (cb, val) => {
								var old_val;
								switch(aspect){
									case 'getval':
										const element = val.querySelector(selector);
										if(element){
											var type = element.getAttribute('type');
											var vl;
											if(type == 'checkbox'){
												vl = element.checked;
											} else if(type == 'radio') {
												const elements = val.querySelectorAll(selector);
												for(let el of elements){
													if(el.checked){
														vl = el.value;
														break;
													}
												}
											} else {
												vl = element.value;
											}
											old_val = vl;
											make_resp(cb, vl);
										}
									break;
									default:
									break;
								}
								func(cb, [el, val], old_val);
								el = val;
							}
						}, '-$real_el', '$html_skeleton_changes']
					};
				}
			}
		}
	}
}