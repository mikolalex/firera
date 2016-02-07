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
        this.prev_cell_values = {};
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
        var [listening_type, real_cell_name] = cell_listening_type(cell);
        //  console.log('Computing', real_cell_name);
        switch(this.cell_type(real_cell_name)){
            case 'free':
                // really do nothing
            break;
            case 'val':
                var args = this.cell_parents(real_cell_name).map((key) => this.cell_value(cell_listening_type(key)[1]));
                //console.log('Computing args', args);
                var val = this.cell_func(real_cell_name).apply(null, args);
                //console.log('computing', cell, args, val);
                this.set_cell_value(real_cell_name, val);
            break;
            case 'async':
                var args = this.cell_parents(real_cell_name).map((key) => this.cell_value(cell_listening_type(key)[1]));
                args.unshift(this.set.bind(this, real_cell_name));
                //console.log('Computing ASYNC args', args);
                var val = this.cell_func(real_cell_name).apply(null, args);
                //console.log('computing', cell, args, val);
                this.set_cell_value(real_cell_name, val);
            break;
            default:
                throw new Error('Unknown cell type:', this.cell_type(real_cell_name));
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
        this.prev_cell_values[cell] = this.cell_values[cell];
        this.cell_values[cell] = val;
    }

    var system_predicates = new Set(['is', 'async']);

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

    var cell_listening_type = function(str){
        var m = str.match(/^(\:|\-)/);
        return [{':': 'change', '-': 'passive', 'val': 'normal'}[m ? m[1] : 'val'], str.replace(/^(\:|\-)/, '')];
    }
    var set_listening_type = function(cell, type){
        return {'change': ':', 'passive': '-', 'normal': ''}[type] + cell;
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
                        throw new Error('Cannot find predicate: ' + funcname);
                    }
                }
            }
        } else {
            throw new Error('Cannot parse primitive value as fexpr: ' + a);
        }
    }

    var get_cell_type = function(type, func, parents){
        //console.log('getting cell type', arguments);
        return {type, func, parents: parents || [], children: []}
    }

    var parse_cell_types = function(pbs){
        var res = {};
        var children = {};
        //console.log('PBS', pbs);
        for(let i in pbs){
            let type = 'free';
            if(i === '$free'){
                //console.log('parsing free variables', pbs[i]);
                for(var j in pbs[i]){
                    res[j] = get_cell_type(type);
                }
                //console.log('now res j looks like', res);
                continue;
            }
            //console.log('pbsi', pbs[i]);
            var func = pbs[i][0];
            var parents = pbs[i].slice(1);
            if(func instanceof Function){
                // regular sync cell
                type = 'val';
            } else {
                // may be 'async', 'changes' or something else
                type = func;
                func = parents.shift();
            }
            res[i] = get_cell_type(type, func, parents);
            for(var j in parents){
                var [listening_type, parent_cell_name] = cell_listening_type(parents[j]);
                //console.log('real cell name:', parents[j], '->', parent_cell_name, listening_type);
                init_if_empty(children, parent_cell_name, {});
                children[parent_cell_name][set_listening_type(i, listening_type)] = true;
            }
        }
        for(let i in children){
            //console.log('resi', res, children, i);
            res[i].children = children[i];
        }
        //console.log('Parsed cell types', res);
        return res;
    }

    var parse_pb = function(pb){
        var res = {};
        //console.log('--- PARSING PB', pb);
        for(var key in pb) {
            if(key === '$free'){
                init_if_empty(res, '$free', {});
                pb[key].each((val, key) => { res['$free'][key] = val; });
                continue;
            }
            if(pb[key] instanceof Object) {
                // Array or Object
                res[key] = parse_fexpr(pb[key]);
            } else {
                // primitive value
                //console.log('hereby', res);
                init_if_empty(res, '$free', {});
                res.$free[key] = pb[key];
            }
        }
        //console.log('--- PARSED PB', res);
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