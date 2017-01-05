var kcopy = function(from, to){
	for(let i in from){
		to[i] = from[i];
	}
}
var PackagePool = function(proto = {}, app_id){
	this.app_id = app_id;
	this.cellMatchers = Object.assign({}, proto.cellMatchers);
	this.predicates = Object.assign({}, proto.predicates);
	this.eachHashMixin = Object.assign({}, proto.eachHashMixin);
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
	kcopy(pack.predicates, this.predicates);
	if(pack.eachHashMixin){
		// update the mixin for each hash created
		Object.assign(this.eachHashMixin, pack.eachHashMixin);
	}
	if(pack.onHashCreated){
		init_if_empty(onHashCreatedStack, this.app_id, []);
		onHashCreatedStack[this.app_id].push(pack.onHashCreated);
	}
}
module.exports = PackagePool;
