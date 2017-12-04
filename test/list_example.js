var list = "target,download,ping,rel,hreflang,type,referrerPolicy,text,coords,charset,name,rev,shape,href,origin,protocol,username,password,host,hostname,port,pathname,search,hash,toString,title,lang,translate,dir,dataset,hidden,tabIndex,accessKey,draggable,spellcheck,contentEditable,isContentEditable,offsetParent,offsetTop,offsetLeft,offsetWidth,offsetHeight,style,innerText,outerText,webkitdropzone,onabort,onblur,oncancel,oncanplay,oncanplaythrough,onchange,onclick,onclose,oncontextmenu,oncuechange,ondblclick,ondrag,ondragend,ondragenter,ondragleave,ondragover,ondragstart,ondrop,ondurationchange,onemptied,onended,onerror,onfocus,oninput,oninvalid,onkeydown,onkeypress,onkeyup,onload,onloadeddata,onloadedmetadata,onloadstart,onmousedown,onmouseenter,onmouseleave,onmousemove,onmouseout,onmouseover,onmouseup,onmousewheel,onpause,onplay,onplaying,onprogress,onratechange,onreset,onresize,onscroll,onseeked,onseeking,onselect,onshow,onstalled,onsubmit,onsuspend,ontimeupdate,ontoggle,onvolumechange,onwaiting,click,focus,blur,onauxclick,onpointercancel,onpointerdown,onpointerenter,onpointerleave,onpointermove,onpointerout,onpointerover,onpointerup,ontouchcancel,ontouchend,ontouchmove,ontouchstart,namespaceURI,prefix,localName,tagName,id,className,classList,attributes,innerHTML,outerHTML,shadowRoot,slot,assignedSlot,scrollTop,scrollLeft,scrollWidth,scrollHeight,clientTop,clientLeft,clientWidth,clientHeight,onbeforecopy,onbeforecut,onbeforepaste,oncopy,oncut,onpaste,onsearch,onselectstart,onwheel,onwebkitfullscreenchange,onwebkitfullscreenerror,previousElementSibling,nextElementSibling,children,firstElementChild,lastElementChild,childElementCount,hasAttributes,getAttribute,getAttributeNS,setAttribute,setAttributeNS,removeAttribute,removeAttributeNS,hasAttribute,hasAttributeNS,getAttributeNode,getAttributeNodeNS,setAttributeNode,setAttributeNodeNS,removeAttributeNode,closest,matches,webkitMatchesSelector,getElementsByTagName,getElementsByTagNameNS,getElementsByClassName,insertAdjacentElement,insertAdjacentText,insertAdjacentHTML,createShadowRoot,attachShadow,getDestinationInsertionPoints,requestPointerLock,getClientRects,getBoundingClientRect,scrollIntoView,scrollIntoViewIfNeeded,animate,remove,webkitRequestFullScreen,webkitRequestFullscreen,querySelector,querySelectorAll,ongotpointercapture,onlostpointercapture,setPointerCapture,releasePointerCapture,hasPointerCapture,before,after,replaceWith,prepend,append,ELEMENT_NODE,ATTRIBUTE_NODE,TEXT_NODE,CDATA_SECTION_NODE,ENTITY_REFERENCE_NODE,ENTITY_NODE,PROCESSING_INSTRUCTION_NODE,COMMENT_NODE,DOCUMENT_NODE,DOCUMENT_TYPE_NODE,DOCUMENT_FRAGMENT_NODE,NOTATION_NODE,DOCUMENT_POSITION_DISCONNECTED,DOCUMENT_POSITION_PRECEDING,DOCUMENT_POSITION_FOLLOWING,DOCUMENT_POSITION_CONTAINS,DOCUMENT_POSITION_CONTAINED_BY,DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC,nodeType,nodeName,baseURI,isConnected,ownerDocument,parentNode,parentElement,childNodes,firstChild,lastChild,previousSibling,nextSibling,nodeValue,textContent,hasChildNodes,getRootNode,normalize,cloneNode,isEqualNode,isSameNode,compareDocumentPosition,contains,lookupPrefix,lookupNamespaceURI,isDefaultNamespace,insertBefore,appendChild,replaceChild,removeChild,addEventListener,removeEventListener,dispatchEvent";
list = new Array(10).join(list).split(',').map(a => { return {name: a}});
//console.log('list', list);

var timer = (function(){
	var start = performance.now();
	var pool = [];
	window.timer_results = () => {
			for(let a of pool){
					console.log(a[0], a[1]);
			}
	}
	return (str, force) => {
			var time = performance.now() - start;
			//if(force){
					console.log('___________________', str, new Array(30 - str.length).join('_'), time);
			//}
			pool.push([str, time]);
	}
})()

var template = `
			li	
				.
					"This is list element"
				.
					.name$
		`;
template = Firera.Ozenfant.prepare(template);

var app = Firera({
	$root: {
		$el: $('.list-itself'),
		$child_names: ['list', {
				type: 'someName',
				data: list,
		}],
		$template: Firera.Ozenfant.prepare(`
			h1
				"Testing list"
			ul.$names
		
		`)
	},
	someName: {
		$template: template,
	},
	$packages: ['ozenfant', 'htmlCells']
})

console.log('app', app);

setTimeout(() => {
	timer('FINISH ' + (list.length - 1) + ' elements', true);
}, 1)	