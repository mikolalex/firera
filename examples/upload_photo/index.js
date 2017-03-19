const app = Firera({
	__root: {
		$template: `

.
	h2
		"Firera file upload example"
	.
		button.show-photo-upload-popup
			"Upload photo"
	.overlay(show: $popup_shown)
		"OVERLAY"
	.$popup

`,
		$el: document.querySelector('.test-photo-upload'),
		'show_photo_upload_popup': ['.show-photo-upload-popup|click'],
		'close_photo_upload_popup': ['popup/close'],
		'popup_shown': ['map', {
			'show_photo_upload_popup': 'popup',
			'close_photo_upload_popup': false,
		}],
		$child_popup: ['popup_shown'],
	},
	popup: {
		$template: `
.
	.
		"Hi, I'm popup!"
	.
		a.close
			"Close"
`,
		close: ['.close|click'],
	}
}, {
	packages: ['htmlCells', 'neu_ozenfant'],
	trackChanges: true,
	trackChangesType: 'imm',
})

window.app = app;
