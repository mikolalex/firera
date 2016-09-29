var source = require('vinyl-source-stream');
var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('browserify');
var watchify = require('watchify');
var notify = require("gulp-notify");

var buildDir = './dist';
var file = 'firera.js';
var path = './';


function handleErrors() {
  var args = Array.prototype.slice.call(arguments);
  notify.onError({
    title: "Compile Error",
    message: "<%= error.message %>"
  }).apply(this, args);
  this.emit('end'); // Keep gulp from hanging on this task
}


// Based on: http://blog.avisi.nl/2014/04/25/how-to-keep-a-fast-build-with-browserify-and-reactjs/
function buildScript(file, watch) {
  var props = {entries: [path + file]};
  var bundler = watch ? watchify(props) : browserify(props);
  function rebundle() {
    var stream = bundler.bundle({debug: true});
    return stream.on('error', handleErrors)
    .pipe(source(file))
    .pipe(gulp.dest(buildDir + '/'));
  }
  bundler.on('update', function() {
    rebundle();
    gutil.log('~~~ Successfully rebuilt ~~~');
  });
  return rebundle();
}


gulp.task('build', function() {
  return buildScript(file, false);
});


gulp.task('default', ['build'], function() {
  return buildScript(file, true);
});