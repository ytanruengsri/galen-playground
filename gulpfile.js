// Built in packages.
var spawn = require('child_process').spawn;

// Arguments
var argv = require('yargs').argv;

// Generic npm packages.
var async = require('async');
var del   = require('del');
var index = require('serve-index');

// The gulp related plugins.
var gulp  = require('gulp');
var serve = require('gulp-serve');
var tap   = require('gulp-tap');
var gutil = require('gulp-util');

// The port on which the local server should serve up the reports on.
var port = 3333;

// The folder in which the generated reports should be saved to.
var reportsDir = 'reports';

// A `glob` for where the Galen test suites can be found.
var suitesGlob = 'tests/specs/**/*.spec.js';

// Clean out the directory where the reports will be saved to. This is done so
// as not to pollute the reports directory with old/potentially unwanted files.
gulp.task('clean', function (done) {
    del([reportsDir], function (err) {
        if (err) {
            throw err;
        }
        done();
    });
});

gulp.task('logging', ['clean'], function (done) {
    gutil.log('Starting logging task ....');
    done();
});

// This is the task that will kick off running all the Galen test suites.
gulp.task('test', function (done) {
    var isPhantomjs = argv.browser == 'phantomjs';

    // Here we create an empty Array to store vinyl File Objects.
    var files = [];

    // Here we define a simple utility Function that we will call to
    // execute the Galen specs.
    var galen = function galen (file, callback) {
        spawn('galen', [
            'test',
            file.path,
            isPhantomjs ? '-Dphantomjs.binary.path=/Users/ytanruengsri/dev/tools/phantomjs/bin/phantomjs' : '',
            '--htmlreport',
            reportsDir + '/' + file.relative.replace(/\.js/, '')
        ], {'stdio' : 'inherit'}).on('close', function (code) {
            callback(code === 0);
        });
    };

    // Here we source our suites and immediately pass them to `gulp-tap`. The
    // `gulp-tap` plugin allows you to "tap into" each file that is streamed
    // into the pipe. We use this functionality to build up the `files` Array
    // and populate it with vinyl File Objects.
    //
    // Once `gulp-tap` has finished
    // doing its thing, we listen to the `end` event and then pass off the built
    // up `files` Array to `async.mapSeries`.
    //
    // This will sequentially iterate through the Array perform the first
    // callback and then when all items in the Array have been iterated over, it
    // will perform the next callback.
    //
    // The next callback executes the `done()` handler that tells gulp that we
    // are finished with this task and that we are good to continue with
    // whichever task in next in the queue.
    gulp.src([suitesGlob])
        .pipe(tap(function (file) {
            files.push(file);
        }))
        .on('end', function () {
            async.rejectSeries(files, function (file, finished) {
                galen(file, finished);
            }, function (errors) {
               if (errors && errors.length > 0) {
                  done("Galen reported failed tests: " + (errors.map(function(f) {
                     return f.relative;
                  }).join(", ")));
               } else {
                  done();
               }
            });
        });
});

// Here we define a task to serve up the generated reports. This allows the
// generated HTML to be easily viewed in the browser, simply navigate to
// `http://localhost:[port]`. The value for the port is defined at the top of
// this file.
//
// This task requires that the `test` task is run first. This is so Galen can
// generate the required reports and present us with the files to display.
gulp.task('serve', ['test'], serve({
    'middleware' : function (req, res, next) {
        index(reportsDir, {
            'filter'     : false,
            'hidden'     : true,
            'icons'      : true,
            'stylesheet' : false,
            'template'   : false,
            'view'       : 'details'
        })(req, res, next);
    },
    'port' : port,
    'root' : reportsDir
}));

// And lastly, we define a `default` task to kick off if `gulp` is called with
// no additional arguments.
//
// If this happens, we then kick off the `serve` task which will in turn kick
// off the `test` task.
//
// Once this is all complete you can navigate to localhost in your browser and
// see the results of the tests.
gulp.task('default', ['serve']);
