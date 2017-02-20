const generate_data = (len) => {
	var res = [];
	for(let i = 0; i <= len; i++){
		res.push({
			id: i + 1,
			num: Math.round(Math.random()*1000),
		})
	}
	return res;
}
const top_offset = (height, one) => (-1 * (height - (Math.floor(height/one) * one)) + 'px');
const arr_slice = (from, how_much, data) => data.slice(from, from + how_much);
const add_px = (h) => h + 'px';
const floorDiv = (a, b) => Math.floor(a/b);
const ceilDiv = (v, l) => Math.ceil(v/l);

const $template = `
	.(max-width: 600px, margin: auto, a:b)
		.outer
			.inner
			.vtable
				.prokl(margin-top: $top_offset){$data}
					.row(height: $line_height_px)
						.id$.id
						.num$.num
		form
			range(min: 10, max: 30, step: 1, value: 10)
			" - line height"

`;
const $init = {
	line_height: 30,
	from: 0,
	viewport_heigth: 600,
	dataRowsLength: 100000,
}

const $el = document.getElementsByClassName('test-vgrid')[0];

var app = Firera({
	__root: {
		$template,
		$el,
		$init,
		line_height: ['[type=range]|getval'],
		posY: ['.outer|scrollPos(Y)'],
		top_offset: [top_offset, 'posY', 'line_height'],
		source_data: [generate_data, 'dataRowsLength'],
		from: [floorDiv, 'posY', 'line_height'],
		data: [arr_slice, 'from', 'items_shown', 'source_data'],
		'.inner|css(height, px)': ['*', 'dataRowsLength', 'line_height'],
		items_shown: [ceilDiv, 'viewport_heigth', 'line_height'],
		line_height_px: [add_px, 'line_height'],
		'.vtable|css(top,px)': ['posY'],
	},
	$packages: ['htmlCells', 'neu_ozenfant']
})