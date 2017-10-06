'use strict';

var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var babelify = require('babelify');
var uglify = require('gulp-uglify');
var change = require('gulp-change');
var deumdify = require('deumdify');

// make the global variable assignment conditional on if it has already been assigned
function windowify(content) {
	return content.replace('g.d2lfetch = f()', 'g.d2lfetch = g.d2lfetch || f()');
}

gulp.task('scripts', function() {
	var bundler = browserify('./src/index.js', { standalone: 'd2lfetch' })
		.plugin(deumdify)
		.transform(babelify, { presets: [ 'env' ] });

	return bundler.bundle()
		.on('error', function(err) { console.error(err); this.emit('end'); }) //eslint-disable-line
		.pipe(source('d2lfetch.js'))
		.pipe(buffer())
		.pipe(change(windowify))
		.pipe(uglify())
		.pipe(gulp.dest('./dist'));
});

gulp.task('default', ['scripts']);
