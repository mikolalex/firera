var write = $(".content").append.bind($(".content"));
var request_data = () => {
	chrome.devtools.inspectedWindow.eval(
		"JSON.stringify(Firera.getAppStruct())",
		function(result, isException) { 
			write(result);
			write(isException);
		}
	);
}
request_data();

/*
var data = {
	tabId: chrome.devtools.inspectedWindow.tabId,
	scriptToInject: "content_script.js"
};
chrome.runtime.sendMessage(data);
*/