Promise = require 'promiz'

TRUSTED_DOMAIN = (process.env.TRUSTED_DOMAIN or 'clay.io')
IS_FRAMED = window.self isnt window.top
ONE_SECOND_MS = 1000
TWEET_LENGTH = 140
VERSION = 'v1.0.1'


config = new Promise (@resolve, @reject) -> null
nextMessageId = 1
initHasBeenCalled = false
debug = false
pendingMessages = {}


Clay = (method, params, cb = -> null) ->
  if typeof params is 'function'
    cb = params
    params = []

  # Normalize params to an array if passed an object
  if params? and Object::toString.call(params) is '[object Object]'
    params = [params]

  if params? and Object::toString.call(params) isnt '[object Array]'
    return cb new Error 'Params must be an array'

  methodRoot = method.split('.')[0]
  method = method.slice method.indexOf('.') + 1

  methods[methodRoot].apply 0, [method, params, cb]

methods = {
  version: (_, __, cb) ->
    cb null, VERSION

  init: (method, [options], cb) ->
    (do ->
      gameId = options.gameId
      debug = Boolean options.debug

      unless typeof gameId is 'string' and /^[0-9]+$/.test gameId
        return cb new Error 'Missing or invalid gameId'

      initHasBeenCalled = true

      if IS_FRAMED
        return validateParent()
        .then ->
          postMessage
            config: {gameId}
            method: 'auth.getStatus'
        .then (status) ->
          # TODO: Token may be invalid
          config.resolve
            gameId: gameId
            accessToken: status?.accessToken

          return config
      else
        config.resolve
          gameId: gameId
          accessToken: null

        return config
    )
    .then (x) ->
      cb null, x
    .catch cb

  client: (method, params, cb) ->
    if method is 'client'
      return cb new Error 'Missing or invalid method'

    (do ->
      unless initHasBeenCalled
        return Promise.reject new Error 'Must call Clay(\'init\') first'

      localMethod = ({method, params}) ->
        return methodToFn(method).apply null, params

      return config.then ({gameId}) ->
        if IS_FRAMED
          frameError = null
          return postMessage {config: {gameId}, method, params}
          .catch (err) ->
            frameError = err
            return localMethod({method, params})
          .catch (err) ->
            if err.message is 'Method not found' and frameError isnt null
              throw frameError
            else
              throw err
        else
          return Promise.resolve localMethod({method, params})
    )
    .then (x) -> cb null, x
    .catch cb

  register: (_, [{method, fn}]) ->
    methods[method] = fn(config)
}

methodToFn = (method) ->
  switch method
    when 'share.any' then shareAny
    else -> throw new Error 'Method not found'

shareAny = ({text} = {}) ->
  unless typeof text is 'string'
    throw new Error 'text parameter is missing or invalid'

  if text.length > TWEET_LENGTH
    throw new Error 'No valid share method available'

  tweet = (text) ->
    text = encodeURIComponent text.substr 0, TWEET_LENGTH
    window.open "https://twitter.com/intent/tweet?text=#{text}"

  return tweet(text)


# This is used to verify that the parent is clay.io
# If it's not, the postMessage promise will fail because of onMessage check
validateParent = ->
  postMessage
    config: {gameId: 1}
    method: 'ping'

postMessage = ({config, method, params}) ->
  deferred = new Promise (@resolve, @reject) -> null
  message = {method, params}

  try
    message.id = nextMessageId
    message.gameId = config.gameId
    message.accessToken = config.accessToken
    message._clay = true
    message.jsonrpc = '2.0'

    pendingMessages[message.id] = deferred

    nextMessageId += 1

    # It's not possible to tell who the parent is here
    # The client has to ping the parent and get a response to verify
    window.parent.postMessage JSON.stringify(message), '*'

  catch err
    deferred.reject err

  window.setTimeout ->
    deferred.reject new Error 'Message Timeout'
  , ONE_SECOND_MS

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


isValidOrigin = (origin) ->
  regex = new RegExp '^https?://(\\w+\\.)?(\\w+\\.)?' +
                     "#{TRUSTED_DOMAIN.replace(/\./g, '\\.')}/?$"
  return regex.test origin

window.addEventListener 'message', onMessage

module.exports = Clay

# Initialize, allowing time for synchronous registration of services
window.setTimeout ->
  q = window.Clay?.q or []

  window.Clay = Clay
  for call in q
    Clay.apply 0, call
