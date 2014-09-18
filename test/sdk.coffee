should = require('clay-chai').should()

Clay = require 'clay_sdk'

describe 'sdk', ->
  describe 'version', ->
    it 'has version', ->
      Clay.version.should.be 'v0.0.0'

  describe 'client', ->
    it 'errors if not frame', ->
      Clay.client method: 'kik.send'
      .then (res) ->
        throw new Error 'Missing error'
      , (err) ->
        err.message.should.exist

    it 'posts to parent frame', ->
      window.parent =
        postMessage: (messageString) ->
          message = JSON.parse messageString

          e = document.createEvent 'Event'
          e.initEvent 'message', true, true
          e.data = JSON.stringify
            _id: message._id
            test: true

          window.dispatchEvent e

      Clay.client method: 'kik.getUser'
      .then (user) ->
        user.test.should.be true
