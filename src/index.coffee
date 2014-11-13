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
      message._clay = true
      message.jsonrpc = '2.0'

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

  if message.error
    pendingMessages[message.id].reject new Error message.error.message
  else
    pendingMessages[message.id].resolve message.result


# This is used to verify that the parent is clay.io
# If it's not, the postMessage promise will fail because of onMessage check
validateParent = ->
  postMessage
    method: 'ping'

isValidOrigin = (origin) ->
  regex = new RegExp "^https?://(\\w+\\.)?(\\w+\\.)?#{TRUSTED_DOMAIN}/?$"
  return regex.test origin

methodToFn = (method) ->
  switch method
    when 'share.any' then shareAny
    else -> throw new Error 'Method not found'

shareAny = ({text}) ->
  tweet = (text) ->
    text = encodeURIComponent text.substr 0, 140
    window.open "https://twitter.com/intent/tweet?text=#{text}"

  return tweet(text)

class SDK
  constructor: ->
    @version = 'v0.0.5'
    window.addEventListener 'message', onMessage

  # used by clay_ui, could probably be better
  _config: {}

  # Public
  init: (opts) ->
    gameId = opts?.gameId
    debug = Boolean opts?.debug

    @_config.gameId = gameId

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
      isInitialized = true
      status = {}
      return new Promiz().resolve(null)

  login: ({scope}) ->
    # TODO: OAuth magic. Gets token
    return new Promiz().reject new Error 'Not Implemented'

  api: ->
    # TODO: implement
    return new Promiz().reject new Error 'Not Implemented'

  client: (message) ->
    unless isInitialized
      return new Promiz().reject new Error 'Must call Clay.init() first'

    localMethod = (message) ->
      method = message.method
      params = message.params
      return methodToFn(method).apply null, params

    if IS_FRAMED
      frameError = null
      return validateParent()
      .then ->
        postMessage message
      .then null, (err) ->
        frameError = err
        localMethod(message)
      .then null, (err) ->
        if err.message is 'Method not found' and frameError isnt null
          throw frameError
        else
          throw err
    else
      return new Promiz().resolve localMethod(message)



module.exports = new SDK()
