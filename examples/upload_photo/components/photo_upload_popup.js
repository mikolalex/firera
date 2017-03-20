import _F from '../../../utils';

const get_file_data = (cb, f) => {
	if(!f) return;
    const reader = new FileReader();
	reader.onload = function(e) {
		cb(e.target.result);
	};
    reader.readAsDataURL(f);
}

const get_exif_data = (cb, file) => {
	if(!file) return;
	EXIF.getData(file, function() {
		if(this.exifdata && this.exifdata.DateTimeOriginal){
			const dt = this.exifdata.DateTimeOriginal.split(' ')[0].split(':');
			const date = {
				year: dt[0],
				month: dt[1],
				date: dt[2]
			}
			cb(date);
		}
	});
}

var get_field_with_validation = (field_classname, min_length) => {
	return ['nested', (cb, val) => {
			cb('value', val);
			cb('valid', val.length >= min_length);
	}, ['value', 'valid', 'error'], '.' + field_classname + '|getval'];
}

const popup_template = `
	.popup
		.
			a.close(href: #)
				"Close"
		h3.
			"Upload photo"
		.
			input.choose-file(type: file, multiple: false, accept: image/jpeg)
		.
			img.uploaded-image(src: $file_data)
		.(show: $file_selected)
			.what
				"What?"
				text(name: what)
				.(show: $what_invalid)
					"This field should not be empty"
			.where
				"Where?"
				text(name: where)
				.(show: $where_invalid)
					"This field should not be empty"
			.(text-align: center, padding: 10px) 
				submit(value: Submit, hasAttr disabled: $upload_photo.inProgress)				
`;
const base = {
	$init: {
		file_selected: false,
		'$upload_photo.inProgress': false,
	},
	$template: popup_template,
	close: ['join', '.close|click', [(a) => {
		return a && a.success ? true : Firera.skip; 
	}, 'upload_photo.result']],
	file_select: ['nested', (cb, files) => {
		const file = files[0];
		if(!file){
			cb('error', 'No files selected');
			return;
		}
		if(file.type !== 'image/jpeg'){
			cb('error', 'Wrong extension: ' + file.type + ', should be image/jpeg');
			return;
		}
		cb('file', file);
	}, ['error', 'file'], '.choose-file|change|files'],
	file_data: ['async', get_file_data, 'file_select.file'],
	file_selected: ['file_select.file'],
	what: get_field_with_validation('what', 2),
	where: get_field_with_validation('where', 2),
	what_invalid: ['transist', 'submit', ['!', 'what.valid']],
	where_invalid: ['transist', 'submit', ['!', 'where.valid']],
	date: ['async', get_exif_data, 'file_select.file'],
	valid: ['&&', 'what.valid', 'where.valid', 'file_data'],
	submit: ['[type=submit]|click'],
	upload_photo: ['nested', (cb, valid, _, file_data, what, where) => {
		if(valid){
			console.log('---> Uploading photo...');
			var data = {what, where, file_data};
			cb('inProgress', true);
			setTimeout(() => {
				console.log('<=== Photo uploaded ');
				cb('inProgress', false);
				cb('result', {success: true});
			}, 1000);
		}
	}, ['inProgress', 'result'], '-valid', 'submit', '-file_data', '-what.value', '-where.value'],
	'show_message': [_F.always('Photo successfully uploaded!'), 'upload_photo.result'],
	f: [_F.l, 'show_what_error'],
};
export default base;

