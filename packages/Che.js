var che = require('../../shche/shche');

module.exports = {
	macros: {
		che(expr){
			var [expr, cbs] = expr;
			cbs = cbs || [];
			var succ_cb;
			var obj = che.create(expr, {
				onOutput(key, val){
					//console.log('outputting from che', key, val);
				},
				onSuccess(){
					//console.log('che scenario successfully finished', succ_cb, obj.state);
					succ_cb(obj.state);
				}
			}, ...cbs);
			var str = ['asyncClosureFunnel', () => {
				return (cb, cell, val) => {
					//console.log('something dripped', cb, cell, val);
					succ_cb = cb;
					obj.drip(cell, val);
					return 'a';
				}
			}, ...obj.needed_events]
			//console.log('getting che expr', str);
			return str;
		}
	}
} 