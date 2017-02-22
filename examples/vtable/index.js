// generating random data
const generate_data = (len) => {
	const res = [];
	for(let i = 0; i <= len; i++){
		res.push({
			id: i + 1,
			num: Math.round(Math.random()*1000),
		})
	}
	return res;
}
// template section
const $template = `
	.(max-width: 600px, margin: auto)
		style
			".row {height: {{line_height}}px }"
		.outer
			.inner
			.vtable
				.prokl(margin-top: $top_offset){$data}
					.row
						.id$.id
						.num$.num
		form
			.
				range(name: lh, min: 20, max: 60, step: 1, value: 20)
				" - line height" 
			.
				range(name: th, min: 400, max: 1000, step: 10, value: 600)
				" - table height" 
`;
// pure functions section
const top_offset = (height, one) => (-1 * (height - (Math.floor(height/one) * one)) + 'px');
const arr_slice = (arr, from, how_much) => arr.slice(from, from + how_much);
const floorDiv = (a, b) => Math.floor(a/b);
const ceilDiv = (a, b) => Math.ceil(a/b);
const max_scrollTop = (data, lh, vh) => data.length*lh - vh;
// init data section
const $init = {
	line_height: 20,
	from: 0,
	dataRowsLength: 100000,
	viewport_heigth: 600,
	'.outer|scrollPos(Y)': 0,
	$el: document.querySelector('.test-vgrid')
}
// app itself
const app = Firera({
	__root: {
		$template,
		$init,
		line_height: ['[name=lh]|getval'],
		viewport_heigth: ['[name=th]|getval'],
		pos_y: [Math.min, '.outer|scrollPos(Y)', 'max_scrollTop'],
		top_offset: [top_offset, 'pos_y', 'line_height'],
		max_scrollTop: [max_scrollTop, 'source_data', 'line_height', 'viewport_heigth'],
		source_data: [generate_data, 'dataRowsLength'],
		from: [floorDiv, 'pos_y', '-line_height'],
		data: [arr_slice, 'source_data', 'from', 'items_shown'],
		items_shown: [ceilDiv, 'viewport_heigth', 'line_height'],
		'.inner|css(height,px)': ['*', 'dataRowsLength', 'line_height'],
		'.vtable|css(top,px)': ['pos_y'],
		'.outer|css(height,px)': ['viewport_heigth'],
	}
}, {
	packages: ['htmlCells', 'neu_ozenfant'],
	//trackChanges: true,//['pos_y', 'top_offset'],
	//trackChangesType: 'log',
})