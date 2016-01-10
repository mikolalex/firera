(function(){
    'use strict';
    var apps = [];
    var get_app = function(){
        var pb_pool = {};
        var app = {pb_pool};
        apps.push(app);
        return app;
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
        return pb.map(parse_fexpr);
    }
    
    var Firera = {
        run: function(config){
            var app = get_app();
            var parsed_pbs = config.map(parse_pb);
            console.log(parsed_pbs);
        }
    }

    window.Firera = Firera;
    Firera.func_test_export = {parse_pb, parse_fexpr};
})()