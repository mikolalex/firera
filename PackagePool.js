var utils = require('./utils');

var kcopy = function(from, to){
	for(let i in from){
		to[i] = from[i];
	}
}
var PackagePool = function(proto = {}, app_id){
	this.app_id = app_id;
	this.cellMatchers = Object.assign({}, proto.cellMatchers);
	this.macros = Object.assign({}, proto.macros);
	this.eachGridMixin = Object.assign({}, proto.eachGridMixin);
}
PackagePool.prototype.load = function(pack){
	if(typeof pack === 'string'){
		if(!Firera.packagesAvailable[pack]){
			console.error('Package not found!', pack);
			return;
		}
		pack = Firera.packagesAvailable[pack];
	}
	kcopy(pack.cellMatchers, this.cellMatchers);
	kcopy(pack.macros, this.macros);
	if(pack.eachGridMixin){
		// update the mixin for each grid created
		Object.assign(this.eachGridMixin, pack.eachGridMixin);
	}
	if(pack.onGridCreated){
		utils.init_if_empty(Firera.onGridCreatedStack, this.app_id, []);
		Firera.onGridCreatedStack[this.app_id].push(pack.onGridCreated);
	}
	if(pack.onBranchCreated){
		utils.init_if_empty(Firera.onBranchCreatedStack, this.app_id, []);
		Firera.onBranchCreatedStack[this.app_id].push(pack.onBranchCreated);
	}
}
module.exports = PackagePool;
