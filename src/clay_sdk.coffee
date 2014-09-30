Promiz = require 'promiz'

TRUSTED_DOMAIN = (process.env.TRUSTED_DOMAIN or 'clay.io')
  .replace(/\./g, '\\.')

IS_FRAMED = window.self isnt window.top

pendingMessages = {}
isInitialized = false
gameId = null
status = null
debug = false


postMessage = do ->
  messageId = 1

  (message) ->
    deferred = new Promiz()

    try
      message.id = messageId
      message.gameId = gameId
      message.accessToken = status?.accessToken

      pendingMessages[message.id] = deferred

      messageId += 1

      # It's not possible to tell who the parent is here
      # The client has to ping the parent and get a response to verify
      window.parent.postMessage JSON.stringify(message), '*'

    catch err
      deferred.reject err

    return deferred

onMessage = (e) ->
  if not debug and not isValidOrigin e.origin
    throw new Error "Invalid origin #{e.origin}"

  message = JSON.parse e.data

  unless message.id
    return

  pendingMessages[message.id].resolve message.result


# This is used to verify that the parent is clay.io
# If it's not, the postMessage promise will fail because of onMessage check
validateParent = ->
  postMessage
    method: 'ping'

isValidOrigin = (origin) ->
  regex = new RegExp "^https?://(\\w+\\.)?(\\w+\\.)?#{TRUSTED_DOMAIN}/?$"
  return regex.test origin



class SDK
  constructor: ->
    @version = 'v0.0.2'
    window.addEventListener 'message', onMessage

  # FOR TESTING ONLY
  _setInitialized: (state) ->
    isInitialized = state

  _setDebug: (state) ->
    debug = state

  _setFramed: (state) ->
    IS_FRAMED = state

  # Public
  init: (opts) ->
    gameId = opts?.gameId
    debug = Boolean opts?.debug

    unless gameId
      return new Promiz().reject new Error 'Missing gameId'

    if IS_FRAMED
      return validateParent()
      .then ->
        postMessage
          method: 'auth.getStatus'
      .then (_status) ->
        isInitialized = true
        # TODO: Token may be invalid
        status = _status
    else
      return new Promiz().reject new Error 'Unframed Not Implemented'

  login: ({scope}) ->
    # TODO: OAuth magic. Gets token
    return new Promiz().reject new Error 'Not Implemented'

  api: ->
    # TODO: implement
    return new Promiz().reject new Error 'Not Implemented'

  client: (message) ->
    unless isInitialized
      return new Promiz().reject new Error 'Must call Clay.init() first'

    unless IS_FRAMED
      return new Promiz().reject new Error 'Missing parent frame. Make sure
                                            you are within a clay game running
                                            frame'

    validateParent()
    .then ->
      postMessage message




module.exports = new SDK()
