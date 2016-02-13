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

    var Hash = function(app, parsed_pb_name){
        this.app = app;
        var parsed_pb = app.cbs[parsed_pb_name];
        console.log('________________________________________________________');
        console.log('CREATING HASH ' + parsed_pb_name, parsed_pb);
        // creating cell values obj
        this.cell_types = parsed_pb.cell_types;
        this.cell_links = parsed_pb.cell_links;
        this.hashes_to_link = parsed_pb.hashes_to_link;
        this.linked_hashes = {};
        // for "closure" cell type
        this.cell_funcs = {};
        this.dirtyCounter = {};
        this.dynamic_cell_links = {};
        this.cell_values = Object.create(parsed_pb.plain_base.$free || {});
        this.hashes_to_link.each((hash_name, link_as) => this.linkChild(hash_name, link_as));
        // @todo: refactor, make this set in one step
        if(parsed_pb.plain_base.$free){
            this.set(parsed_pb.plain_base.$free);
        }
        if(parsed_pb.default_values){
            //console.log('Setting DEFAULT values', parsed_pb.default_values);
            parsed_pb.default_values.each((val, cell) => this.force_set(cell, val));
        }
        //console.log('result', this.cell_values);
    }

    Hash.prototype.linkChild = function(type, link_as){
        var child = new Hash(this.app, type);
        this.linked_hashes[link_as] = child;
        child.linked_hashes['..'] = this;
        this.linkCells(link_as, '..');
        child.linkCells('..', link_as);
        //console.info('Successfully linked ', type, 'as', link_as);
    }

    Hash.prototype.linkCells = function(hash_name, my_name_for_that_hash){
        var links;
        if(links = this.cell_links[hash_name]){
            links.each((parent_cell, child_cell) => {
                init_if_empty(this.linked_hashes[hash_name].dynamic_cell_links, parent_cell, []);
                var pool = this.linked_hashes[hash_name].dynamic_cell_links;
                init_if_empty(pool, my_name_for_that_hash, []);
                pool[my_name_for_that_hash].push(child_cell);
                this.set(child_cell, this.linked_hashes[hash_name].cell_value(parent_cell));
            })
        }
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
            case 'funnel':
                if(!parent_cell_name){
                    throw new Error('Cannot calculate map cell value - no parent cell name provided!');
                }
                var func = this.cell_func(real_cell_name);
                parent_cell_name = get_real_cell_name(parent_cell_name);
                this.set_cell_value(real_cell_name, func(parent_cell_name, this.cell_value(parent_cell_name)));
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

    var system_predicates = new Set(['is', 'async', 'closure', 'funnel', 'map', 'funnel', 'hash']);

    var predefined_functions = {
        '+': {
            type: 'func', 
            func: function(a, b){ return a+b;}
        },
        '-': {
            type: 'func', 
            func: function(a, b){ return a-b;}
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

    var parse_cellname = function(cellname, pool, context){
        if(cellname.indexOf('/') !== -1){
            // it's a path - link to other hashes
            var path = cellname.split('/');
            init_if_empty(pool.cell_links, path[0], {});
            pool.cell_links[path[0]][cellname] = path.slice(1).join('/');
            return;
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
        if(a instanceof Object){
            if(a instanceof Array){
                var funcname = a[0];
                if(funcname instanceof Function){
                    // it's "is" be default
                    funcstring = ['is'].concat(a);
                } else if(system_predicates.has(funcname)){
                    funcstring = a; // it's "is" or something similar
                    /*if(funcname === 'hash'){
                        init_if_empty(pool, 'hashes_to_link', {});
                        pool.hashes_to_link[key] = a[1];
                        return;
                    }*/
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
            if(i === '$free'){
                //console.log('parsing free variables', pbs[i]);
                for(var j in pbs[i]){
                    cell_types[j] = get_cell_type(type);
                }
                //console.log('now cell_types j looks like', cell_types);
                continue;
            }
            //console.log('pbsi', pbs, i);
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
                    console.info('Omit setting', i, 'as child for', parent_cell_name, ' - its passive!');
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

    var parse_pb = function(pb){
        var plain_base = {};
        var cell_links = {};
        var hashes_to_link = {};
        var res = {plain_base, cell_links, hashes_to_link};
        //console.log('--- PARSING PB', pb);
        for(var key in pb) {
            if(key === '$free'){
                init_if_empty(res.plain_base, '$free', {});
                pb[key].each((val, key) => { res.plain_base['$free'][key] = val; });
                continue;
            }
            if(key === '$children'){
                pb[key].each((hash_type, link_as) => {
                     res.hashes_to_link[link_as] = hash_type;
                })
                continue;
            }
            if(pb[key] instanceof Object) {
                // Array or Object
                parse_fexpr(pb[key], res, key);
            } else {
                // primitive value
                //console.log('hereby', res);
                init_if_empty(res.plain_base, '$free', {});
                res.plain_base.$free[key] = pb[key];
            }
        }
        //console.log('--- PARSED PB', res);
        return res;
    }

    var to_seconds = (date) => {
        var a = Number(((date.getHours()*60 + date.getMinutes())*60 + date.getSeconds()) + '.' + date.getMilliseconds());
        //console.log('MS', a);
        return a;
    }

    var time_between = (a, b) => {
        return (to_seconds(b) - to_seconds(a))*1000000;
    }
    
    var Firera = {
        run: function(config){
            var start = new Date();
            var app = get_app();
            // getting real pbs
            app.cbs = config.map(function(pb){
                var res = parse_pb(pb);
                //console.log('GOT cell_links', cell_links);
                res.cell_types = parse_cell_types(res.plain_base);
                return res;
            });
            // now we should instantiate each pb
            if(!app.cbs.__root){
                // no root hash
                throw new Error('Cant find root app!', app);
            }
            //console.log(app);
            var compilation_finished = new Date();
            app.root = new Hash(app, '__root');
            var init_finished = new Date();
            console.info('App run', app.root
                //, time_between(start, compilation_finished), time_between(compilation_finished, init_finished)
            );
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
            },
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
                                //console.log('Assigning handlers for ', cellname, arguments, $now_el.find(selector));
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
    Firera.func_test_export = {parse_pb, parse_fexpr};
})()