var source = require('vinyl-source-stream');
var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('browserify');
var watchify = require('watchify');
var notify = require("gulp-notify");
var es2015 = require('babel-preset-es2015');
var babelify = require('babelify');
var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');
var rename = require("gulp-rename");

var entryPoints = {
	main: ['./', 'firera.js', ['./dist', './FireraInspector', './examples', './docs']],
	test: ['./test/', 'test.js', './test/br'],
	upload_photo: ['./examples/upload_photo/', 'index.js', './examples/upload_photo/br'],
	benchmarks: ['./benchmarks/', 'index.js', './benchmarks/br']
}

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
  var bundler = watchify(browserify(props)
		.transform(babelify, {presets: [es2015], sourceMaps: false})
  );
  function rebundle() {
    const b = bundler
			.bundle({debug: true})
			.on('error', handleErrors)
			.pipe(source(ep[1]))
			.pipe(buffer())
			.pipe(sourcemaps.init({loadMaps: true}));
	if(ep[2] instanceof Array){
		for(var p of ep[2]){
			b.pipe(gulp.dest(p + '/'));
		}
	} else {
		b.pipe(gulp.dest(ep[2] + '/'));
	}
	return b;
  }
  bundler.on('update', function() {
    rebundle();
    gutil.log('~~~ Successfully rebuilt ~~~');
  });
  return rebundle();
}


gulp.task('build', function() {
	for(var ep in entryPoints){
		var entry = process.argv[3] ? process.argv[3].replace('--', '') : 'main';
		if(ep !== entry){
			continue;
		}
		const conf = entryPoints[ep];
		buildScript(conf, false);
	}
});


gulp.task('default', ['build'], function() {
	var entry = process.argv[3] ? process.argv[3].replace('--', '') : 'main';
	for(var ep in entryPoints){
		if(ep !== entry){
			continue;
		}
		const conf = entryPoints[ep];
		buildScript(conf, false);
	}
});

var uglify = require('gulp-uglify');
var pump = require('pump');
 
gulp.task('compress', function (cb) {
  pump([
        gulp.src('dist/firera.js'),
        uglify(),
		rename('firera.min.js'),
        gulp.dest('dist')
    ],
    cb
  );
});