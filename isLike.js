(function(){
    this.isLike = function(){
	var args = Array.prototype.slice.call(arguments);
	var init_arrays = {};
	var constructor = function(){};
	var Mixture = function(){
	    for(var i in init_arrays){
		this[i] = init_arrays[i].slice();
	    }
	    constructor.apply(this, arguments);
	};
	var proto = {};
	var create_callable = function(func){
	    return function(){
		var self = function (){
		    func.apply(self, arguments);
		}
		for(var i in init_arrays){
		    self[i] = init_arrays[i].slice();
		}
		for(var i in proto){
		    self[i] = proto[i];
		}
		constructor.apply(self, arguments);
		return self;
	    }
	};
	proto.__get_init_arrays = function(){
	    return init_arrays;
	}
	proto.__get_constructor = function(){
	    return constructor;
	}
	for(var i = 0; i< args.length;i++){
	    if(args[i] instanceof Function){
		var prot = args[i].prototype;
		for(var j in prot){
		    if(j === '__get_constructor' || j === '__get_init_arrays') continue;
		    if(j === '__call'){
			Mixture = create_callable(prot[j]);
		    }
		    proto[j] = prot[j];
		}
		if(prot.__get_init_arrays){
		    var new_init_arrays = prot.__get_init_arrays();
		    for(var f in new_init_arrays){
			init_arrays[f] = new_init_arrays[f];
		    }
		}
		prot.__get_constructor && (constructor = prot.__get_constructor());
	    } else {
		if(args[i] instanceof Object){
		    var obj = args[i];
		    for(var j in obj){
			if(j === '__init'){
			    constructor = obj[j];
			    continue;
			}
			if(j === '__call'){
			    proto.__call = obj[j];
			    Mixture = create_callable(obj[j]);
			    continue;
			}
			if(j === '__static'){
			    for(var f in obj[j]){
				proto[f] = obj[j][f];
			    }
			    continue;
			}
			if(!(obj[j] instanceof Array)){//
			    proto[j] = obj[j];
			} else {
			    init_arrays[j] = obj[j];
			}
		    }
		}
	    }
	}
	proto.constructor = Mixture;
	Mixture.prototype = proto;
	return Mixture;
    }
})();