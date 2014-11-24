Promise = require 'promiz'
portal = require 'portal-gun'

TRUSTED_DOMAIN = (process.env.TRUSTED_DOMAIN or 'clay.io')
TWEET_LENGTH = 140
VERSION = 'v1.0.2'

config = new Promise (@resolve, @reject) -> null
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

  methods[methodRoot].apply 0, [method, params, cb]

methods = {
  version: (_, __, cb) ->
    cb null, VERSION

  init: (method, [options], cb) ->
    (do ->
      gameId = options.gameId
      debug = Boolean options.debug

      if debug
        portal.up()
      else
        portal.up trusted: TRUSTED_DOMAIN, subdomains: true

      unless typeof gameId is 'string' and /^[0-9]+$/.test gameId
        return cb new Error 'Missing or invalid gameId'

      initHasBeenCalled = true

      portal.get 'auth.getStatus', {gameId}
      .then (status) ->
        # TODO: Token may be invalid
        config.resolve
          gameId: gameId
          accessToken: status?.accessToken
      .catch ->
        config.resolve
          gameId: gameId
          accessToken: null
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

      config.then (config) ->
        unless Object::toString.call(params) is '[object Array]'
          params = [params]

        # inject gameId and accessToken into request parameters
        if typeof params[0] is 'object'
          params[0].gameId = config.gameId
          params[0].accessToken = config.accessToken

        return portal.get method, params
    )
    .then (x) -> cb null, x
    .catch cb

  register: (_, [{method, fn}]) ->
    methods[method] = fn(config)

}

portal.register 'share.any', ({text} = {}) ->
  unless typeof text is 'string'
    throw new Error 'text parameter is missing or invalid'

  if text.length > TWEET_LENGTH
    throw new Error 'No valid share method available'

  tweet = (text) ->
    text = encodeURIComponent text.substr 0, TWEET_LENGTH
    window.open "https://twitter.com/intent/tweet?text=#{text}"

  return tweet(text)

module.exports = Clay

# Initialize, allowing time for synchronous registration of services
window.setTimeout ->
  q = window.Clay?.q or []

  window.Clay = Clay
  for call in q
    Clay.apply 0, call
