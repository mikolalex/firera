
var _F = {};

var always = _F.always = (a) => {
	return () => a;
}

var init_if_empty = _F.init_if_empty = function(obj/*key, val, key1, val1, ... */) {
	for(let i  = 1; ;i = i + 2){
		var key = arguments[i];
		var val = arguments[i + 1];
		if(!key) break;

		if(obj[key] === undefined){
			obj[key] = val;
		}
		obj = obj[key];
	}
	return obj;
}


var throttle = _F.throttle = function(thunk, time){
	var is_throttled = false;
	var pending = false;
	return () => {
		if(!is_throttled){
			//console.log('run!');
			thunk();
			is_throttled = true;
			setTimeout(() => {
				is_throttled = false;
				if(pending){
					//console.log('run pending!');
					thunk();
					pending = false;
				}
			}, time);
		} else {
			//console.log('skip!');
			pending = true;
		}
	}
}

var log = _F.log = () => {};// console.log.bind(console);

var decorate = (fnc, msg) => {
	return function(){
		console.log("@", msg, arguments);
		return fnc.apply(null, arguments);
	}
}

var mk_logger = (a) => {
	return (b) => {
		console.log(a, b);
		return b;
	}
}

var group_by = _F.group_by =  (arr, prop_or_func) => {
	var res = {};
	for(let obj of arr){
		init_if_empty(res, prop_or_func instanceof Function ? prop_or_func(obj) : obj[prop_or_func], []).push(obj);
	}
	return res;
}

var frozen = _F.frozen =  (a) => JSON.parse(JSON.stringify(a));

var id = _F.id = (a) => a;
var ids = _F.ids = function(){
	return arguments;
}
var raw = _F.raw = function(a){
	if(a instanceof Node  || !a){
		return a;
	} else {
		return a[0];
	}
}
var arr_remove = _F.arr_remove = (arr, el) => {
	var pos = arr.indexOf(el);
	if(pos !== -1){
		arr.splice(pos, 1);
	}
}

var sh_copy = _F.sh_copy = (obj) => {
	var res = obj instanceof Array ? [] : {};
	for(var i in obj){
		if(obj.hasOwnProperty(i)){
			res[i] = obj[i];
		}
	}
	return res;
}

var arr_different = _F.arr_different = function(arr1, arr2, cb){
	for(var i in arr1){
		if(arr2[i] === undefined){
			cb(i);
		}
	}
}
var arr_common = _F.arr_common = function(arr1, arr2, cb){
	for(var i in arr1){
		if(arr2[i] !== undefined){
			cb(i);
		}
	}
}

var arr_deltas = _F.arr_deltas = (old_arr, new_arr) => {
	var new_ones = arr_diff(new_arr, old_arr);
	var remove_ones = arr_diff(old_arr, new_arr);
	var changed_ones = Arr.mapFilter(new_arr, (v, k) => {
		if(old_arr[k] !== v && old_arr[k] !== undefined){
			 return k;
		}
	})
	//console.log('CHANGED ONES', changed_ones);
	var deltas = [].concat(
		 new_ones.map((key) => ['add', key, new_arr[key]]),
		 remove_ones.map((key) => ['remove', key]),
		 changed_ones.map((key) => ['change', key, new_arr[key]])
	)
	return deltas;
}

var arr_fix_keys = _F.arr_fix_keys = (a) => {
	var fixed_arr = [];
	for(let i of a){
		if(i !== undefined){
			fixed_arr.push(i);
		}
	}
	return fixed_arr;
}

var arr_diff = _F.arr_diff = function(a, b){
	var diff = [];
	for(var i in a){
		if(!b[i]) diff.push(i);
	}
	return diff;
}

var second = _F.second = (__, a) => a;

var ind = _F.ind = (i) => {
	return (arr) => {
		return arr[i];
	}
}

var path_cellname = _F.path_cellname = (a) => a.split('/').pop();

var is_special = _F.is_special = (a) => {
	return ((a.indexOf('/') !== -1) || (a.indexOf('|') !== -1) || a === '*' || a[0] === '$'); 
}
var bms = {};
window.bm = {
	start: (branch, tag, id) => {
		init_if_empty(bms, branch, {}, tag, {sum: 0}, 'ids', {}, id, performance.now());
	},
	stop: (branch, tag, id) => {
		bms[branch][tag].ids[id] = performance.now() - bms[branch][tag].ids[id];
	},
	report: function(logger = false){
		if(!logger){
			logger = console.log.bind(console);
		}
		for(let b in bms){
			var branch = bms[b];
			var branch_sum = 0;
			for(let t in branch){
				var tag = branch[t];
				for(var tt in tag.ids){
					var time = tag.ids[tt];
					tag.sum += time;
				}
				branch_sum += tag.sum;
			}
			for(let t in branch){
				var tag = branch[t];
				tag.perc = 100*(tag.sum/branch_sum);
				console.log(t, 'tag sum', tag.sum, 'branch sum', branch_sum, '%', tag.perc);
			}
		}
		console.log(bms);
	}
}

var Obj = _F.Obj = {
	map: function(obj, func, conf){
		var res = {};
		var exceptions = conf ? conf.except : false;
		for(let key in obj){
			if(exceptions && exceptions.indexOf(key) !== -1){
				continue;
			}
			res[key] = func(obj[key], key);
		}
		return res;
	},
	each: function(obj, func){
		for(var key in obj){
			if(func(obj[key], key) === false){
				break;
			}
		}
	},
	join: function(obj, glue){
		var res = [];
		for(var key in obj){
			res.push(obj[key]);
		}
		return res.join(glue);
	},
	eachKey: function(obj, func){
		for(var key in obj){
			if(func(key) === false){
				break;
			}
		}
	}
}

var Arr = _F.Arr = {
	mapFilter: function(obj, func){
		var res = [];
		for(var key in obj){
			var a;
			if((a = func(obj[key], key)) !== undefined){
				res.push(a);
			}
		}
		return res;
	},
	unique: function(arr) {
        var a = arr.concat();
        for(var i=0; i<a.length; ++i) {
            for(var j=i+1; j<a.length; ++j) {
                if(a[i] === a[j])
                    a.splice(j--, 1);
            }
        }
        return a;
    },
	realLength: (a) => Object.keys(a).length,
}

var toLowerCase = (a) => a.toLowerCase();

_F.split_camelcase = (str) => {
	if(!str.match) return false;
	var first = str.match(/^([a-z0-9]*)/);
	var others = (str.match(/[A-Z][a-z0-9]*/g) || []).map(toLowerCase);
	return [first[1], ...others];
}
_F.warn = function(){
	if(global.firera_debug_mode !== 'off'){
		console.warn.apply(console, arguments);
	}
}
_F.error = (str) => {
	if(global.firera_debug_mode !== 'off'){
		console.error(str);
	}
}

var copy = _F.copy = function(from, to){
	for(var i in from){
		to.push(from[i]);
	}
}
var kcopy = _F.kcopy = function(from, to){
	for(let i in from){
		to[i] = from[i];
	}
}
var last = _F.last = function(arr){
	return arr[arr.length - 1];
}
module.exports = _F;