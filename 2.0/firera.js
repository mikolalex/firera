(function(){
    'use strict';
    var apps = [];
    var App = function(){
        this.pb_pool = {};
    }
    App.prototype.get = function(cell){

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
            return a;
        } else {
            return ['just', a];
        }
    }

    var parse_pb = function(pb){
        var res = {};
        for(var key in pb) {
            if(pb[key] instanceof Object) {
                // Array or Object
                res[key] = pb[key];
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
            var parsed_pbs = config.map(parse_pb);
            console.log(parsed_pbs);
            return app;
        }
    }

    window.Firera = Firera;
    Firera.func_test_export = {parse_pb, parse_fexpr};
})()