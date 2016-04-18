'use strict';

// Built in packages.
import { spawn } from 'child_process';

// Arguments
import { argv } from 'yargs';

// Generic npm packages.
import async from 'async';
import del from 'del';
import index from 'serve-index';

// The gulp related plugins.
import gulp from 'gulp';
import serve from 'gulp-serve';
import tap from 'gulp-tap';
import gutil from 'gulp-util';
import babel from 'gulp-babel';
import sourcemaps from 'gulp-sourcemaps';

// The port on which the local server should serve up the reports on.
const port = 3333;

// The folder in which the generated reports should be saved to.
const reportsDir = 'reports';

// A `glob` for where the Galen test suites can be found.
const suitesGlob = 'tests/specs/**/*.spec.js';

// Clean out the directory where the reports will be saved to. This is done so
// as not to pollute the reports directory with old/potentially unwanted files.
gulp.task('clean', (done) => {
    del([reportsDir], (err) => {
        if (err) {
            throw err;
        }
        done();
    });
});

// This is the task that will kick off running all the Galen test suites.
gulp.task('test', (done) => {
    const isPhantomjs = argv.browser === 'phantomjs';

    // Here we create an empty Array to store vinyl File Objects.
    let files = [];

    // Here we define a simple utility Function that we will call to
    // execute the Galen specs.
    var galen = (file, callback) => {
        spawn('galen', [
            'test',
            file.path,
            isPhantomjs ? '-Dphantomjs.binary.path=/Users/ytanruengsri/dev/tools/phantomjs/bin/phantomjs' : '',
            '--htmlreport',
            `${reportsDir}/${file.relative.replace(/\.js/, '')}`
        ], {'stdio' : 'inherit'}).on('close', (code) => {
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
        .pipe(babel())
        .pipe(tap((file) => {
            files.push(file);
        }))
        .on('end', () => {
            async.rejectSeries(files, (file, finished) => {
                galen(file, finished);
            }, (errors) => {
               if (errors && errors.length > 0) {
                  done('Galen reported failed tests: ' + (errors.map((f) => {
                     return f.relative;
                  }).join(', ')));
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
    'middleware': (req, res, next) => {
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
