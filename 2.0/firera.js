(function(){
    'use strict';
    /* @todo
     створювати інстанси Firera.app, додавати домішки до них, запускати і стопати їх.
     Firera() просто запускає передане їй як апп.
    */
    var log = console.log.bind(console);

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
    App.prototype.get = function(cell, path){
        return this.root.get(cell, path);
    }
    App.prototype.set = function(cell, val, child){
        this.root.set(cell, val, child);
    }
    App.prototype.parse_cbs = (a) => {
        var mxn = Firera.eachHashMixin;
        var eachMixin = Object.assign({}, mxn);
        var res = {
            plain_base: Object.assign(eachMixin, a), 
            cell_links: {},
            side_effects: {},
            hashes_to_link: {}
        }
        parse_pb(res);
        init_if_empty(res.plain_base, '$free', {}, '$name', null);
        //res.plain_base.$free['$name'] = null;
        res.cell_types = parse_cell_types(res.plain_base);
        return res;
    }
    
    var show_performance = function(){
        var res = [];
        for(var i = 1; i < arguments.length; ++i){
            res.push(i + ': ' + (arguments[i] - arguments[i - 1]).toFixed(3));
        }
        res.push('Total: ' + (arguments[i - 1] - arguments[0]).toFixed(3));
        return res.join(', ');
    }

    var Hash = function(app, parsed_pb_name, name){
        ////////////////////////////////////////////////////////////////////////
        var t0 = performance.now();
        ////////////////////////////////////////////////////////////////////////
        this.app = app;
        this.name = name || 'root';
        var parsed_pb = typeof parsed_pb_name === 'string' 
                        ? app.cbs[parsed_pb_name]
                        : app.parse_cbs(parsed_pb_name);
        //console.log('________________________________________________________');
        //console.log('CREATING HASH ' + parsed_pb_name, parsed_pb);
        // creating cell values obj
        this.cell_types = parsed_pb.cell_types;
        this.cell_links = parsed_pb.cell_links;
        this.side_effects = parsed_pb.side_effects;
        this.hashes_to_link = parsed_pb.hashes_to_link;
        this.linked_hashes = {};
        // for "closure" cell type
        this.cell_funcs = {};
        this.dirtyCounter = {};
        this.dynamic_cell_links = {};
        if(parsed_pb.cell_types['*']){
            var omit_list = this.all_cell_children('*');
            for(let cell in this.cell_types){
                if(omit_list.indexOf(cell) === -1 && cell !== '*'){
                    init_if_empty(this.dynamic_cell_links, cell, {}, '__self', []);
                    this.dynamic_cell_links[cell].__self.push({
                        cell_name: '*',
                        type: ''
                    });
                }
            }
            //console.log('Now dynamic links look like', this.dynamic_cell_links);
        }
        this.cell_values = Object.create(parsed_pb.plain_base.$free || {});
        this.hashes_to_link.each((hash_name, link_as) => this.linkChild(hash_name, link_as));
        ////////////////////////////////////////////////////////////////////////
        var t1 = performance.now();
        ////////////////////////////////////////////////////////////////////////
        // @todo: refactor, make this set in one step
        if(parsed_pb.plain_base.$free){
            this.set(parsed_pb.plain_base.$free);
        }
        ////////////////////////////////////////////////////////////////////////
        var t2 = performance.now();
        ////////////////////////////////////////////////////////////////////////
        if(parsed_pb.default_values){
            //console.log('Setting DEFAULT values', parsed_pb.default_values);
            parsed_pb.default_values.each((val, cell) => this.force_set(cell, val));
        }
        ////////////////////////////////////////////////////////////////////////
        var t3 = performance.now();
        ////////////////////////////////////////////////////////////////////////
        //console.log('Initings hash: ', show_performance(t0, t1, t2, t3));
    }

    Hash.prototype.linkChild = function(type, link_as){
        if(this.linked_hashes[link_as]){
            this.unlinkChild(link_as);
        }
        var child = new Hash(this.app, type, link_as);
        child.force_set('$name', link_as);
        this.linked_hashes[link_as] = child;
        child.linked_hashes['..'] = this;
        this.linkCells(link_as, '..');
        child.linkCells('..', link_as);
        //console.info('Successfully linked ', type, 'as', link_as);
    }
    Hash.prototype.unlinkChild = function(link_as){
        var child = this.linked_hashes[link_as];
        this.unlinkCells(link_as);
        child.unlinkCells('..');
        delete this.linked_hashes[link_as];
        //console.info('Successfully linked ', type, 'as', link_as);
    }

    Hash.prototype.linkTwoCells = function(parent_cell, child_cell, hash_name, my_name_for_that_hash, type = 'val'){
        var other_hash = this.linked_hashes[hash_name];
        var pool = other_hash.dynamic_cell_links;
        init_if_empty(pool, parent_cell, {});
        init_if_empty(pool[parent_cell], my_name_for_that_hash, []);
        pool[parent_cell][my_name_for_that_hash].push({
            cell_name: child_cell,
            type: type
        });
        this.set(child_cell, this.linked_hashes[hash_name].cell_value(parent_cell));
    }
    Hash.prototype.unlinkTwoCells = function(parent_cell, child_cell, hash_name, my_name_for_that_hash){
        var other_hash = this.linked_hashes[hash_name];
        var pool = other_hash.dynamic_cell_links;
        pool[parent_cell][my_name_for_that_hash].forEach((lnk, key) => {
            //console.log('Searching links...', lnk, child_cell);
            if(lnk.cell_name === child_cell){
                delete pool[parent_cell][my_name_for_that_hash][key];
                //console.log('Deleting', child_cell);
            }
        });
        // ? maybe this.set(child_cell, undefined);
    }

    Hash.prototype.linkCells = function(hash_name, my_name_for_that_hash){
        var links;
        if(links = this.cell_links[hash_name]){
            links.each((parent_cell, child_cell) => { 
                this.linkTwoCells(parent_cell, child_cell, hash_name, my_name_for_that_hash); 
            });
        }
        if(links = this.cell_links['*']){
            links.each((parent_cell, child_cell) => { 
                this.linkTwoCells(parent_cell, child_cell, hash_name, my_name_for_that_hash, 'val_and_hashname'); 
            });
        }
    }
    Hash.prototype.unlinkCells = function(hash_name){
        this.dynamic_cell_links.each((hashes) => {
            delete hashes[hash_name];
        })
    }

    Hash.prototype.doRecursive = function(func, cell, skip, parent_cell, already_counted_cells = {}, run_async){
        var cb = this.doRecursive.bind(this, func);
        //console.log('children', cell, this.cell_children(cell));
        if(!skip) {
            //console.log('--Computing cell', this.cell_type(cell));
            func(cell, parent_cell);
            already_counted_cells[cell] = true;
        } else {
            //throw new Error('Skipping!', arguments);
        }
        if(this.cell_type(cell) === 'async' && !run_async) {
            //console.log('Skipping counting children of async');
            return;
        }
        this.cell_children(cell).eachKey((child_cell_name) => {
            if(!already_counted_cells[child_cell_name]){
                already_counted_cells[child_cell_name] = true,
                this.doRecursive(func, child_cell_name, false, cell, Object.create(already_counted_cells));
            } else {
                //console.error('Circular dependency found!', child_cell_name, already_counted_cells, this);
            }
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
                    this.doRecursive(this.compute.bind(this), real_cell_name, true, null, {}, true);
                });
                //console.log('Computing ASYNC args', args);
                var val = this.cell_func(real_cell_name).apply(null, args);
                //console.log('computing', cell, args, val);
                this.set_cell_value(real_cell_name, val);
            break;
            case 'nested':
                var args = this.cell_parents(real_cell_name).map((parent_cell_name) => this.cell_value(get_real_cell_name(parent_cell_name)));
                args.unshift((cell, val) => {
                    //console.log('NESTED callback called!', cell, val, real_cell_name); 
                    var cell_to_update = real_cell_name + '.' + cell;
                    this.set_cell_value(cell_to_update, val);
                    this.doRecursive(this.compute.bind(this), cell_to_update, true);
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
                    throw new Error('Cannot compute MAP cell: parent cell func undefined or not function!');
                }
                //debugger;
                var new_val = func[parent_cell_name] instanceof Function 
                              ? func[parent_cell_name](this.cell_value(get_real_cell_name(parent_cell_name)))
                              : func[parent_cell_name];
                this.set_cell_value(real_cell_name, new_val);
            break;
            case 'funnel':
                if(!parent_cell_name){
                    throw new Error('Cannot calculate map cell value - no parent cell name provided!');
                }
                var func = this.cell_func(real_cell_name);
                parent_cell_name = get_real_cell_name(parent_cell_name);
                this.set_cell_value(real_cell_name, func(parent_cell_name, this.cell_value(parent_cell_name)));
            break;
            /*case 'child':
                var args = this.cell_parents(real_cell_name).map((parent_cell_name) => this.cell_value(get_real_cell_name(parent_cell_name)));
                //console.log('Computing args', args);
                var val = this.cell_func(real_cell_name).apply(null, args);
                this.linkChild(val, real_cell_name.replace("$child_", ""))
                //console.log('Child', real_cell_name, 'val is', val);
            break;*/
            default:
                throw new Error('Unknown cell type:' + this.cell_type(real_cell_name));
            break;
        }
    }

    Hash.prototype.get = function(cell, child){
        if(child){
            // setting value for some linked child hash
            //log('Trying to set', child, cell, val);
            var path = child.split('/');
            var childname = path[0];
            var child = this.linked_hashes[childname];
            if(!child){
                console.warn('Cannot set - no such path', path);
                return;
            }
            var child_path = path[1] ? path.slice(1).join('/') : undefined;
            return child.get(cell, child_path);
        } else {
            return this.cell_values[cell];
        }
    }

    Hash.prototype.set = function(cell, val, child){
        if(child){
            // setting value for some linked child hash
            //log('Trying to set', child, cell, val);
            var path = child.split('/');
            var childname = path[0];
            var child = this.linked_hashes[childname];
            if(!child){
                console.warn('Cannot set - no such path', path);
                return;
            }
            var child_path = path[1] ? path.slice(1).join('/') : undefined;
            child.set(cell, val, child_path);
            return;
        }
        if(cell instanceof Object){
            // batch update
            //console.log('Computing batch update', cell);
            cell.eachKey(this.doRecursive.bind(this, (cell) => {
                this.dirtyCounter[cell] 
                    ? this.dirtyCounter[cell]++ 
                    : (this.dirtyCounter[cell] = 1);
            }));
            //console.log('dirty counter', this.dirtyCounter);
            cell.eachKey(this.doRecursive.bind(this, (cell2, parent_cell_name) => {
                if(--this.dirtyCounter[cell2] === 0 && cell[cell2] === undefined){
                    //console.log('Computing after batch change', cell2, cell);
                    this.compute(cell2, parent_cell_name);
                } else {
                    //console.log('Cell ', cell, 'is not ready', this.dirtyCounter);
                }
            }));
        } else {
            //console.log('Setting cell value', cell, val);
            if(!this.cell_type(cell) === 'free'){
                throw Exception('Cannot set dependent cell!');
            }
            this.force_set(cell, val);
            //this.doRecursive(this.compute.bind(this), cell);
            //console.log('Cell values after set', this.cell_values);
        }
    }
    Hash.prototype.force_set = function(cell, val){
        this.set_cell_value(cell, val);
        this.cell_children(cell).eachKey((child_cell_name) => {
            this.doRecursive(this.compute.bind(this), child_cell_name, false, cell);
        });
    }
    Hash.prototype.cell_parents = function(cell){
        return this.cell_types[cell] ? this.cell_types[cell].parents : [];
    }
    Hash.prototype.cell_children = function(cell){
        return this.cell_types[cell] ? this.cell_types[cell].children : [];
    }
    Hash.prototype.all_cell_children = function(cell, arr){
        if(!this.cell_types[cell]){
            return [];
        }
        arr = arr || [];
        this.cell_types[cell].children.eachKey((cl) => {
            arr.push(cl);
            this.all_cell_children(cl, arr);
        });
        return arr;
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
        //log('Setting', cell, val, this.dynamic_cell_links[cell]);
        if(this.side_effects[cell]){
            //console.info('I SHOULD SET side-effect', val);
            side_effects[this.side_effects[cell]].func.call(this, cell, val);
            //console.log('Child', real_cell_name, 'val is', val);
        }
        if(this.dynamic_cell_links[cell]){
            this.dynamic_cell_links[cell].each((links, hash_name) => {
                var hsh = hash_name === '__self' ? this : this.linked_hashes[hash_name];
                if(hsh){
                    for(var link of links){
                        //console.log('Writing dynamic cell link ' + link.cell_name, link.type === 'val', this.name);
                        //log('Updating links', link, val);
                        if(link.type === 'val'){
                            hsh.set(link.cell_name, val);
                        } else {
                            hsh.set(link.cell_name, [hash_name !== '__self' ? this.name : cell, val]);
                        }
                    }
                }
            })
        }
    }

    var system_predicates = new Set([
        'is',
        'async',
        'closure',
        'funnel',
        'map',
        'funnel',
        'hash',
        'children',
        'nested'
    ]);
    var side_effects = {
        'child': {
            func: function(cellname, val){
                //console.log('RUNNING SIDE EFFECT', this, val);         
                var hash, link1, link2;
                cellname = cellname.replace("$child_", "");
                if(val instanceof Array){
                    // it's hash and link
                    hash = val[0];
                    link1 = val[1];
                    link2 = val[2];
                } else {
                    hash = val;
                }
                this.linkChild(hash, cellname);
                if(link1){
                    //console.info('Linking by link1 hash', link1);
                    link1.each((his_cell, my_cell) => {
                        this.linkTwoCells(his_cell, my_cell, cellname, '..', 'val');
                    })
                }
                if(link2){
                    //console.info('Linking by link2 hash', link2);
                    link2.each((his_cell, my_cell) => {
                        this.linked_hashes[cellname].linkTwoCells(his_cell, my_cell, '..', cellname, 'val');
                    })
                }
            },
            regexp: /^\$child\_/,
        }
    };

    var predefined_functions = {
        '+': {
            type: 'func', 
            func: function(a, b){ return (a ? Number(a) : 0) + (b ? Number(b) : 0);}
        },
        '-': {
            type: 'func', 
            func: function(a, b){ return Number(a) - Number(b);}
        },
        '*': {
            type: 'func', 
            func: function(a, b){ return a*b;}
        },
        '/': {
            type: 'func', 
            func: function(a, b){ return a/b;}
        },
        '%': {
            type: 'func', 
            func: function(a, b){ return a%b;}
        },
        '$': {
            type: 'func', 
            func: function(a, b){ 
                console.log('Searching selector', b, 'in', a);
                return a.find(b); 
            }
        },
    }

    var get_app = function(){
        var app = new App;
        apps.push(app);
        return app;
    }

    var init_if_empty = function(obj/*key, val, key1, val1, ... */) {
        for(let i  = 1; ;i = i + 2){
            var key = arguments[i];
            var val = arguments[i + 1];
            if(!key) break;
            
            if(obj[key] === undefined){
                obj[key] = val;
            }
            obj = obj[key];
        }
    }
    var set_listening_type = function(cell, type){
        return {
            //'change': ':', 
            'passive': '-', 
            'normal': ''
        }[type] + cell;
    }

    var parse_cellname = function(cellname, pool, context){
        if(cellname.indexOf('/') !== -1){
            // it's a path - link to other hashes
            var path = cellname.split('/');
            init_if_empty(pool.cell_links, path[0], {});
            pool.cell_links[path[0]][cellname] = path.slice(1).join('/');
            return;
        }
        for(var n in side_effects){
            var m = side_effects[n];
            var matches = cellname.match(m.regexp);
            if(matches){
                //console.info('Cell', cellname, 'matches regexp', m.regexp, pool);
                init_if_empty(pool, 'side_effects', {}, cellname, []);
                pool.side_effects[cellname].push(n);
            }
        }
        for(var m of cellMatchers){
            var matches = cellname.match(m.regexp);
            if(matches){
                m.func(matches, pool, context);
                return;
            }
        }
    }

    var get_random_name = (function(){
        // temp solution for Symbol
        var c = 1;
        return function(){
            return 'ololo123321@@@_' + (++c);
        }
    })()

    var parse_fexpr = function(a, pool, key){
        var funcstring;
        if(typeof a === 'string'){
            // just link to other cell
            a = [id, a];
        }
        if(a instanceof Object){
            if(a instanceof Array){
                var funcname = a[0];
                if(funcname instanceof Function){
                    // it's "is" be default
                    funcstring = ['is'].concat(a);
                } else if(system_predicates.has(funcname)){
                    switch(funcname){
                        case 'nested':
                            var dependent_cells = a[2].map((cellname) => (key + '.' + cellname));
                            init_if_empty(pool.plain_base, '$free', {});
                            dependent_cells.each((name) => {
                                pool.plain_base.$free[name] = null;
                            })
                            a.splice(2, 1);
                        default:
                            funcstring = a; 
                        break;
                    }
                } else {
                    if(predefined_functions[funcname]){
                        var fnc = predefined_functions[funcname];
                        switch(fnc.type){
                            case 'func':
                                funcstring = ['is', fnc.func].concat(a.slice(1))
                            break;

                        }
                    } else {
                        console.log('Error', arguments, funcname instanceof Function);
                        throw new Error('Cannot find predicate: ' + funcname);
                    }
                }
            } else {
                // it's object
                if(a.__def !== undefined){
                    //console.info('Found default value for', key, ':', a.__def);
                    // default value for MAP cell
                    init_if_empty(pool, 'default_values', {});
                    pool.default_values[key] = a.__def;
                    delete a.__def;
                }
                funcstring = ['map', a].concat(Object.keys(a));
                //console.log('Parsing MAP fexpr', a, ' -> ', funcstring);
            }
        } else {
            throw new Error('Cannot parse primitive value as fexpr: ' + a);
        }
        //console.log('Funcstring', funcstring);
        for(let k = 2; k < funcstring.length; ++k){
            var cellname = funcstring[k];
            switch(typeof(cellname)){
                case 'string':
                    parse_cellname(cellname, pool);
                break;
                case 'object':
                    if(cellname instanceof Array){
                        var some_key = get_random_name();
                        //console.log('Random name is', some_key);
                        parse_fexpr(cellname, pool, some_key);
                        funcstring[k] = some_key;
                    }
                break;
                default: 
                    throw new Error('Not know how to handle this ' + typeof(cellname));
                break;
            }
        }
        parse_cellname(key, pool, 'setter');
        //console.log('Got funcstring', funcstring);
        pool.plain_base[key] = funcstring;
    }

    var get_cell_type = function(type, func, parents){
        //console.log('getting cell type', arguments);
        return {type, func, parents: parents || [], children: []}
    }

    var parse_cell_types = function(pbs){
        var cell_types = {};
        var children = {};
        //console.log('PBS', pbs);
        for(let i in pbs){
            let type = 'free';
            if(i === '$children'){
                continue;
            }
            if(i === '$free'){
                //console.log('parsing free variables', pbs[i]);
                for(var j in pbs[i]){
                    cell_types[j] = get_cell_type(type);
                }
                //console.log('now cell_types j looks like', cell_types);
                continue;
            }
            if(!(pbs[i] instanceof Array)){
                console.log('pbsi', pbs, i, pbs[i]);
            }
            var func = pbs[i][0];
            var parents = pbs[i].slice(1);
            if(func instanceof Function){
                // regular sync cell
                type = 'is';
            } else {
                // may be 'async', 'changes' or something else
                type = func;
                func = parents.shift();
            }
            cell_types[i] = get_cell_type(type, func, parents);
            //console.log('Cell', i, 'parent', parents);
            for(var j in parents){
                var [listening_type, parent_cell_name] = cell_listening_type(parents[j]);
                //console.log('real cell name:', parents[j], '->', parent_cell_name, listening_type);
                if(listening_type !== 'passive'){
                    init_if_empty(children, parent_cell_name, {});
                    children[parent_cell_name][set_listening_type(i, listening_type)] = true;
                } else {
                    //console.info('Omit setting', i, 'as child for', parent_cell_name, ' - its passive!');
                }
            }
        }
        //console.log('Got following children after parsing', children, cell_types);
        for(let i in children){
            //console.log('resi', res, i);
            if(!cell_types[i]){
                cell_types[i] = get_cell_type('free');
            }
            cell_types[i].children = children[i];
        }
        //console.log('Parsed cell types', cell_types);
        return cell_types;
    }

    var parse_pb = function(res){
        for(var key in res.plain_base) {
            if(key === '$free'){
                continue;
            }
            if(key === '$children'){
                var value = res.plain_base.$children;
                if(value instanceof Array){
                    // its dynamic children

                } else {
                    value.each((hash_type, link_as) => {
                        if(hash_type instanceof Array){
                            key = '$child_' + link_as;
                            parse_fexpr(hash_type, res, key);
                        } else {
                            res.hashes_to_link[link_as] = hash_type;
                        }
                    })
                }
                continue;
            }
            parse_fexpr(res.plain_base[key], res, key);
        }
        return res;
    }
    
    var parse_external_links_and_$free = function(pool, key){
        
    }

    
    var Firera = {
        eachHashMixin: {},
        run: function(config){
            var start = performance.now();
            var app = get_app();
            // getting real pbs
            var cbs = config.map(app.parse_cbs);
            //console.log('RESS', cbs);
            app.cbs = cbs;
            // now we should instantiate each pb
            if(!app.cbs.__root){
                // no root hash
                throw new Error('Cant find root app!', app);
            }
            //console.log(app);
            var compilation_finished = performance.now();
            app.root = new Hash(app, '__root');
            var init_finished = performance.now();
            //console.info('App run', app.root
            //    , 'it took ' + (compilation_finished - start).toFixed(3) + '/' + (init_finished - compilation_finished).toFixed(3) + ' milliseconds.'
            //);
            return app;
        },
        loadPackage: function(pack) {
            copy(pack.cellMatchers, cellMatchers);
            if(pack.eachHashMixin){
                // update the mixin for each hash created
                Object.assign(this.eachHashMixin, pack.eachHashMixin);
            }
        }
    }

    window.Firera = Firera;

    var core = {
        cellMatchers: [
            {
                // ^foo -> previous values of 'foo'
                name: 'PrevValue',
                regexp: new RegExp('^(\-|\:)?\\^(.*)', 'i'),
                func: function(matches, pool, context){
                    if(context == 'setter') return;
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
    
    
    var get_by_selector = function(name, $el){
        ///console.info("GBS", arguments);
        if(name === null) return $('body');
        return  $el 
                ? $el.find('[data-fr=' + name + ']')
                : null;
    }
    var search_fr_bindings = function($el){
        var res = {};
        if(!$el) return res;
        $el.find('[data-fr]').each(function(){
            var name = $(this).attr('data-fr');
            res[name] = $(this);
        })
        return res;
    }
    
    var write_changes = function(bindings_table, changed){
        //console.log('Writing cell values to HTML', bindings_table, changed);
        if(changed && changed[0] && bindings_table && bindings_table[changed[0]]){
            bindings_table[changed[0]].html(changed[1]);
        }
    }
    
    var html = {
        eachHashMixin: {
            '$el': [get_by_selector, '$name', '../$el'],
            '$htmlbindings': [search_fr_bindings, '$el'],
            '$writer': [write_changes, '$htmlbindings', '*']
        },
        cellMatchers: [
            {
                // ^foo -> previous values of 'foo'
                name: 'HTMLAspects',
                regexp: new RegExp('^(\-|\:)?([^\|]*)\\|(.*)', 'i'),
                func: function(matches, pool, context){
                    var cellname = matches[0];
                    var aspect = matches[3];
                    var selector = matches[2];
                    var func;
                    var setters = ['visibility'];
                    setters.has = function(str){
                        return this.indexOf(str) !== -1;
                    }
                    //console.info('Aspect:', aspect, setters.has(aspect), context);
                    if(
                        (context === 'setter' && !setters.has(aspect))
                        ||
                        (context !== 'setter' && setters.has(aspect))
                    ){
                        return;
                    }
                    switch(aspect){
                        case 'val':
                            func = function(cb, vals){
                                var onChange = function(){
                                    //console.log('Updating value of', cellname);
                                    cb($(this).val());
                                };
                                var [$prev_el, $now_el] = vals;
                                //console.log('Assigning handlers for ', cellname, arguments, $now_el.find(selector));
                                if($prev_el){
                                    $prev_el.off('keyup', selector);
                                    $prev_el.off('change', selector);
                                }
                                $now_el.on({keyup: onChange, change: onChange}, selector);
                            }
                        break;
                        case 'click':
                            func = function(cb, vals){
                                var [$prev_el, $now_el] = vals;
                                if(!$now_el) return;
                                //console.log('Assigning handlers for ', cellname, arguments, $now_el);
                                if($prev_el){
                                    $prev_el.off('click', selector);
                                }
                                $now_el.on('click', selector, cb);
                            }
                        break;
                        case 'visibility':
                            func = function($el, val){
                                if(val){
                                    $el.show();
                                } else {
                                    $el.hide();
                                }
                            }
                        break;
                        default:
                            throw new Error('unknown HTML aspect: ' + aspect);
                        break;
                    }
                    if(context === 'setter'){
                        parse_fexpr(['is', func, [(a) => a.find(selector), '$el'], cellname], pool, get_random_name());
                    } else {
                        parse_fexpr(['async', func, '^$el'], pool, cellname);
                    }
                }
            }
        ]
    }


    Firera.loadPackage(core);
    Firera.loadPackage(html);
    Firera.func_test_export = {parse_pb, parse_fexpr};
})()

/*

Hashes crud interface

create: name, type(or pb)[, init_values(for $free)]
remove: name,
rename: name, new_name


*/