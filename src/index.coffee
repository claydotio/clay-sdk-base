Promiz = require 'promiz'

TRUSTED_DOMAIN = (process.env.TRUSTED_DOMAIN or 'clay.io')
IS_FRAMED = window.self isnt window.top

class SDK
  constructor: ->
    # Public
    @version = 'v0.0.5'
    @config = {debug: false, gameId: null}

    # Private
    @pendingMessages = {}
    @status =
      access_token: null
    @initPromise = new Promiz()
    @initHasBeenCalled = false

    window.addEventListener 'message', @onMessage

  # Public
  init: ({gameId, debug} = {}) =>
    unless typeof gameId is 'string' and /^[0-9]+$/.test gameId
      return new Promiz().reject new Error 'Missing or invalid gameId'

    @initHasBeenCalled = true

    @config =
      debug: Boolean debug
      gameId: gameId or null

    if IS_FRAMED
      return @validateParent()
      .then =>
        @postMessage
          method: 'auth.getStatus'
      .then (_status) =>
        # TODO: Token may be invalid
        @status = _status

        return @initPromise.resolve @status

    else
      return @initPromise.resolve(@status)

  login: ({scope}) ->
    # TODO: OAuth magic. Gets token
    return new Promiz().reject new Error 'Not Implemented'

  api: ->
    # TODO: implement
    return new Promiz().reject new Error 'Not Implemented'

  client: ({method, params} = {}) =>
    unless @initHasBeenCalled
      return new Promiz().reject new Error 'Must call Clay.init() first'

    unless typeof method is 'string'
      return new Promiz().reject new Error 'Missing or invalid method'

    if params? and Object::toString.call(params) isnt '[object Array]'
      return new Promiz().reject new Error 'Params must be an array'

    localMethod = ({method, params}) =>
      return @methodToFn(method).apply null, params

    return @initPromise.then =>
      if IS_FRAMED
        frameError = null
        return @validateParent()
        .then =>
          @postMessage {method, params}
        .then null, (err) ->
          frameError = err
          localMethod({method, params})
        .then null, (err) ->
          if err.message is 'Method not found' and frameError isnt null
            throw frameError
          else
            throw err
      else
        return new Promiz().resolve localMethod({method, params})

  # Private

  # This is used to verify that the parent is clay.io
  # If it's not, the postMessage promise will fail because of onMessage check
  validateParent: =>
    @postMessage
      method: 'ping'

  methodToFn: (method) =>
    switch method
      when 'share.any' then @shareAny
      else -> throw new Error 'Method not found'

  shareAny: ({text}) ->
    tweet = (text) ->
      text = encodeURIComponent text.substr 0, 140
      window.open "https://twitter.com/intent/tweet?text=#{text}"

    return tweet(text)

  isValidOrigin: (origin) ->
    regex = new RegExp '^https?://(\\w+\\.)?(\\w+\\.)?' +
                       "#{TRUSTED_DOMAIN.replace(/\./g, '\\.')}/?$"
    return regex.test origin

  onMessage: (e) =>
    if not @config.debug and not @isValidOrigin e.origin
      throw new Error "Invalid origin #{e.origin}"

    message = JSON.parse e.data

    unless message.id
      return

    if message.error
      @pendingMessages[message.id].reject new Error message.error.message
    else
      @pendingMessages[message.id].resolve message.result

  messageId = 1
  postMessage: ({method, params}) =>
    deferred = new Promiz()
    message = {method, params}

    try
      message.id = messageId
      message.gameId = @config.gameId
      message.accessToken = @status?.accessToken
      message._clay = true
      message.jsonrpc = '2.0'

      @pendingMessages[message.id] = deferred

      messageId += 1

      # It's not possible to tell who the parent is here
      # The client has to ping the parent and get a response to verify
      window.parent.postMessage JSON.stringify(message), '*'

    catch err
      deferred.reject err

    return deferred

sdk = new SDK()
module.exports = {
  version: sdk.version
  init: sdk.init
  client: sdk.client
  config: sdk.config
}
