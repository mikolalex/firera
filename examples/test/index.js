const app = Firera({
	$log: true,
	$root: {
		$init: {
			multiplier: 10,
			$child_crane_1: {
				$init: {
					width: 40,
					height: 120,
				},
				weight: [(w, h, m) => {
					return (w+h)/m;
				}, 'width', 'height', '../multiplier']
			},
			$child_crane_2: {
				$init: {
					width: 50,
					height: 80,
				},
				weight: [(w, h, m) => {
					return (w+h)/m;
				}, 'width', 'height', '/multiplier']
			},
		},
		first_crane_weight: ['crane_1/weight'],
	}
});
console.log(app.get('weight', '/crane_1')); // 16
console.log(app.get('first_crane_weight')); // 16
console.log(app.get('weight', '/crane_2')); // 13

console.log('APP', app);