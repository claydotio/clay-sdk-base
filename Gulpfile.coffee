_ = require 'lodash'
gulp = require 'gulp'
gutil = require 'gulp-util'
browserify = require 'browserify'
clean = require 'gulp-clean'
sourcemaps = require 'gulp-sourcemaps'
source = require 'vinyl-source-stream'
runSequence = require 'gulp-run-sequence'
coffeelint = require 'gulp-coffeelint'
glob = require 'glob'
rename = require 'gulp-rename'
karma = require('karma').server

karmaConf = require './karma.defaults'

# Modify NODE_PATH for test require's
process.env.NODE_PATH += ':' + __dirname + '/src'

outFiles =
  scripts: 'bundle.js'
  styles: 'bundle.css'

paths =
  scripts: './src/**/*.coffee'
  tests: './test/**/*.coffee'
  root: './src/clay_sdk.coffee'
  #mock: './src/coffee/mock.coffee'
  dist: './dist/'
  build: './build/'

#isMockingApi = process.env.MOCK

# build for production
gulp.task 'build', (cb) ->
  runSequence 'clean:dist', 'scripts:prod', cb

# tests
gulp.task 'test', ['scripts:dev', 'scripts:test'], (cb) ->
  karma.start _.defaults(singleRun: true, karmaConf), cb

gulp.task 'test:phantom', ['scripts:dev', 'scripts:test'], (cb) ->
  karma.start _.defaults({
    singleRun: true,
    browsers: ['PhantomJS']
  }, karmaConf), cb

gulp.task 'scripts:test', ['lint:tests'], ->
  testFiles = glob.sync(paths.tests)
  browserify
    entries: testFiles
    extensions: ['.coffee']
    debug: true
  .bundle()
  .on 'error', errorHandler
  .pipe source outFiles.scripts
  .pipe gulp.dest paths.build + '/test/'

gulp.task 'watch', ->
  gulp.watch paths.scripts, ['scripts:dev', 'test:phantom']
  gulp.watch paths.tests, ['test:phantom']

# run coffee-lint
gulp.task 'lint:tests', ->
  gulp.src paths.tests
    .pipe coffeelint()
    .pipe coffeelint.reporter()


# run coffee-lint
gulp.task 'lint:scripts', ->
  gulp.src paths.scripts
    .pipe coffeelint()
    .pipe coffeelint.reporter()

#
# Dev compilation
#

errorHandler = ->
  gutil.log.apply null, arguments
  @emit 'end'

# init.coffee --> build/js/bundle.js
gulp.task 'scripts:dev', ['lint:scripts'], ->
  entries = [paths.root]

  # Order matters because mock overrides window.XMLHttpRequest
  # if isMockingApi
  #   entries = [paths.mock].concat entries

  browserify
    entries: entries
    extensions: ['.coffee']
    debug: true
  .bundle()
  .on 'error', errorHandler
  .pipe source outFiles.scripts
  .pipe rename 'clay_sdk.js'
  .pipe gulp.dest paths.build

#
# Production compilation
#

# rm -r dist
gulp.task 'clean:dist', ->
  gulp.src paths.dist, read: false
    .pipe clean()

# init.coffee --> dist/js/bundle.min.js
gulp.task 'scripts:prod', ['lint:scripts'], ->
  browserify
    entries: paths.root
    extensions: ['.coffee']
  .transform {global: true}, 'uglifyify'
  .bundle()
  .pipe source outFiles.scripts
  .pipe rename 'clay_sdk.js'
  .pipe gulp.dest paths.dist
