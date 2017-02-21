var write = $(".content").append.bind($(".content"));
var app_devtool = Firera(app_struct_devtool);

var request_data = () => {
	chrome.devtools.inspectedWindow.eval(
		"JSON.stringify(Firera.getAppStruct())",
		function(result, isException) {
			if(!result) return;
			try {
				result = JSON.parse(result);
			}
			catch(e){
				console.log('Error in JSON:' + e.message);
			}
			if(result instanceof Array){
				app_devtool.set('data', [result[0]]);
			} else {
				console.log('result is not array');
			}
		}
	);
}
setInterval(request_data, 100);
