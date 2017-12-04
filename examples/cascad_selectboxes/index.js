// init data section
var countries = ['Ukraine', 'Moldova', 'Belarus'];
var regions = [{name: 'Donetsk region', country: 'Ukraine'}, {name: 'Kyiv region', country: 'Ukraine'}, {name: 'Gomel region', country: "Belarus"}];
var cities = [{name: 'Kostyantynivka', region: 'Donetsk region'}, {name: 'Kyiv', region: 'Kyiv region'}, {name: 'Khoiniki', region: 'Gomel region'}];
// template section
const $template = `
	form
		.country
			label
				"Select country"
			select(name: country){$countries}
				.$@
		.region(visibility: $country)
			label
				"Select region/state"
			select(name: region){$regions}
				.$@name
		.city(visibility: $region)
			label
				"Select city"
			select(name: city){$cities}
				.$@name
		.address(visibility: $city)
			label
				"Enter your address"
			text(name: address)
			
`;
// pure functions section

// init data section
const $init = {
    $template,
}
// app itself
const app = Firera({
    $packages: ['htmlCells', 'ozenfant'],
    $root: {
        $init,
        country: ['[name=country]|getval'],
		region: ['map', {
			'[name=region]|getval': _F.id,
			'country': false,
		}],
		city: ['map', {
			'[name=city]|getval': _F.id,
			'region': false,
		}],
		address: ['[name=address|getval']
    }
})