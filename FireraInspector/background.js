chrome.runtime.onMessage.addListener(
	function(message/*, sender, sendResponse*/) {
        chrome.tabs.executeScript(message.tabId, { file: message.scriptToInject });
	}
);