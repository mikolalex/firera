var write = $(".content").append.bind($(".content"));

$("button").click(() => {
	chrome.devtools.inspectedWindow.eval(
      "JSON.stringify(Firera.getAppStruct())",
      function(result, isException) { 
		  write(result);
		  write(isException);
	  }
    );
})