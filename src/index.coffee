Promise = window.Promise or require 'promiz'
portal = require 'portal-gun'

TRUSTED_DOMAINS = process.env.TRUSTED_DOMAINS?.split(',') or
                  ['clay.io', 'staging.wtf']
TWEET_LENGTH = 140
VERSION = 'v1.1.2'

deferredFactory = ->
  resolve = null
  reject = null
  promise = new Promise (_resolve, _reject) ->
    resolve = _resolve
    reject = _reject
  promise.resolve = resolve
  promise.reject = reject

  return promise

config = deferredFactory()
initHasBeenCalled = false

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

  unless methods[methodRoot]
    return cb new Error 'Method not found'

  methods[methodRoot].apply 0, [method, params, cb]

methods = {
  version: (_, __, cb) ->
    cb null, VERSION

  init: (method, [options], cb) ->
    new Promise (resolve, reject) ->
      if initHasBeenCalled
        throw new Error 'Init already called'

      gameId = options.gameId
      debug = Boolean options.debug

      unless typeof gameId is 'string' and /^[0-9]+$/.test gameId
        return cb new Error 'Missing or invalid gameId'

      initHasBeenCalled = true

      if debug
        portal.up()
      else
        portal.up trusted: TRUSTED_DOMAINS, allowSubdomains: true

      resolve portal.call 'auth.getStatus', {gameId}
      .then (status) ->
        # TODO: Token may be invalid
        config.resolve
          gameId: gameId
          accessToken: status?.accessToken
          userId: status?.userId
        return config
      .catch ->
        config.resolve
          gameId: gameId
          accessToken: null
          userId: null
        return config
    .then (x) ->
      cb null, x
    .catch cb

  client: (method, params, cb) ->
    new Promise (resolve, reject) ->
      if method is 'client'
        throw new Error 'Missing or invalid method'

      unless initHasBeenCalled
        throw new Error 'Must call Clay(\'init\') first'

      resolve config.then (config) ->
        unless Object::toString.call(params) is '[object Array]'
          params = [params]

        # inject gameId and accessToken into request parameters
        if typeof params[0] is 'object'
          params[0].gameId = config.gameId
          params[0].accessToken = config.accessToken

        return portal.call method, params
    .then (x) -> cb null, x
    .catch cb

  register: (_, [{method, fn}]) ->
    methods[method] = fn(config)

}

portal.on 'share.any', ({text} = {}) ->
  unless typeof text is 'string'
    throw new Error 'text parameter is missing or invalid'

  if text.length > TWEET_LENGTH
    throw new Error 'No valid share method available'

  tweet = (text) ->
    text = encodeURIComponent text.substr 0, TWEET_LENGTH
    window.open "https://twitter.com/intent/tweet?text=#{text}", '_system'

  return tweet(text)

module.exports = Clay

# Initialize, allowing time for synchronous registration of services
window.setTimeout ->
  q = window.Clay?.q or []

  window.Clay = Clay
  for call in q
    Clay.apply 0, call
