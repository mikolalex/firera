var write = $(".content").append.bind($(".content"));
var app_devtool = Firera(app_struct_devtool);

var request_data = () => {
	chrome.devtools.inspectedWindow.eval(
		"JSON.stringify(Firera.getAppStruct())",
		function(result, isException) {
			result = JSON.parse(result);
			if(result instanceof Array){
				app_devtool.set('data', [result[0]]);
			}
		}
	);
}
setInterval(request_data, 700);
