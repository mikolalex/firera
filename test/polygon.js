var assert = {equal: (a, b) => {
		console.log('assert equal', a, '=to=', b);
}};
var qsa = document.querySelectorAll.bind(document);
var qs = document.querySelector.bind(document);

var id = a => a;
var not = a => !a;
var always = function(a){ 
	return function(){
		return a;
	}
}


var ttimer_pool = {};
var ttimer = {
		start: function(key){
				if(!ttimer_pool[key]){
						ttimer_pool[key] = {
								sum: 0,
						}
				}
				ttimer_pool[key].current = performance.now();
		},
		stop: function(key){
				ttimer_pool[key].sum += performance.now() - ttimer_pool[key].current;
		},
}

var decorate = (fnc, msg) => {
	return function(){
		console.log("@", msg, arguments);
		return fnc.apply(null, arguments);
	}
}

(function(){
	window.performance = window.performance || {};
	performance.now = (function() {
	  return performance.now       ||
			 performance.mozNow    ||
			 performance.msNow     ||
			 performance.oNow      ||
			 performance.webkitNow ||
			 function() { return new Date().getTime(); };
	})();
	var pool = {};
	var Timer = function(name){
		this.name = name;
		this.start = performance.now();
		this.time = 0;
	};

	Timer.prototype.pause = function(){
		if(this.paused){
			//console.log('already paused!');
		}
		var end  = performance.now();
		this.time = this.time + (end - this.start);
		this.paused = true;
	}
	Timer.prototype.resume = function(){
		if(!this.paused){
			//console.log('IS NOT paused!');
		}
		this.start = performance.now();
		this.paused = false;
	}
	Timer.prototype.stop = function(){
		if(!this.paused){
			var end  = performance.now();
			this.time = this.time + (end - this.start);
		}
		this.stopped = true;
		console.log(this.name, 'took', this.time, 'ms');
		delete pool[this.name];
	}

	window.timer = function(name) {
		if(name == 'stop_all'){
			for(var i in pool){
				pool[i].stop();
				delete pool[i];
			}
			return;
		}
		if(!pool[name] || (pool[name].stopped == true)){
			//console.log('creating new timer', name);
			pool[name] = new Timer(name);
		}
		return pool[name];
	};
})()

var prop = (key) => {
	return (a) => {
		return a instanceof Object ? a[key] : undefined;
	}
}
var adder = (a) => {
	return (b) => {
		return b+a;
	}
}
var second = (__, a) => a;

var as = (propName, defValues = {}) => {
	return (val) => {
		if(val === undefined) return;
		var obj = {};
		obj[propName] = val;
		return Object.assign(obj, defValues);
	}
}

var ind = function(index = 0){
	return (arr) => {
		return arr instanceof Object ? arr[index] : null;
	}
}

window.triggerEnter = (el) => {
	var e = $.Event("keyup");
	e.which = 13; //choose the one you want
	e.keyCode = 13;
	el.trigger(e);
}

var fromMap = function(map, def){
	return (val) => {
		return (map[val] !== undefined) ? map[val] : def;
	}
}

function toggle_checkbox(el){
	if(el instanceof $){
		if(!el.length) return;
		for(let element of el){
			toggle_checkbox(element);
		}
		return;
	}
	if(el instanceof NodeList){
		for(let ecl of el){
			toggle_checkbox(ecl);
		}
		return;
	}
	if(el.hasAttribute('checked')){
		el.removeAttribute('checked');
	} else {
		el.setAttribute('checked', true);
	}
}

function trigger_event(name, element){
	var event; // The custom event that will be created
	if(element instanceof $){

		return;
	}
	if(element instanceof NodeList){
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

	if (document.createEvent) {
		element.dispatchEvent(event);
	} else {
		element.fireEvent("on" + event.eventType, event);
	}
}

var trigger_click = trigger_event.bind(null, 'click');
var raw = a => a[0];
