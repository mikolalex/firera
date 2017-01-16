var source = require('vinyl-source-stream');
var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('browserify');
var watchify = require('watchify');
var notify = require("gulp-notify");

var entryPoints = [
	['./', 'firera.js', './dist'],
	['./test/', 'test.js', './test/br'],
	['./test/', 'polygon.js', './test/br'],
]

function handleErrors() {
  var args = Array.prototype.slice.call(arguments);
  notify.onError({
    title: "Compile Error",
    message: "<%= error.message %>"
  }).apply(this, args);
  this.emit('end'); // Keep gulp from hanging on this task
}


// Based on: http://blog.avisi.nl/2014/04/25/how-to-keep-a-fast-build-with-browserify-and-reactjs/
function buildScript(ep, watch) {
  var props = {entries: [ep[0] + ep[1]]};
  var bundler = watch ? watchify(props) : browserify(props);
  function rebundle() {
    var stream = bundler.bundle({debug: true});
    return stream.on('error', handleErrors)
    .pipe(source(ep[1]))
    .pipe(gulp.dest(ep[2] + '/'));
  }
  bundler.on('update', function() {
    rebundle();
    gutil.log('~~~ Successfully rebuilt ~~~');
  });
  return rebundle();
}


gulp.task('build', function() {
	for(var ep of entryPoints){
		buildScript(ep, false);
	}
});


gulp.task('default', ['build'], function() {
	for(var ep of entryPoints){
		buildScript(ep, true);
	}
});