_ = require 'lodash'
del = require 'del'
gulp = require 'gulp'
karma = require('karma').server
rename = require 'gulp-rename'
webpack = require 'gulp-webpack'
nodemon = require 'gulp-nodemon'
coffeelint = require 'gulp-coffeelint'
RewirePlugin = require 'rewire-webpack'
webpackSource = require 'webpack'

karmaConf = require './karma.defaults'
packangeConf = require './package.json'

paths =
  coffee: ['./src/**/*.coffee', './*.coffee', './test/**/*.coffee']
  rootScripts: './src/index.coffee'
  rootTests: './test/index.coffee'
  dist: './dist/'
  build: './build/'

gulp.task 'demo', ->
  gulp.start 'server'

gulp.task 'assets:prod', [
  'scripts:prod'
]

gulp.task 'build', ['clean:dist', 'scripts:dist']

gulp.task 'test', ['scripts:test', 'lint'], (cb) ->
  karma.start _.defaults(singleRun: true, karmaConf), cb

gulp.task 'watch', ->
  gulp.watch paths.coffee, ['test:phantom']

gulp.task 'test:phantom', ['scripts:test'], (cb) ->
  karma.start _.defaults({
    singleRun: true,
    browsers: ['PhantomJS']
  }, karmaConf), cb

gulp.task 'lint', ->
  gulp.src paths.coffee
    .pipe coffeelint()
    .pipe coffeelint.reporter()

gulp.task 'scripts:test', ->
  gulp.src paths.rootTests
  .pipe webpack
    devtool: '#inline-source-map'
    module:
      postLoaders: [
        { test: /\.coffee$/, loader: 'transform/cacheable?envify' }
      ]
      loaders: [
        { test: /\.coffee$/, loader: 'coffee' }
        { test: /\.json$/, loader: 'json' }
      ]
    plugins: [
      new RewirePlugin()
    ]
    resolve:
      extensions: ['.coffee', '.js', '.json', '']
      modulesDirectories: ['node_modules', './src']
  .pipe rename 'tests.js'
  .pipe gulp.dest paths.build

gulp.task 'test:phantom', ['scripts:test'], (cb) ->
  karma.start _.defaults({
    singleRun: true,
    browsers: ['PhantomJS']
  }, karmaConf), cb

gulp.task 'clean:dist', (cb) ->
  del paths.dist, cb

gulp.task 'lint:tests', ->
  gulp.src paths.tests
    .pipe coffeelint()
    .pipe coffeelint.reporter()

gulp.task 'server', ->
  nodemon {script: 'bin/dev_server.coffee', ext: 'null', ignore: ['**/*.*']}

gulp.task 'clean:dist', ->
  gulp.src paths.dist, read: false
    .pipe clean()

gulp.task 'scripts:dist', ->
  gulp.src paths.root
  .pipe webpack
    module:
      postLoaders: [
        { test: /\.coffee$/, loader: 'transform/cacheable?envify' }
      ]
      loaders: [
        { test: /\.coffee$/, loader: 'coffee' }
        { test: /\.json$/, loader: 'json' }
      ]
    plugins: [
      new webpackSource.optimize.UglifyJsPlugin()
    ]
    resolve:
      extensions: ['.coffee', '.js', '.json', '']
  .pipe rename 'clay_sdk_base.js'
  .pipe gulp.dest paths.dist
