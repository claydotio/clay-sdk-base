should = require('clay-chai').should()
Promise = require 'bluebird'
_ = require 'lodash'

postRoutes = {}

window.parent =
  postMessage: (messageString, targetOrigin) ->
    targetOrigin.should.be '*'
    message = JSON.parse messageString
    message.id.should.be.a.Number

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
      Clay.version.should.be 'v0.0.2'

  describe 'init()', ->
    describe 'signature', ->
      it 'requires clientId', ->
        Clay.init()
        .then ->
          throw new Error 'Expected error'
        , (err) ->
          err.message.should.be 'Missing clientId'

    describe 'status', ->
      it 'returns access token', ->

        routePost 'auth.getStatus',
          data:
            result: {accessToken: 1}

        Clay.init({clientId: 1})
        .then (status) ->
          status.accessToken.should.be.a.Number

    describe 'domain verification when framed', ->
      it 'dissallows invalid domains', ->

        routePost 'auth.getStatus', origin: 'http://evil.io'

        new Promise (resolve, reject) ->
          window.onerror = (err) ->
            resolve()

          Clay.init({clientId: 1})
          .then (res) ->
            reject new Error 'Missing error'
          , (err) ->
            reject new Error 'Non-global error'

      it 'allows invalid domains in debug mode', ->
        Clay.init({clientId: 1, debug: true})

  describe 'client()', ->
    describe 'state errors', ->
      it 'errors if init hasn\'t been called', ->
        Clay._setInitialized false

        Clay.client method: 'kik.send'
        .then (res) ->
          throw new Error 'Missing error'
        , (err) ->
          err.message.should.be 'Must call Clay.init() first'

      it 'errors if not framed', ->
        Clay._setInitialized true
        Clay._setFramed false

        Clay.client method: 'kik.send'
        .then (res) ->
          throw new Error 'Missing error'
        , (err) ->
          err.message.should.be 'Missing parent frame. Make sure
                                 you are within a clay game running
                                 frame'

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

    describe 'domain verification', ->
      before ->
        Clay._setDebug false

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

        Promise.map ['http://evilclay.io'], (domain) ->
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
