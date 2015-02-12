var write = $(".content").append.bind($(".content"));

var get = function(str, cb, error_cb){
    var error_cb = error_cb || function(str){
        $(".errors").append(str);
    }
    chrome.devtools.inspectedWindow.eval(
        str,
        function(lib, isException) {
            var res = '';
            if (isException){
                res = "Cannot retrieve '" + lib + "', " + isException.description + '/' + isException.details;
                error_cb(res, isException);
            }
            else{
                cb(lib);
            }
       }
    );
}

var build_instance = function(dump){
    $("<div/>").html(dump.toString()).appendTo(".content");
}

var retrieve_root_instances = function(len){
    write('Got ' + len);
    if(!len){
        write('No Firera instances found!');
    } else {
        for(var i = 0; i < len; i++){
            write('Getting ' + i);
            get('Firera.dump(Firera.instances[' + i + '])', build_instance);
        }
    }
}

get('Firera.instances.length', retrieve_root_instances)