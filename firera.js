'use strict';

import Ozenfant from '../ozenfant/ozenfant';
import Parser from './Parser';
import App from './App';
import PackagePool from './PackagePool';
import utils from './utils';
const Obj = utils.Obj;
import Grid  from "./Grid";
import simpleHtmlTemplates from "./packages/SimpleHtmlTemplates";
import che_package from "./packages/Che";
import htmlCells from './packages/HtmlCells';
import core from './packages/Core';
import neu_ozenfant from './packages/Ozenfant';
 
 
const is_def = (a) => {
	return (a !== undefined) && (a !== Firera.undef);
}
const falsy = (a) => {
	return (!a) || (a === Firera.undef);
}

const show_performance = function(){
	const res = [];
	for(let i = 1; i < arguments.length; ++i){
		res.push(i + ': ' + (arguments[i] - arguments[i - 1]).toFixed(3));
	}
	res.push('Total: ' + (arguments[i - 1] - arguments[0]).toFixed(3));
	return res.join(', ');
}

const get_app = function(config){
	const app = new App(config, root_package_pool);
	App.apps.push(app);
	return app;
}
 
window.Firera = function(apps, config = {}){
	if(apps.$packages){
		config.packages = apps.$packages;
	}
	if(arguments.length > 1){
		// it's a set of grids we should join
		apps = Firera.join.apply(null, arguments);
	}
	const start = performance.now();
	const app = get_app(config);
	// getting real pbs
	app.cbs = Obj.map(apps, app.parse_cbs.bind(app), {except: ['$packages']});
	// now we should instantiate each pb
	if(!app.cbs.__root){
		// no root grid
		throw new Error('Cant find root app!');
	}
	//console.log(app);
	//const compilation_finished = performance.now();
	++app.grid_create_counter;
	app.startChange();
	app.root = new Grid(app, '__root', false, {$app_id: app.id}, null, null, '/');
	app.endChange();
	Firera.gridCreated(app, app.root.id, app.root.path, null);
	--app.grid_create_counter;
	if(app.grid_create_counter === 0){
		app.branchCreated(1);
	}
	//const init_finished = performance.now();
	//if(1 > 0){
	//	console.info('App run, it took ' + (init_finished - compilation_finished).toFixed(3) + ' milliseconds.'
	//	);
	//}
	return app;
};

Firera.onGridCreatedStack = {};
Firera.onBranchCreatedStack = {};
Firera.gridCreated = function(app, grid_id, path, parent){
	if(Firera.onGridCreatedStack[app.id]){
		for(let cb of Firera.onGridCreatedStack[app.id]){
			cb(app, grid_id, path, parent);
		}
	}
}
Firera.onGridCreated = (app_id, cb) => {
	utils.init_if_empty(Firera.onGridCreatedStack, app_id, []);
	Firera.onGridCreatedStack[app_id].push(cb);
};

const get_vals = (grid) => {
	const res = Object.assign({}, grid.cell_values);
	for(let child_name in grid.linked_grids){
		if(child_name === '..') continue;
		let child_id = grid.linked_grids[child_name];
		let child = grid.app.getGrid(child_id);
		res[child_name] = get_vals(child);
	}
	return res;
}

const root_package_pool = new PackagePool();
const Firera_UNDEFINED = function(){};
Firera_UNDEFINED.prototype.toString = () => 'Firera.UNDEFINED';
Firera.undef = new Firera_UNDEFINED;
Firera.noop = new function(){};
Firera.apps = App.apps;
Firera.run = Firera;
Firera.Ozenfant = Ozenfant;
Firera.utils = utils;
Firera.is_def = is_def;
Firera.is_falsy = falsy;

Firera.getAppStruct = function() {
	return Firera.apps.map(App.get_app_struct);
}
Firera.loadPackage = function(pack) {
	root_package_pool.load(pack);
}
Firera.join = function(...args){
	const join = (a, b) => {
		for(let i in b){
			a[i] = b[i];
		}
	}
	const res = Object.assign({}, args[0]);
	for(let key in args){
		const grid = args[key];
		if(key === 0) continue;
		for(let k in grid){
			if(k === '$packages'){
				utils.init_if_empty(res, k, []);
				res.$packages = res.$packages.concat(grid[k]);
				continue;
			}
			utils.init_if_empty(res, k, {});
			join(res[k], grid[k]); 
		}
	}
	return res;
}
Firera.loadPackage(core);
Firera.loadPackage(che_package);
Firera.packagesAvailable = {simpleHtmlTemplates, htmlCells, neu_ozenfant, che: che_package};
Firera.func_test_export = {parse_pb: Parser.parse_pb, parse_fexpr: Parser.parse_fexpr};
Firera._ = utils;

module.exports = Firera;
