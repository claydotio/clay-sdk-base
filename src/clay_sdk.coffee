((name, context, definition) ->
  if typeof module isnt 'undefined' and module.exports
    module.exports = definition()
  else if typeof define is 'function' and define.amd
    define(definition)
  else
    context[name] = definition()
)('Clay', this, ->
  class SDK
    version: 'v0.0.0'

    init: ({@clientId}) -> null

    login: ({scope}) ->
      # OAuth magic. Gets token
      null

    api: ->
      # TODO: implement
      null

    client: ({method}) ->
      # TODO: implement
      null



  return new SDK()


)
