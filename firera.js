'use strict';

import Ozenfant from '../ozenfant/ozenfant';
import Parser from './Parser';
var App = require('./App');
var PackagePool = require('./PackagePool');
var utils = require('./utils');
var Obj = utils.Obj;
var Grid = require("./Grid");
var simpleHtmlTemplates = require("./packages/SimpleHtmlTemplates");
var che_package = require("./packages/Che");
var ozenfant = require('./packages/OzenfantOld');
var ozenfant_new = require('./packages/OzenfantNew');
var htmlCells = require('./packages/HtmlCells');
var core = require('./packages/Core');
var neu_ozenfant = require('./packages/NeuOzenfant');
 

var is_def = (a) => {
	return (a !== undefined) && (a !== Firera.undef);
}

var show_performance = function(){
	const res = [];
	for(var i = 1; i < arguments.length; ++i){
		res.push(i + ': ' + (arguments[i] - arguments[i - 1]).toFixed(3));
	}
	res.push('Total: ' + (arguments[i - 1] - arguments[0]).toFixed(3));
	return res.join(', ');
}

var get_app = function(packages){
	const app = new App(packages, root_package_pool);
	App.apps.push(app);
	return app;
}

window.Firera = function(config){
	if(arguments.length > 1){
		// it's a set of grids we should join
		config = Firera.join.apply(null, arguments);
	}
	var start = performance.now();
	var app = get_app(config.$packages);
	// getting real pbs
	app.cbs = Obj.map(config, app.parse_cbs.bind(app), {except: ['$packages']});
	// now we should instantiate each pb
	if(!app.cbs.__root){
		// no root grid
		throw new Error('Cant find root app!');
	}
	//console.log(app);
	//var compilation_finished = performance.now();
	++app.grid_create_counter;
	app.root = new Grid(app, '__root', false, {$app_id: app.id}, null, null, '/');
	Firera.gridCreated(app, app.root.id, app.root.path, null);
	--app.grid_create_counter;
	if(app.grid_create_counter === 0){
		app.branchCreated(1);
	}
	//var init_finished = performance.now();
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

var get_vals = (grid) => {
	var res = Object.assign({}, grid.cell_values);
	for(let child_name in grid.linked_grids){
		if(child_name === '..') continue;
		let child_id = grid.linked_grids[child_name];
		let child = grid.app.getGrid(child_id);
		res[child_name] = get_vals(child);
	}
	return res;
}

var root_package_pool = new PackagePool();

Firera.undef = new function(){};
Firera.noop = new function(){};
Firera.apps = App.apps;
Firera.run = Firera;
Firera.Ozenfant = Ozenfant;
Firera.is_def = is_def;

Firera.getAppStruct = function() {
	return Firera.apps.map(App.get_app_struct);
}
Firera.loadPackage = function(pack) {
	root_package_pool.load(pack);
}
Firera.join = function(...args){
	var join = (a, b) => {
		for(let i in b){
			a[i] = b[i];
		}
	}
	var res = Object.assign({}, args[0]);
	for(let key in args){
		var grid = args[key];
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
Firera.packagesAvailable = {simpleHtmlTemplates, htmlCells, ozenfant, ozenfant_new, neu_ozenfant, che: che_package};
Firera.func_test_export = {parse_pb: Parser.parse_pb, parse_fexpr: Parser.parse_fexpr};
Firera._ = utils;

module.exports = Firera;
