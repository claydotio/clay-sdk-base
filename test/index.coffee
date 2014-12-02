# Function::bind polyfill for rewirejs + phantomjs
unless Function::bind
  Function::bind = (oThis) ->

    # closest thing possible to the ECMAScript 5
    # internal IsCallable function
    throw new TypeError('Function.prototype.bind - what is trying to be bound
     is not callable')  if typeof this isnt 'function'
    aArgs = Array::slice.call(arguments, 1)
    fToBind = this
    fNOP = -> null

    fBound = ->
      fToBind.apply (if this instanceof fNOP and oThis then this else oThis),
      aArgs.concat(Array::slice.call(arguments))

    fNOP.prototype = this.prototype
    fBound:: = new fNOP()
    fBound

should = require('clay-chai').should()
Promise = require 'bluebird'
Promiz = require 'promiz'
_ = require 'lodash'
rewire = require 'rewire'

packageConfig = require '../package.json'
ClayRoot = rewire 'index'
Clay = ClayRoot.__get__ 'Clay'

TRUSTED_DOMAIN = process.env.TRUSTED_DOMAIN or 'clay.io'

postRoutes = {}

ClayRoot.__set__ 'window.parent.postMessage', (messageString, targetOrigin) ->
  targetOrigin.should.be '*'
  message = JSON.parse messageString
  _.isNumber(message.id).should.be true
  message._portal.should.be true
  message.jsonrpc.should.be '2.0'

  postRoutes[message.method].should.exist

  if postRoutes[message.method].timeout
    return

  result = postRoutes[message.method].data

  if _.isFunction result
    result = result(message)

  e = document.createEvent 'Event'
  e.initEvent 'message', true, true

  e.origin = postRoutes[message.method].origin or ('http://' + TRUSTED_DOMAIN)
  e.data = JSON.stringify _.defaults(
    {id: message.id, _portal: true}
    result
  )

  window.dispatchEvent e

routePost = (method, {origin, data, timeout}) ->
  postRoutes[method] = {origin, data, timeout}

routePost 'ping', {data: result: 'pong'}
routePost 'auth.getStatus',
  data:
    result: {accessToken: 1}

describe 'sdk', ->
  @timeout 200

  describe 'version', ->
    it 'has version', (done) ->
      Clay 'version', (err, v) ->
        v.should.be 'v' + packageConfig.version

        done(err)

  describe 'signature', ->
    it 'errors on invalid root method', (done) ->
      Clay 'something', (err) ->
        err.message.should.be 'Method not found'
        done()

  describe 'init()', ->
    describe 'status', ->
      it 'returns access token', (done) ->

        Clay 'init', {gameId: '1'}, (err, status) ->
          status.accessToken.should.be.a.Number
          done(err)

    describe 'config', ->
      it 'sets gameId', (done) ->
        cfg = new Promiz (@resolve, @reject) -> null
        ClayRoot.__set__ 'config', cfg

        routePost 'auth.getStatus',
          data:
            result: {accessToken: 1}

        Clay 'init', {gameId: '2'}

        cfg.then (config) ->
          config.gameId.should.be '2'
        .then (x) -> done()
        .catch done

    describe 'signature', ->
      it 'gameId type checks undefined', (done) ->
        Clay 'init', {}, (err) ->
          err.message.should.be 'Missing or invalid gameId'
          done()

      it 'gameId type checks number', (done) ->
        Clay 'init', {gameId: 1}, (err) ->
          err.message.should.be 'Missing or invalid gameId'
          done()

    describe 'domain verification when framed', ->
      it 'dissallows invalid domains', (done) ->

        routePost 'auth.getStatus', origin: 'http://evil.io', data: result: '1'

        Clay 'init', {gameId: '1'}, (err) ->
          err.should.exist
          done()

      it 'allows invalid domains in debug mode', (done) ->
        routePost 'auth.getStatus', origin: 'http://evil.io', data: result: '1'
        Clay 'init', {gameId: '1', debug: true}, done

  describe 'client()', ->
    describe 'state errors', ->
      before ->
        ClayRoot.__set__ 'initHasBeenCalled', false

      it 'errors if init hasn\'t been called', (done) ->
        Clay 'client.kik.send', (err) ->
          err.message.should.be 'Must call Clay(\'init\') first'
          done()

    describe 'signature', ->
      before ->
        ClayRoot.__set__ 'initHasBeenCalled', true
        ClayRoot.__set__ 'config', Promiz.resolve {gameId: '1'}

      it 'errors if method missing', (done) ->
        Clay 'client', (err) ->
          err.message.should.be 'Missing or invalid method'
          done()

      it 'succeeds if params is an object', (done) ->
        routePost 'share.any',
          origin: 'http://clay.io'
          data:
            result: {test: true}

        Clay 'client.share.any', {text: 'test'}, (err) ->
          done(err)

      it 'errors if params is a string', (done) ->
        Clay 'client.kik.send', 'param', (err) ->
          err.message.should.be 'Params must be an array'
          done()

      it 'errors if params is a number', (done) ->
        Clay 'client.kik.send', 123, (err) ->
          err.message.should.be 'Params must be an array'
          done()

    describe  'Posting', ->
      before ->
        ClayRoot.__set__ 'initHasBeenCalled', true
        ClayRoot.__set__ 'config', Promiz.resolve {gameId: '1'}

      it 'posts to parent frame', (done) ->
        routePost 'kik.getUser',
          origin: 'http://clay.io'
          data:
            result: {test: true}

        Clay 'client.kik.getUser', (err, user) ->
          should.not.exist err
          user.test.should.be true
          done()

      it 'recieved errors', (done) ->
        routePost 'kik.getUser',
          origin: 'http://clay.io'
          data:
            error: {message: 'abc'}

        Clay 'client.kik.getUser', (err) ->
          err.message.should.be 'abc'
          done()

      it 'times out', (done) ->
        portal = ClayRoot.__get__ 'portal'
        routePost 'infinite.loop', timeout: true

        portal.down()
        portal.up timeout: 1

        Clay 'client.infinite.loop', (err) ->
          err.message.should.be 'Message Timeout'
          done()

    describe 'share.any', ->
      describe 'framed', ->
        before ->
          ClayRoot.__set__ 'initHasBeenCalled', true
          ClayRoot.__set__ 'config', Promiz.resolve {gameId: '1'}

        it 'posts to parent', (done) ->
          routePost 'share.any',
            origin: 'http://clay.io'
            data: (message) ->
              message.params[0].gameId.should.be '1'
              result: {test: true}

          Clay 'client.share.any', [{text: 'Hello World'}], (err, res) ->
            res.test.should.be true
            done(err)

        it 'falls back to local if parent fails', (done) ->
          routePost 'share.any',
            origin: 'http://clay.io'
            data:
              error: {message: 'something went wrong'}

          openCnt = 0
          ClayRoot.__set__ 'window.open', (url) ->
            openCnt += 1
            url.should.be 'https://twitter.com/intent/tweet?text=Hello%20World'

          Clay 'client.share.any', [{text: 'Hello World'}], (err, res) ->
            openCnt.should.be 1
            done(err)

        it 'errors if missing text', (done) ->
          routePost 'share.any',
            origin: 'http://clay.io'
            data:
              error: {message: 'something went wrong'}

          Clay 'client.share.any', (err) ->
            err.message.should.be 'text parameter is missing or invalid'
            done()

      describe 'local', ->
        before ->
          ClayRoot.__set__ 'initHasBeenCalled', true
          ClayRoot.__set__ 'config', Promiz.resolve {gameId: '1'}

        it 'tweets', (done) ->
          openCnt = 0
          ClayRoot.__set__ 'window.open', (url) ->
            openCnt += 1
            url.should.be 'https://twitter.com/intent/tweet?text=Hello%20World'

          Clay 'client.share.any', [{text: 'Hello World'}], (err, res) ->
            openCnt.should.be 1
            done(err)

    describe 'register', ->
      before ->
        ClayRoot.__set__ 'initHasBeenCalled', false

      it 'registers function', (done) ->
        rootConfig = new Promiz (@resolve, @reject) -> null
        ClayRoot.__set__ 'config',  rootConfig

        Clay 'register', {method: 'ui', fn: (config) ->
          (method, params, cb) ->
            config.then ({gameId}) ->
              {
                test: true
                hello: params[0].hello
                gameId: gameId
              }
            .then (x) -> cb null, x
            .catch cb
        }

        rootConfig.resolve {gameId: '1'}

        Clay 'ui.test', {hello: 'world'}, (err, res) ->
          res.test.should.be true
          res.hello.should.be 'world'
          res.gameId.should.be '1'
          done(err)

    describe 'domain verification', ->
      @timeout 1000
      before ->
        Clay 'init', {gameId: '1'}
        ClayRoot.__set__ 'initHasBeenCalled', true
        ClayRoot.__set__ 'config', Promiz.resolve {gameId: '1'}

      it 'Succeeds on valid domains', (done) ->
        domains = [
          "http://#{TRUSTED_DOMAIN}/"
          "https://#{TRUSTED_DOMAIN}/"
          "http://#{TRUSTED_DOMAIN}"
          "https://#{TRUSTED_DOMAIN}"

          # Sub domains
          "http://sub.#{TRUSTED_DOMAIN}/"
          "https://sub.#{TRUSTED_DOMAIN}/"
          "http://sub.#{TRUSTED_DOMAIN}"
          "https://sub.#{TRUSTED_DOMAIN}"

          "http://sub.sub.#{TRUSTED_DOMAIN}/"
          "https://sub.sub.#{TRUSTED_DOMAIN}/"
          "http://sub.sub.#{TRUSTED_DOMAIN}"
          "https://sub.sub.#{TRUSTED_DOMAIN}"
        ]

        Promise.map domains, (domain) ->
          routePost 'domain.test',
            origin: domain
            data:
              result: {test: true}

          Clay 'client.domain.test', (err, user) ->
            if err
              throw err
            user.test.should.be true
        .then -> done()
        .catch done

      it 'Errors on invalid domains', (done) ->

        domains = [
          'http://evil.io/'
          'http://sub.evil.io/'
          'http://sub.sub.evil.io/'
          "http://evil.io/http://#{TRUSTED_DOMAIN}/"
        ]

        Promise.each domains, (domain) ->
          new Promise (resolve, reject) ->
            routePost 'kik.getUser',
              origin: domain
              data:
                result: {test: true}

            Clay 'client.kik.getUser', (err) ->
              unless err
                reject new Error 'Missing error'

              resolve()
        .then -> done()
        .catch done
