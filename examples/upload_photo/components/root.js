const root_template = `
	.
		h2
			"Firera file upload example"
		.
			button.show-photo-upload-popup
				"Upload photo"
		.overlay(show: $popup_shown)
			"OVERLAY"
		.$popup
`;
module.exports = {
	$template: root_template,
	$el: document.querySelector('.test-photo-upload'),
	'show_photo_upload_popup': ['.show-photo-upload-popup|click'],
	'close_photo_upload_popup': ['join', 'popup/close', '.overlay|click'],
	'popup_shown': ['map', {
		'show_photo_upload_popup': 'popup',
		'close_photo_upload_popup': false,
	}],
	$child_popup: ['popup_shown'],
}