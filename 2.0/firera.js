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
                if(func(key) === false){
                    break;
                }
            }
        }
    });

    function copy(from, to){
        for(var i of from){
            to.push(i);
        }
    }
    function kcopy(from, to){
        for(let i in from){
            to[i] = from[i];
        }
    }
    var cell_listening_type = function(str){
        var m = str.match(/^(\:|\-)/);
        return [{
            //':': 'change', 
            '-': 'passive', 
            'val': 'normal'
        }[m ? m[1] : 'val'], str.replace(/^(\:|\-)/, '')];
    }
    var get_real_cell_name = function(str){
        return cell_listening_type(str)[1];
    }

    var cellMatchers = [];


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
        console.log('________________________________________________________');
        console.log('CREATING HASH', parsed_pb);
        // creating cell values obj
        this.cell_types = parsed_pb.cell_types;
        // for "closure" cell type
        this.cell_funcs = {};
        this.dirtyCounter = {};
        this.cell_values = Object.create(parsed_pb.pbs.$free || {});
        this.set(parsed_pb.pbs.$free);
        //console.log('result', this.cell_values);
    }

    Hash.prototype.doRecursive = function(func, cell, skip, parent_cell){
        var cb = this.doRecursive.bind(this, func);
        //console.log('children', cell, this.cell_children(cell));
        if(!skip) {
            func(cell, parent_cell);
        } else {
            //throw new Error('Skipping!', arguments);
        }
        this.cell_children(cell).eachKey((child_cell_name) => {
            this.doRecursive(func, child_cell_name, false, cell);
        });
    }

    Hash.prototype.compute = function(cell, parent_cell_name){
        var [listening_type, real_cell_name] = cell_listening_type(cell);
        //console.log('Computing', real_cell_name);
        switch(this.cell_type(real_cell_name)){
            case 'free':
                // really do nothing
            break;
            case 'is':
                var args = this.cell_parents(real_cell_name).map((parent_cell_name) => this.cell_value(get_real_cell_name(parent_cell_name)));
                //console.log('Computing args', args);
                var val = this.cell_func(real_cell_name).apply(null, args);
                //console.log('computing', cell, args, val);
                this.set_cell_value(real_cell_name, val);
            break;
            case 'async':
                var args = this.cell_parents(real_cell_name).map((parent_cell_name) => this.cell_value(get_real_cell_name(parent_cell_name)));
                args.unshift((val) => {
                    //console.log('ASYNC callback called!',val); 
                    this.set_cell_value(real_cell_name, val);
                    this.doRecursive(this.compute.bind(this), real_cell_name, true);
                });
                //console.log('Computing ASYNC args', args);
                var val = this.cell_func(real_cell_name).apply(null, args);
                //console.log('computing', cell, args, val);
                this.set_cell_value(real_cell_name, val);
            break;
            case 'closure':
                var args = this.cell_parents(real_cell_name).map((parent_cell_name) => this.cell_value(get_real_cell_name(parent_cell_name)));
                //console.log('Checking whether closure func already exists', this.cell_funcs[real_cell_name], real_cell_name);
                if(!this.cell_funcs[real_cell_name]){
                    var new_func = this.cell_func(real_cell_name)();
                    //console.log('Setting closure function', new_func);
                    this.cell_funcs[real_cell_name] = new_func;
                }
                var val = this.cell_funcs[real_cell_name].apply(null, args);
                //console.log('computing', cell, args, val);
                this.set_cell_value(real_cell_name, val);
            break;
            case 'map':
                if(!parent_cell_name){
                    throw new Error('Cannot calculate map cell value - no parent cell name provided!');
                }
                var func = this.cell_func(real_cell_name);
                if(!func[parent_cell_name]){
                    throw new Error('Cannot compute MAP cell: parent cell func undefined!');
                }
                this.set_cell_value(real_cell_name, func[parent_cell_name](this.cell_value(get_real_cell_name(parent_cell_name))));
            break;
            default:
                throw new Error('Unknown cell type:' + this.cell_type(real_cell_name));
            break;
        }
    }

    Hash.prototype.set = function(cell, val){
        if(cell instanceof Object){
            // batch update
            //console.log('Computing batch update', cell);
            cell.eachKey(this.doRecursive.bind(this, (cell) => {
                this.dirtyCounter[cell] 
                    ? this.dirtyCounter[cell]++ 
                    : (this.dirtyCounter[cell] = 1);
            }));
            //console.log('dirty counter', this.dirtyCounter);
            cell.eachKey(this.doRecursive.bind(this, (cell, parent_cell_name) => {
                if(--this.dirtyCounter[cell] === 0){
                    //console.log('Computing after batch change', cell);
                    this.compute(cell, parent_cell_name);
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
        var a;
        if(a = this.cell_types[cell].func) {
            return a;
        } else {
            throw new Error('Cannot find cell func for cell '+cell);
        }
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

    var system_predicates = new Set(['is', 'async', 'closure', 'funnel', 'map']);

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
    var set_listening_type = function(cell, type){
        return {
            //'change': ':', 
            'passive': '-', 
            'normal': ''
        }[type] + cell;
    }

    var parse_cellname = function(cellname, pool){
        for(var m of cellMatchers){
            var matches = cellname.match(m.regexp);
            if(matches){
                m.func(matches, pool);
                return;
            }
        }
    }

    var parse_fexpr = function(a, pool, key){
        var funcstring;
        if(a instanceof Object){
            if(a instanceof Array){
                var funcname = a[0];
                if(funcname instanceof Function || system_predicates.has(funcname)){
                    funcstring = a; // it's "is" or something similar
                } else {
                    if(predefined_functions[funcname]){
                        var fnc = predefined_functions[funcname];
                        switch(fnc.type){
                            case 'func':
                                funcstring = ['is', fnc.func].concat(a.slice(1))
                            break;

                        }
                    } else {
                        console.log('Error', arguments);
                        throw new Error('Cannot find predicate: ' + funcname);
                    }
                }
            } else {
                // it's object
                funcstring = ['map', a].concat(Object.keys(a));
                //console.log('Parsing MAP fexpr', a, ' -> ', funcstring);
            }
        } else {
            throw new Error('Cannot parse primitive value as fexpr: ' + a);
        }
        //console.log('Funcstring', funcstring);
        for(var k in funcstring){
            var cellname = funcstring[k];
            if(k < 2 || typeof(cellname) !== 'string') continue;
            parse_cellname(cellname, pool);
        }
        //console.log('Got funcstring', funcstring);
        pool[key] = funcstring;
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
            //console.log('pbsi', pbs, i);
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
                if(listening_type !== 'passive'){
                    init_if_empty(children, parent_cell_name, {});
                    children[parent_cell_name][set_listening_type(i, listening_type)] = true;
                } else {
                    console.info('Omit setting', i, 'as child for', parent_cell_name, ' - its passive!');
                }
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
                parse_fexpr(pb[key], res, key);
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
                //console.log('GOT pbs', pbs);
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
        },
        loadPackage: function(pack) {
            copy(pack.cellMatchers, cellMatchers);
        }
    }

    window.Firera = Firera;

    var core = {
        cellMatchers: [
            {
                // ^foo -> previous values of 'foo'
                regexp: new RegExp('^(\-|\:)?\\^(.*)', 'i'),
                func: function(matches, pool){
                    var cellname = matches[2];
                    parse_fexpr(['closure', function(){
                            var val;
                            //console.log('Returning closure func!');
                            return function(a){
                                //console.log('getting prev val');
                                var old_val = val;
                                val = a;
                                return [old_val, a];
                            }
                    }, cellname], pool, '^' + cellname);
                }
            }
        ]
    }


    Firera.loadPackage(core);
    Firera.func_test_export = {parse_pb, parse_fexpr};
})()