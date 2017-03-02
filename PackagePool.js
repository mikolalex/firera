import utils from './utils';

const kcopy = function(from, to){
	for(let i in from){
		to[i] = from[i];
	}
}
const PackagePool = function(proto = {}, app_id){
	this.app_id = app_id;
	this.cellMatchers = Object.assign({}, proto.cellMatchers);
	this.macros = Object.assign({}, proto.macros);
	this.eachGridMixin = Object.assign({}, proto.eachGridMixin);
}
PackagePool.prototype.load = function(pack){
	if(typeof pack === 'string'){
		if(!Firera.packagesAvailable[pack]){
			utils.error('Package not found: ' + pack);
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
		Firera.onGridCreated(this.app_id, pack.onGridCreated);
	}
	if(pack.onBranchCreated){
		utils.init_if_empty(Firera.onBranchCreatedStack, this.app_id, []);
		Firera.onBranchCreatedStack[this.app_id].push(pack.onBranchCreated);
	}
}
module.exports = PackagePool;
