should = require('clay-chai').should()

Clay = require 'clay_sdk'

describe 'sdk', ->
  describe 'version', ->
    it 'has version', ->
      Clay.version.should.be 'v0.0.0'
