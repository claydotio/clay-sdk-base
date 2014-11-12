should = require('clay-chai').should()
Promise = require 'bluebird'
_ = require 'lodash'

packageConfig = require '../package.json'

postRoutes = {}

window.parent =
  postMessage: (messageString, targetOrigin) ->
    targetOrigin.should.be '*'
    message = JSON.parse messageString
    message.id.should.be.a.Number
    message._clay.should.be true
    message.jsonrpc.should.be '2.0'

    postRoutes[message.method].should.exist

    e = document.createEvent 'Event'
    e.initEvent 'message', true, true

    e.origin = postRoutes[message.method].origin or
      process.env.TRUSTED_DOMAIN or 'http://clay.io'
    e.data = JSON.stringify _.defaults(
      {id: message.id}
      postRoutes[message.method].data
    )

    window.dispatchEvent e

routePost = (method, {origin, data}) ->
  postRoutes[method] = {origin, data}

routePost 'ping', {}

Clay = require 'clay_sdk'

describe 'sdk', ->
  describe 'version', ->
    it 'has version', ->
      Clay.version.should.be 'v' + packageConfig.version

  describe 'init()', ->
    describe 'signature', ->
      it 'requires gameId', ->
        Clay.init()
        .then ->
          throw new Error 'Expected error'
        , (err) ->
          err.message.should.be 'Missing gameId'

    describe 'status', ->
      it 'returns access token', ->

        routePost 'auth.getStatus',
          data:
            result: {accessToken: 1}

        Clay.init({gameId: 1})
        .then (status) ->
          status.accessToken.should.be.a.Number

    describe 'config', ->
      it 'sets gameId', ->
        routePost 'auth.getStatus',
          data:
            result: {accessToken: 1}

        Clay.init({gameId: 1})
        .then ->
          Clay._config.gameId.should.be 1

    describe 'domain verification when framed', ->
      it 'dissallows invalid domains', ->

        routePost 'auth.getStatus', origin: 'http://evil.io'

        new Promise (resolve, reject) ->
          window.onerror = (err) ->
            resolve()

          Clay.init({gameId: 1})
          .then (res) ->
            reject new Error 'Missing error'
          , (err) ->
            reject new Error 'Non-global error'

      it 'allows invalid domains in debug mode', ->
        Clay.init({gameId: 1, debug: true})

  describe 'client()', ->
    describe 'state errors', ->
      it 'errors if init hasn\'t been called', ->
        Clay._setInitialized false

        Clay.client method: 'kik.send'
        .then (res) ->
          throw new Error 'Missing error'
        , (err) ->
          err.message.should.be 'Must call Clay.init() first'

    describe 'Posting', ->
      before ->
        Clay._setInitialized true
        Clay._setFramed true

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
          Clay._setInitialized true
          Clay._setFramed true

        it 'posts to parent', ->
          routePost 'share.any',
            origin: 'http://clay.io'
            data:
              result: {test: true}

          Clay.client method: 'share.any', params: {text: 'Hello World'}
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

      describe 'local', ->
        before ->
          Clay._setInitialized true
          Clay._setFramed false

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
        Clay._setDebug false
        Clay._setInitialized true
        Clay._setFramed true

      it 'Succeeds on valid domains', ->
        trusted = process.env.TRUSTED_DOMAIN or 'clay.io'

        domains = [
          "http://#{trusted}/"
          "https://#{trusted}/"
          "http://#{trusted}"
          "https://#{trusted}"

          # Sub domains
          "http://sub.#{trusted}/"
          "https://sub.#{trusted}/"
          "http://sub.#{trusted}"
          "https://sub.#{trusted}"

          "http://sub.sub.#{trusted}/"
          "https://sub.sub.#{trusted}/"
          "http://sub.sub.#{trusted}"
          "https://sub.sub.#{trusted}"
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
        trusted = process.env.TRUSTED_DOMAIN or 'clay.io'

        domains = [
          'http://evil.io/'
          'http://sub.evil.io/'
          'http://sub.sub.evil.io/'
          "http://evil.io/http://#{trusted}/"
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
