import _F from '../../../utils';
const isDef = function(n){ return n !== undefined; };

const root_template = `
	.
		.messages{$messages_shown}
			.$@msg
		h2
			"Firera file upload example"
		.
			button.show-photo-upload-popup
				"Upload photo"
		.overlay(show: $popup_shown)
			"OVERLAY"
		.$popup
`;


const message_timer = () => {
	const time_to_keep = 2000;
	const queue = [];
	return (cb, [msg]) => {
		const ind = queue.push({msg}) - 1;
		setTimeout(() => {
			delete queue[ind];
			cb(queue.filter(isDef));
		}, time_to_keep);
		cb(queue.filter(isDef));
	}
}

module.exports = {
	$init: {
		$template: root_template,
		$el: document.querySelector('.test-photo-upload'),
	},
	'show_popup': ['.show-photo-upload-popup|click'],
	'close_popup': ['join', 'popup/close', '.overlay|click'],
	'popup_shown': ['map', {
		'show_popup': 'popup',
		'close_popup': false,
	}],
	'messages_shown': ['asyncClosure', message_timer, '**/show_message'],
	$child_popup: ['popup_shown'],
}