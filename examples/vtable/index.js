// pure functions section
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

// template section
const $template = `
	.(max-width: 600px, margin: auto)
		style
			".row {height: {{line_height_px}} }"
		.outer
			.inner
			.vtable
				.prokl(margin-top: $top_offset){$data}
					.row
						.id$.id
						.num$.num
		form
			range(min: 20, max: 60, step: 1, value: 20)
			" - line height" 
`;
// init data section
const $init = {
	line_height: 20,
	from: 0,
	viewport_heigth: 600,
	dataRowsLength: 100000,
	posY: 0,
	$el: document.getElementsByClassName('test-vgrid')[0]
}
// app itself
const app = Firera({
	__root: {
		$template,
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