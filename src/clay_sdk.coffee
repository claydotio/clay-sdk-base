((name, context, definition) ->
  if typeof module isnt 'undefined' and module.exports
    module.exports = definition()
  else if typeof define is 'function' and define.amd
    define(definition)
  else
    context[name] = definition()
)('Clay', this, ->

  Promiz = require 'promiz'

  class SDK

    # Private
    pendingMessages = {}

    postMessage = do ->
      messageId = 1

      (message) ->
        deferred = new Promiz()

        try
          message._id = messageId
          pendingMessages[message._id] = deferred

          messageId += 1

          window.parent.postMessage JSON.stringify message

        catch err
          deferred.reject err

        return deferred


    onMessage = (e) ->
      message = JSON.parse e.data
      pendingMessages[message._id].resolve message

    # Public
    constructor: ->
      window.addEventListener 'message', onMessage

    version: 'v0.0.0'

    init: ({@clientId}) -> null

    login: ({scope}) ->
      # OAuth magic. Gets token
      null

    api: ->
      # TODO: implement
      null

    # TODO: add clientId and OAuth token to message
    client: (message) ->
      unless window.parent isnt window.top
        return new Promiz().reject new Error 'Missing parent frame. Make sure
                                              you are within a clay game running
                                              frame'

      postMessage message




  return new SDK()


)
