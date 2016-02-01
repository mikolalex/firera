(function(){
    'use strict';

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
    Object.defineProperty(Object.prototype, 'each', {
        enumerable: false,
        value: function(func){
            for(var key in this){
                if(func(this[key], key) === false){
                    break;
                }
            }
        }
    });
    Object.defineProperty(Object.prototype, 'eachKey', {
        enumerable: false,
        value: function(func){
            for(var key in this){
                if(func(key, this[key]) === false){
                    break;
                }
            }
        }
    });


    var apps = [];
    var App = function(){};
    var noop = function(){
        console.log('Noop is called!');
    };
    App.prototype.get = function(cell){
        return this.root.cell_value(cell);
    }
    App.prototype.set = function(cell, val){
        this.root.set(cell, val);
    }

    var Hash = function(parsed_pb){
        console.log('CREATING HASH', parsed_pb);
        // creating cell values obj
        this.cell_types = parsed_pb.cell_types;
        this.dirtyCounter = {};
        this.cell_values = Object.create(parsed_pb.pbs.$free || {});
        this.set(parsed_pb.pbs.$free);
        //console.log('result', this.cell_values);
    }

    Hash.prototype.doRecursive = function(func, cell){
        var cb = this.doRecursive.bind(this, func);
        //console.log('children', cell, this.cell_children(cell));
        func(cell);
        this.cell_children(cell).eachKey(cb);
    }

    Hash.prototype.compute = function(cell){
        switch(this.cell_type(cell)){
            case 'free':
                // really do nothing
            break;
            case 'val':
                var args = this.cell_parents(cell).map((key) => this.cell_value(key));
                var val = this.cell_func(cell).apply(null, args);
                //console.log('computing', cell, args, val);
                this.set_cell_value(cell, val);
            break;
        }
    }

    Hash.prototype.set = function(cell, val){
        if(cell instanceof Object){
            // batch update
            cell.eachKey(this.doRecursive.bind(this, (cell) => {
                this.dirtyCounter[cell] 
                    ? this.dirtyCounter[cell]++ 
                    : (this.dirtyCounter[cell] = 1);
            }));
            //console.log('dirty counter', this.dirtyCounter);
            cell.eachKey(this.doRecursive.bind(this, (cell) => {
                if(--this.dirtyCounter[cell] === 0){
                    this.compute(cell);
                } else {
                    //console.log('Cell ', cell, 'is not ready', this.dirtyCounter);
                }
            }));
        } else {
            if(!this.cell_type(cell) === 'free'){
                throw Exception('Cannot set dependent cell!');
            }
            this.set_cell_value(cell, val);
            this.doRecursive(this.compute.bind(this), cell);
            //console.log('Cell values after set', this.cell_values);
        }
    }
    Hash.prototype.cell_parents = function(cell){
        return this.cell_types[cell] ? this.cell_types[cell].parents : [];
    }
    Hash.prototype.cell_children = function(cell){
        return this.cell_types[cell] ? this.cell_types[cell].children : [];
    }
    Hash.prototype.cell_func = function(cell){
        return this.cell_types[cell] ? this.cell_types[cell].func : noop;
    }
    Hash.prototype.cell_type = function(cell){
        return this.cell_types[cell] ? this.cell_types[cell].type : [];
    }
    Hash.prototype.cell_value = function(cell){
        //console.log('Getting cell value', cell, this.cell_values, this.cell_values[cell]);
        return this.cell_values[cell];
    }
    Hash.prototype.set_cell_value = function(cell, val){
        this.cell_values[cell] = val;
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
        //console.log('res', res);
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
            //console.log(app);
            app.root = new Hash(app.cbs.__root);
            return app;
        }
    }

    window.Firera = Firera;
    Firera.func_test_export = {parse_pb, parse_fexpr};
})()