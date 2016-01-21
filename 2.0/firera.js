(function(){
    'use strict';
    var apps = [];
    var App = function(){}
    App.prototype.get = function(cell){

    }

    var Hash = function(parsed_pb){
        console.log('CREATING HASH');
    }

    var system_predicates = new Set(['is']);

    var predefined_functions = {
        '+': {
            type: 'func', 
            func: function(a, b){ return a+b;}
        }
    }

    var get_app = function(){
        var app = new App;
        apps.push(app);
        return app;
    }

    var init_if_empty = function(obj, key, val) {
        if(obj[key] === undefined){
            obj[key] = val;
        }
    }

    Object.defineProperty(Object.prototype, 'map', {
        enumerable: false,
        value: function(func){
            var res = {};
            var self = this;
            for(let key in self){
                res[key] = func(this[key], key);
            }
            return res;
        }
    });

    var parse_fexpr = function(a){
        if(a instanceof Object){
            if(a instanceof Array){
                var funcname = a[0];
                if(funcname instanceof Function || system_predicates.has(funcname)){
                    return a; // it's "is" or something similar
                } else {
                    if(predefined_functions[funcname]){
                        var fnc = predefined_functions[funcname];
                        switch(fnc.type){
                            case 'func':
                                return [fnc.func].concat(a.slice(1))
                            break;

                        }
                    } else {
                        throw new Exception('Cannot find predicate: ' + funcname);
                    }
                }
            }
        } else {
            throw new Exception('Cannot parse primitive value as fexpr: ' + a);
        }
    }

    var get_cell_type = function(type, func, parents){
        return {type, func, parents: parents || [], children: []}
    }

    var parse_cell_types = function(pbs){
        var res = {};
        var children = {};
        for(var i in pbs){
            let type = 'free';
            if(i === '$free'){
                for(var j in pbs[i]){
                    res[j] = get_cell_type(type);
                }
                continue;
            }
            var func = pbs[i][0];
            var parents = pbs[i].slice(1);
            if(func instanceof Function){
                // regular sync cell
                type = 'val';
            } else {
                // may be 'async', 'changes' or something else
            }
            res[i] = get_cell_type('val', func, parents);
            for(var j in parents){
                init_if_empty(children, parents[j], {});
                children[parents[j]][i] = true;
            }
        }
        for(var i in children){
            res[i].children = children[i];
        }
        console.log('res', res);
        return res;
    }

    var parse_pb = function(pb){
        var res = {};
        for(var key in pb) {
            if(pb[key] instanceof Object) {
                // Array or Object
                res[key] = parse_fexpr(pb[key]);
            } else {
                // primitive value
                init_if_empty(res, '$free', {});
                res.$free[key] = pb[key];
            }
        }
        return res;
    }
    
    var Firera = {
        run: function(config){
            var app = get_app();
            // getting real pbs
            app.cbs = config.map(function(pb){
                var pbs = parse_pb(pb);
                var cell_types = parse_cell_types(pbs);
                return {pbs, cell_types};
            });
            // now we should instantiate each pb
            if(!app.cbs.__root){
                // no root hash
                throw new Error('Cant find root app!', app);
            }
            console.log(app);
            app.root = new Hash(app.cbs.__root);
            return app;
        }
    }

    window.Firera = Firera;
    Firera.func_test_export = {parse_pb, parse_fexpr};
})()