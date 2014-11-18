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
Clay = ClayRoot.__get__ 'sdk'

TRUSTED_DOMAIN = process.env.TRUSTED_DOMAIN or 'clay.io'

postRoutes = {}

window.parent =
  postMessage: (messageString, targetOrigin) ->
    targetOrigin.should.be '*'
    message = JSON.parse messageString
    message.id.should.be.a.Number
    message._clay.should.be true
    message.jsonrpc.should.be '2.0'
    message.gameId.should.be.a.String

    postRoutes[message.method].should.exist

    e = document.createEvent 'Event'
    e.initEvent 'message', true, true

    e.origin = postRoutes[message.method].origin or ('http://' + TRUSTED_DOMAIN)
    e.data = JSON.stringify _.defaults(
      {id: message.id}
      postRoutes[message.method].data
    )

    window.dispatchEvent e

routePost = (method, {origin, data}) ->
  postRoutes[method] = {origin, data}

routePost 'ping', {}

describe 'sdk', ->
  @timeout 1000

  describe 'version', ->
    it 'has version', ->
      Clay.version.should.be 'v' + packageConfig.version

  describe 'init()', ->
    describe 'status', ->
      it 'returns access token', ->

        routePost 'auth.getStatus',
          data:
            result: {accessToken: 1}

        Clay.init({gameId: '1'})
        .then (status) ->
          status.accessToken.should.be.a.Number

    describe 'config', ->
      it 'sets gameId', ->
        Clay.config = new Promiz()

        routePost 'auth.getStatus',
          data:
            result: {accessToken: 1}

        Clay.init({gameId: '2'})
        .then ->
          Clay.config.then (config) ->
            config.gameId.should.be '2'

    describe 'signature', ->
      it 'gameId type checks undefined', ->
        Clay.init()
        .then ->
          throw new Error 'Expected error'
        , (err) ->
          err.message.should.be 'Missing or invalid gameId'

      it 'gameId type checks number', ->
        Clay.init(gameId: 1)
        .then ->
          throw new Error 'Expected error'
        , (err) ->
          err.message.should.be 'Missing or invalid gameId'

    describe 'domain verification when framed', ->
      it 'dissallows invalid domains', ->

        routePost 'auth.getStatus', origin: 'http://evil.io'

        new Promise (resolve, reject) ->
          window.onerror = (err) ->
            resolve()

          Clay.init({gameId: '1'})
          .then (res) ->
            reject new Error 'Missing error'
          , (err) ->
            reject new Error 'Non-global error'

      it 'allows invalid domains in debug mode', ->
        routePost 'auth.getStatus', origin: 'http://clay.io'
        Clay.init({gameId: '1', debug: true})

  describe 'client()', ->

    describe 'state errors', ->
      it 'errors if init hasn\'t been called', ->
        Clay.initHasBeenCalled = false

        Clay.client method: 'kik.send'
        .then (res) ->
          throw new Error 'Missing error'
        , (err) ->
          err.message.should.be 'Must call Clay.init() first'

    describe 'signature', ->
      before ->
        Clay.initHasBeenCalled = true

      it 'errors if method missing', ->
        Clay.client()
        .then (res) ->
          throw new Error 'Missing error'
        , (err) ->
          err.message.should.be 'Missing or invalid method'

      it 'errors if method is an object', ->
        Clay.client(method: {})
        .then (res) ->
          throw new Error 'Missing error'
        , (err) ->
          err.message.should.be 'Missing or invalid method'

      it 'errors is method is a number', ->
        Clay.client(method: 123)
        .then (res) ->
          throw new Error 'Missing error'
        , (err) ->
          err.message.should.be 'Missing or invalid method'

      it 'succeeds if params is an object', ->
        routePost 'share.any',
          origin: 'http://clay.io'
          data:
            result: {test: true}

        Clay.client(method: 'share.any', params: {text: 'test'})

      it 'errors if params is a string', ->
        Clay.client(method: 'kik.send', params: 'param')
        .then (res) ->
          throw new Error 'Missing error'
        , (err) ->
          err.message.should.be 'Params must be an array'

      it 'errors if params is a number', ->
        Clay.client(method: 'kik.send', params: 123)
        .then (res) ->
          throw new Error 'Missing error'
        , (err) ->
          err.message.should.be 'Params must be an array'

    describe 'Posting', ->
      before ->
        Clay.initHasBeenCalled = true
        ClayRoot.__set__ 'IS_FRAMED', true

      it 'posts to parent frame', ->
        routePost 'kik.getUser',
          origin: 'http://clay.io'
          data:
            result: {test: true}

        Clay.client method: 'kik.getUser'
        .then (user) ->
          user.test.should.be true

      it 'recieved errors', ->
        routePost 'kik.getUser',
          origin: 'http://clay.io'
          data:
            error: {message: 'abc'}

        Clay.client method: 'kik.getUser'
        .then ->
          throw new Error 'Error expected'
        , (err) ->
          err.message.should.be 'abc'

    describe 'share.any', ->
      describe 'framed', ->
        before ->
          Clay.initHasBeenCalled = true
          ClayRoot.__set__ 'IS_FRAMED', true

        it 'posts to parent', ->
          routePost 'share.any',
            origin: 'http://clay.io'
            data:
              result: {test: true}

          Clay.client method: 'share.any', params: [{text: 'Hello World'}]
          .then (res) ->
            res.test.should.be true

        it 'falls back to local if parent fails', ->
          routePost 'share.any',
            origin: 'http://clay.io'
            data:
              error: {message: 'something went wrong'}

          openCnt = 0
          window.open = (url) ->
            openCnt += 1
            url.should.be 'https://twitter.com/intent/tweet?text=Hello%20World'

          Clay.client method: 'share.any', params: [{text: 'Hello World'}]
          .then (res) ->
            openCnt.should.be 1

        it 'errors if missing text', ->
          routePost 'share.any',
            origin: 'http://clay.io'
            data:
              error: {message: 'something went wrong'}

          Clay.client method: 'share.any'
          .then ->
            throw new Error 'Error expected'
          , (err) ->
            err.message.should.be 'text parameter is missing or invalid'

      describe 'local', ->
        before ->
          Clay.initHasBeenCalled = true
          ClayRoot.__set__ 'IS_FRAMED', false

        it 'tweets', ->
          openCnt = 0
          window.open = (url) ->
            openCnt += 1
            url.should.be 'https://twitter.com/intent/tweet?text=Hello%20World'

          Clay.client method: 'share.any', params: [{text: 'Hello World'}]
          .then (res) ->
            openCnt.should.be 1

    describe 'domain verification', ->
      before ->
        Clay.config.then (config) ->
          config.debug = false
          Clay.initHasBeenCalled = true
          ClayRoot.__set__ 'IS_FRAMED', true

      it 'Succeeds on valid domains', ->
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
          routePost 'kik.getUser',
            origin: domain
            data:
              result: {test: true}

          Clay.client method: 'kik.getUser'
          .then (user) ->
            user.test.should.be true

      it 'Errors on invalid domains', ->
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

            window.onerror = (err) ->
              resolve()

            Clay.client method: 'kik.getUser'
            .then (res) ->
              reject new Error 'Missing error'
            , (err) ->
              reject new Error 'Non-global error'
