chrome.runtime.onMessage.addListener(
	function(message/*, sender, sendResponse*/) {
		console.log('got message', message);
        chrome.tabs.executeScript(message.tabId, { file: message.scriptToInject });
	}
);