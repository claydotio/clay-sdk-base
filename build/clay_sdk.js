(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
var IS_FRAMED, Promiz, SDK, TRUSTED_DOMAIN, debug, gameId, isInitialized, isValidOrigin, methodToFn, onMessage, pendingMessages, postMessage, shareAny, status, validateParent;

Promiz = require('promiz');

TRUSTED_DOMAIN = (process.env.TRUSTED_DOMAIN || 'clay.io').replace(/\./g, '\\.');

IS_FRAMED = window.self !== window.top;

pendingMessages = {};

isInitialized = false;

gameId = null;

status = null;

debug = false;

postMessage = (function() {
  var messageId;
  messageId = 1;
  return function(message) {
    var deferred, err;
    deferred = new Promiz();
    try {
      message.id = messageId;
      message.gameId = gameId;
      message.accessToken = status != null ? status.accessToken : void 0;
      message._clay = true;
      message.jsonrpc = '2.0';
      pendingMessages[message.id] = deferred;
      messageId += 1;
      window.parent.postMessage(JSON.stringify(message), '*');
    } catch (_error) {
      err = _error;
      deferred.reject(err);
    }
    return deferred;
  };
})();

onMessage = function(e) {
  var message;
  if (!debug && !isValidOrigin(e.origin)) {
    throw new Error("Invalid origin " + e.origin);
  }
  message = JSON.parse(e.data);
  if (!message.id) {
    return;
  }
  if (message.error) {
    return pendingMessages[message.id].reject(new Error(message.error.message));
  } else {
    return pendingMessages[message.id].resolve(message.result);
  }
};

validateParent = function() {
  return postMessage({
    method: 'ping'
  });
};

isValidOrigin = function(origin) {
  var regex;
  regex = new RegExp("^https?://(\\w+\\.)?(\\w+\\.)?" + TRUSTED_DOMAIN + "/?$");
  return regex.test(origin);
};

methodToFn = function(method) {
  switch (method) {
    case 'share.any':
      return shareAny;
    default:
      return function() {
        throw new Error('Method not found');
      };
  }
};

shareAny = function(_arg) {
  var text, tweet;
  text = _arg.text;
  tweet = function(text) {
    text = encodeURIComponent(text.substr(0, 140));
    return window.open("https://twitter.com/intent/tweet?text=" + text);
  };
  return tweet(text);
};

SDK = (function() {
  function SDK() {
    this.version = 'v0.0.5';
    window.addEventListener('message', onMessage);
  }

  SDK.prototype._setInitialized = function(state) {
    return isInitialized = state;
  };

  SDK.prototype._setDebug = function(state) {
    return debug = state;
  };

  SDK.prototype._setFramed = function(state) {
    return IS_FRAMED = state;
  };

  SDK.prototype._config = {};

  SDK.prototype.init = function(opts) {
    gameId = opts != null ? opts.gameId : void 0;
    debug = Boolean(opts != null ? opts.debug : void 0);
    this._config.gameId = gameId;
    if (!gameId) {
      return new Promiz().reject(new Error('Missing gameId'));
    }
    if (IS_FRAMED) {
      return validateParent().then(function() {
        return postMessage({
          method: 'auth.getStatus'
        });
      }).then(function(_status) {
        isInitialized = true;
        return status = _status;
      });
    } else {
      isInitialized = true;
      status = {};
      return new Promiz().resolve(null);
    }
  };

  SDK.prototype.login = function(_arg) {
    var scope;
    scope = _arg.scope;
    return new Promiz().reject(new Error('Not Implemented'));
  };

  SDK.prototype.api = function() {
    return new Promiz().reject(new Error('Not Implemented'));
  };

  SDK.prototype.client = function(message) {
    var frameError, localMethod;
    if (!isInitialized) {
      return new Promiz().reject(new Error('Must call Clay.init() first'));
    }
    localMethod = function(message) {
      var method, params;
      method = message.method;
      params = message.params;
      return methodToFn(method).apply(null, params);
    };
    if (IS_FRAMED) {
      frameError = null;
      return validateParent().then(function() {
        return postMessage(message);
      }).then(null, function(err) {
        frameError = err;
        return localMethod(message);
      }).then(null, function(err) {
        if (err.message === 'Method not found' && frameError !== null) {
          throw frameError;
        } else {
          throw err;
        }
      });
    } else {
      return new Promiz().resolve(localMethod(message));
    }
  };

  return SDK;

})();

module.exports = new SDK();



}).call(this,require('_process'))
},{"_process":3,"promiz":2}],2:[function(require,module,exports){
(function () {
  
  /**
   * @constructor
   */
  function Deferred(fn, er) {
    // states
    // 0: pending
    // 1: resolving
    // 2: rejecting
    // 3: resolved
    // 4: rejected
    var self = this,
      state = 0,
      val = 0,
      next = [];

    self['promise'] = self

    self['resolve'] = function (v) {
      if (!state) {
        val = v
        state = 1

        setTimeout(fire)
      }
      return this
    }

    self['reject'] = function (v) {
      if (!state) {
        val = v
        state = 2

        setTimeout(fire)
      }
      return this
    }

    self['then'] = function (fn, er) {
      var d = new Deferred(fn, er)
      if (state == 3) {
        d.resolve(val)
      }
      else if (state == 4) {
        d.reject(val)
      }
      else {
        next.push(d)
      }
      return d
    }

    var finish = function (type) {
      state = type || 4
      next.map(function (p) {
        state == 3 && p.resolve(val) || p.reject(val)
      })
    }

    // ref : reference to 'then' function
    // cb, ec, cn : successCallback, failureCallback, notThennableCallback
    function thennable (ref, cb, ec, cn) {
      if (typeof val == 'object' && typeof ref == 'function') {
        try {

          // cnt protects against abuse calls from spec checker
          var cnt = 0
          ref.call(val, function (v) {
            if (cnt++) return
            val = v
            cb()
          }, function (v) {
            if (cnt++) return
            val = v
            ec()
          })
        } catch (e) {
          val = e
          ec()
        }
      } else {
        cn()
      }
    };

    function fire() {

      // check if it's a thenable
      var ref;
      try {
        ref = val && val.then
      } catch (e) {
        val = e
        state = 2
        return fire()
      }

      thennable(ref, function () {
        state = 1
        fire()
      }, function () {
        state = 2
        fire()
      }, function () {
        try {
          if (state == 1 && typeof fn == 'function') {
            val = fn(val)
          }

          else if (state == 2 && typeof er == 'function') {
            val = er(val)
            state = 1
          }
        } catch (e) {
          val = e
          return finish()
        }

        if (val == self) {
          val = TypeError()
          finish()
        } else thennable(ref, function () {
            finish(3)
          }, finish, function () {
            finish(state == 1 && 3)
          })

      })
    }


  }

  // Export our library object, either for node.js or as a globally scoped variable
  if (typeof module != 'undefined') {
    module['exports'] = Deferred
  } else {
    this['Promiz'] = Deferred
  }
})()

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL3pvbGkvY2xheS9jbGF5LWphdmFzY3JpcHQtc2RrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS96b2xpL2NsYXkvY2xheS1qYXZhc2NyaXB0LXNkay9zcmMvY2xheV9zZGsuY29mZmVlIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvY29tcG9uZW50cy9wcm9taXovcHJvbWl6Lm1pY3JvLmpzIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsMEtBQUE7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSLENBQVQsQ0FBQTs7QUFBQSxjQUVBLEdBQWlCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFaLElBQThCLFNBQS9CLENBQ2YsQ0FBQyxPQURjLENBQ04sS0FETSxFQUNDLEtBREQsQ0FGakIsQ0FBQTs7QUFBQSxTQUtBLEdBQVksTUFBTSxDQUFDLElBQVAsS0FBaUIsTUFBTSxDQUFDLEdBTHBDLENBQUE7O0FBQUEsZUFPQSxHQUFrQixFQVBsQixDQUFBOztBQUFBLGFBUUEsR0FBZ0IsS0FSaEIsQ0FBQTs7QUFBQSxNQVNBLEdBQVMsSUFUVCxDQUFBOztBQUFBLE1BVUEsR0FBUyxJQVZULENBQUE7O0FBQUEsS0FXQSxHQUFRLEtBWFIsQ0FBQTs7QUFBQSxXQWNBLEdBQWlCLENBQUEsU0FBQSxHQUFBO0FBQ2YsTUFBQSxTQUFBO0FBQUEsRUFBQSxTQUFBLEdBQVksQ0FBWixDQUFBO1NBRUEsU0FBQyxPQUFELEdBQUE7QUFDRSxRQUFBLGFBQUE7QUFBQSxJQUFBLFFBQUEsR0FBZSxJQUFBLE1BQUEsQ0FBQSxDQUFmLENBQUE7QUFFQTtBQUNFLE1B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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJQcm9taXogPSByZXF1aXJlICdwcm9taXonXG5cblRSVVNURURfRE9NQUlOID0gKHByb2Nlc3MuZW52LlRSVVNURURfRE9NQUlOIG9yICdjbGF5LmlvJylcbiAgLnJlcGxhY2UoL1xcLi9nLCAnXFxcXC4nKVxuXG5JU19GUkFNRUQgPSB3aW5kb3cuc2VsZiBpc250IHdpbmRvdy50b3BcblxucGVuZGluZ01lc3NhZ2VzID0ge31cbmlzSW5pdGlhbGl6ZWQgPSBmYWxzZVxuZ2FtZUlkID0gbnVsbFxuc3RhdHVzID0gbnVsbFxuZGVidWcgPSBmYWxzZVxuXG5cbnBvc3RNZXNzYWdlID0gZG8gLT5cbiAgbWVzc2FnZUlkID0gMVxuXG4gIChtZXNzYWdlKSAtPlxuICAgIGRlZmVycmVkID0gbmV3IFByb21peigpXG5cbiAgICB0cnlcbiAgICAgIG1lc3NhZ2UuaWQgPSBtZXNzYWdlSWRcbiAgICAgIG1lc3NhZ2UuZ2FtZUlkID0gZ2FtZUlkXG4gICAgICBtZXNzYWdlLmFjY2Vzc1Rva2VuID0gc3RhdHVzPy5hY2Nlc3NUb2tlblxuICAgICAgbWVzc2FnZS5fY2xheSA9IHRydWVcbiAgICAgIG1lc3NhZ2UuanNvbnJwYyA9ICcyLjAnXG5cbiAgICAgIHBlbmRpbmdNZXNzYWdlc1ttZXNzYWdlLmlkXSA9IGRlZmVycmVkXG5cbiAgICAgIG1lc3NhZ2VJZCArPSAxXG5cbiAgICAgICMgSXQncyBub3QgcG9zc2libGUgdG8gdGVsbCB3aG8gdGhlIHBhcmVudCBpcyBoZXJlXG4gICAgICAjIFRoZSBjbGllbnQgaGFzIHRvIHBpbmcgdGhlIHBhcmVudCBhbmQgZ2V0IGEgcmVzcG9uc2UgdG8gdmVyaWZ5XG4gICAgICB3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlIEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpLCAnKidcblxuICAgIGNhdGNoIGVyclxuICAgICAgZGVmZXJyZWQucmVqZWN0IGVyclxuXG4gICAgcmV0dXJuIGRlZmVycmVkXG5cbm9uTWVzc2FnZSA9IChlKSAtPlxuICBpZiBub3QgZGVidWcgYW5kIG5vdCBpc1ZhbGlkT3JpZ2luIGUub3JpZ2luXG4gICAgdGhyb3cgbmV3IEVycm9yIFwiSW52YWxpZCBvcmlnaW4gI3tlLm9yaWdpbn1cIlxuXG4gIG1lc3NhZ2UgPSBKU09OLnBhcnNlIGUuZGF0YVxuXG4gIHVubGVzcyBtZXNzYWdlLmlkXG4gICAgcmV0dXJuXG5cbiAgaWYgbWVzc2FnZS5lcnJvclxuICAgIHBlbmRpbmdNZXNzYWdlc1ttZXNzYWdlLmlkXS5yZWplY3QgbmV3IEVycm9yIG1lc3NhZ2UuZXJyb3IubWVzc2FnZVxuICBlbHNlXG4gICAgcGVuZGluZ01lc3NhZ2VzW21lc3NhZ2UuaWRdLnJlc29sdmUgbWVzc2FnZS5yZXN1bHRcblxuXG4jIFRoaXMgaXMgdXNlZCB0byB2ZXJpZnkgdGhhdCB0aGUgcGFyZW50IGlzIGNsYXkuaW9cbiMgSWYgaXQncyBub3QsIHRoZSBwb3N0TWVzc2FnZSBwcm9taXNlIHdpbGwgZmFpbCBiZWNhdXNlIG9mIG9uTWVzc2FnZSBjaGVja1xudmFsaWRhdGVQYXJlbnQgPSAtPlxuICBwb3N0TWVzc2FnZVxuICAgIG1ldGhvZDogJ3BpbmcnXG5cbmlzVmFsaWRPcmlnaW4gPSAob3JpZ2luKSAtPlxuICByZWdleCA9IG5ldyBSZWdFeHAgXCJeaHR0cHM/Oi8vKFxcXFx3K1xcXFwuKT8oXFxcXHcrXFxcXC4pPyN7VFJVU1RFRF9ET01BSU59Lz8kXCJcbiAgcmV0dXJuIHJlZ2V4LnRlc3Qgb3JpZ2luXG5cbm1ldGhvZFRvRm4gPSAobWV0aG9kKSAtPlxuICBzd2l0Y2ggbWV0aG9kXG4gICAgd2hlbiAnc2hhcmUuYW55JyB0aGVuIHNoYXJlQW55XG4gICAgZWxzZSAtPiB0aHJvdyBuZXcgRXJyb3IgJ01ldGhvZCBub3QgZm91bmQnXG5cbnNoYXJlQW55ID0gKHt0ZXh0fSkgLT5cbiAgdHdlZXQgPSAodGV4dCkgLT5cbiAgICB0ZXh0ID0gZW5jb2RlVVJJQ29tcG9uZW50IHRleHQuc3Vic3RyIDAsIDE0MFxuICAgIHdpbmRvdy5vcGVuIFwiaHR0cHM6Ly90d2l0dGVyLmNvbS9pbnRlbnQvdHdlZXQ/dGV4dD0je3RleHR9XCJcblxuICByZXR1cm4gdHdlZXQodGV4dClcblxuY2xhc3MgU0RLXG4gIGNvbnN0cnVjdG9yOiAtPlxuICAgIEB2ZXJzaW9uID0gJ3YwLjAuNSdcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbWVzc2FnZScsIG9uTWVzc2FnZVxuXG4gICMgRk9SIFRFU1RJTkcgT05MWVxuICBfc2V0SW5pdGlhbGl6ZWQ6IChzdGF0ZSkgLT5cbiAgICBpc0luaXRpYWxpemVkID0gc3RhdGVcblxuICBfc2V0RGVidWc6IChzdGF0ZSkgLT5cbiAgICBkZWJ1ZyA9IHN0YXRlXG5cbiAgX3NldEZyYW1lZDogKHN0YXRlKSAtPlxuICAgIElTX0ZSQU1FRCA9IHN0YXRlXG5cbiAgIyB1c2VkIGJ5IGNsYXlfdWksIGNvdWxkIHByb2JhYmx5IGJlIGJldHRlclxuICBfY29uZmlnOiB7fVxuXG4gICMgUHVibGljXG4gIGluaXQ6IChvcHRzKSAtPlxuICAgIGdhbWVJZCA9IG9wdHM/LmdhbWVJZFxuICAgIGRlYnVnID0gQm9vbGVhbiBvcHRzPy5kZWJ1Z1xuXG4gICAgQF9jb25maWcuZ2FtZUlkID0gZ2FtZUlkXG5cbiAgICB1bmxlc3MgZ2FtZUlkXG4gICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ01pc3NpbmcgZ2FtZUlkJ1xuXG4gICAgaWYgSVNfRlJBTUVEXG4gICAgICByZXR1cm4gdmFsaWRhdGVQYXJlbnQoKVxuICAgICAgLnRoZW4gLT5cbiAgICAgICAgcG9zdE1lc3NhZ2VcbiAgICAgICAgICBtZXRob2Q6ICdhdXRoLmdldFN0YXR1cydcbiAgICAgIC50aGVuIChfc3RhdHVzKSAtPlxuICAgICAgICBpc0luaXRpYWxpemVkID0gdHJ1ZVxuICAgICAgICAjIFRPRE86IFRva2VuIG1heSBiZSBpbnZhbGlkXG4gICAgICAgIHN0YXR1cyA9IF9zdGF0dXNcblxuICAgIGVsc2VcbiAgICAgIGlzSW5pdGlhbGl6ZWQgPSB0cnVlXG4gICAgICBzdGF0dXMgPSB7fVxuICAgICAgcmV0dXJuIG5ldyBQcm9taXooKS5yZXNvbHZlKG51bGwpXG5cbiAgbG9naW46ICh7c2NvcGV9KSAtPlxuICAgICMgVE9ETzogT0F1dGggbWFnaWMuIEdldHMgdG9rZW5cbiAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ05vdCBJbXBsZW1lbnRlZCdcblxuICBhcGk6IC0+XG4gICAgIyBUT0RPOiBpbXBsZW1lbnRcbiAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ05vdCBJbXBsZW1lbnRlZCdcblxuICBjbGllbnQ6IChtZXNzYWdlKSAtPlxuICAgIHVubGVzcyBpc0luaXRpYWxpemVkXG4gICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ011c3QgY2FsbCBDbGF5LmluaXQoKSBmaXJzdCdcblxuICAgIGxvY2FsTWV0aG9kID0gKG1lc3NhZ2UpIC0+XG4gICAgICBtZXRob2QgPSBtZXNzYWdlLm1ldGhvZFxuICAgICAgcGFyYW1zID0gbWVzc2FnZS5wYXJhbXNcbiAgICAgIHJldHVybiBtZXRob2RUb0ZuKG1ldGhvZCkuYXBwbHkgbnVsbCwgcGFyYW1zXG5cbiAgICBpZiBJU19GUkFNRURcbiAgICAgIGZyYW1lRXJyb3IgPSBudWxsXG4gICAgICByZXR1cm4gdmFsaWRhdGVQYXJlbnQoKVxuICAgICAgLnRoZW4gLT5cbiAgICAgICAgcG9zdE1lc3NhZ2UgbWVzc2FnZVxuICAgICAgLnRoZW4gbnVsbCwgKGVycikgLT5cbiAgICAgICAgZnJhbWVFcnJvciA9IGVyclxuICAgICAgICBsb2NhbE1ldGhvZChtZXNzYWdlKVxuICAgICAgLnRoZW4gbnVsbCwgKGVycikgLT5cbiAgICAgICAgaWYgZXJyLm1lc3NhZ2UgaXMgJ01ldGhvZCBub3QgZm91bmQnIGFuZCBmcmFtZUVycm9yIGlzbnQgbnVsbFxuICAgICAgICAgIHRocm93IGZyYW1lRXJyb3JcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRocm93IGVyclxuICAgIGVsc2VcbiAgICAgIHJldHVybiBuZXcgUHJvbWl6KCkucmVzb2x2ZSBsb2NhbE1ldGhvZChtZXNzYWdlKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgU0RLKClcbiIsIihmdW5jdGlvbiAoKSB7XG4gIFxuICAvKipcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBEZWZlcnJlZChmbiwgZXIpIHtcbiAgICAvLyBzdGF0ZXNcbiAgICAvLyAwOiBwZW5kaW5nXG4gICAgLy8gMTogcmVzb2x2aW5nXG4gICAgLy8gMjogcmVqZWN0aW5nXG4gICAgLy8gMzogcmVzb2x2ZWRcbiAgICAvLyA0OiByZWplY3RlZFxuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIHN0YXRlID0gMCxcbiAgICAgIHZhbCA9IDAsXG4gICAgICBuZXh0ID0gW107XG5cbiAgICBzZWxmWydwcm9taXNlJ10gPSBzZWxmXG5cbiAgICBzZWxmWydyZXNvbHZlJ10gPSBmdW5jdGlvbiAodikge1xuICAgICAgaWYgKCFzdGF0ZSkge1xuICAgICAgICB2YWwgPSB2XG4gICAgICAgIHN0YXRlID0gMVxuXG4gICAgICAgIHNldFRpbWVvdXQoZmlyZSlcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICAgc2VsZlsncmVqZWN0J10gPSBmdW5jdGlvbiAodikge1xuICAgICAgaWYgKCFzdGF0ZSkge1xuICAgICAgICB2YWwgPSB2XG4gICAgICAgIHN0YXRlID0gMlxuXG4gICAgICAgIHNldFRpbWVvdXQoZmlyZSlcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICAgc2VsZlsndGhlbiddID0gZnVuY3Rpb24gKGZuLCBlcikge1xuICAgICAgdmFyIGQgPSBuZXcgRGVmZXJyZWQoZm4sIGVyKVxuICAgICAgaWYgKHN0YXRlID09IDMpIHtcbiAgICAgICAgZC5yZXNvbHZlKHZhbClcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHN0YXRlID09IDQpIHtcbiAgICAgICAgZC5yZWplY3QodmFsKVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG5leHQucHVzaChkKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGRcbiAgICB9XG5cbiAgICB2YXIgZmluaXNoID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgIHN0YXRlID0gdHlwZSB8fCA0XG4gICAgICBuZXh0Lm1hcChmdW5jdGlvbiAocCkge1xuICAgICAgICBzdGF0ZSA9PSAzICYmIHAucmVzb2x2ZSh2YWwpIHx8IHAucmVqZWN0KHZhbClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8gcmVmIDogcmVmZXJlbmNlIHRvICd0aGVuJyBmdW5jdGlvblxuICAgIC8vIGNiLCBlYywgY24gOiBzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaywgbm90VGhlbm5hYmxlQ2FsbGJhY2tcbiAgICBmdW5jdGlvbiB0aGVubmFibGUgKHJlZiwgY2IsIGVjLCBjbikge1xuICAgICAgaWYgKHR5cGVvZiB2YWwgPT0gJ29iamVjdCcgJiYgdHlwZW9mIHJlZiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRyeSB7XG5cbiAgICAgICAgICAvLyBjbnQgcHJvdGVjdHMgYWdhaW5zdCBhYnVzZSBjYWxscyBmcm9tIHNwZWMgY2hlY2tlclxuICAgICAgICAgIHZhciBjbnQgPSAwXG4gICAgICAgICAgcmVmLmNhbGwodmFsLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgaWYgKGNudCsrKSByZXR1cm5cbiAgICAgICAgICAgIHZhbCA9IHZcbiAgICAgICAgICAgIGNiKClcbiAgICAgICAgICB9LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgaWYgKGNudCsrKSByZXR1cm5cbiAgICAgICAgICAgIHZhbCA9IHZcbiAgICAgICAgICAgIGVjKClcbiAgICAgICAgICB9KVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgdmFsID0gZVxuICAgICAgICAgIGVjKClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY24oKVxuICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBmaXJlKCkge1xuXG4gICAgICAvLyBjaGVjayBpZiBpdCdzIGEgdGhlbmFibGVcbiAgICAgIHZhciByZWY7XG4gICAgICB0cnkge1xuICAgICAgICByZWYgPSB2YWwgJiYgdmFsLnRoZW5cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdmFsID0gZVxuICAgICAgICBzdGF0ZSA9IDJcbiAgICAgICAgcmV0dXJuIGZpcmUoKVxuICAgICAgfVxuXG4gICAgICB0aGVubmFibGUocmVmLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN0YXRlID0gMVxuICAgICAgICBmaXJlKClcbiAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3RhdGUgPSAyXG4gICAgICAgIGZpcmUoKVxuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChzdGF0ZSA9PSAxICYmIHR5cGVvZiBmbiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YWwgPSBmbih2YWwpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZWxzZSBpZiAoc3RhdGUgPT0gMiAmJiB0eXBlb2YgZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdmFsID0gZXIodmFsKVxuICAgICAgICAgICAgc3RhdGUgPSAxXG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgdmFsID0gZVxuICAgICAgICAgIHJldHVybiBmaW5pc2goKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbCA9PSBzZWxmKSB7XG4gICAgICAgICAgdmFsID0gVHlwZUVycm9yKClcbiAgICAgICAgICBmaW5pc2goKVxuICAgICAgICB9IGVsc2UgdGhlbm5hYmxlKHJlZiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZmluaXNoKDMpXG4gICAgICAgICAgfSwgZmluaXNoLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmaW5pc2goc3RhdGUgPT0gMSAmJiAzKVxuICAgICAgICAgIH0pXG5cbiAgICAgIH0pXG4gICAgfVxuXG5cbiAgfVxuXG4gIC8vIEV4cG9ydCBvdXIgbGlicmFyeSBvYmplY3QsIGVpdGhlciBmb3Igbm9kZS5qcyBvciBhcyBhIGdsb2JhbGx5IHNjb3BlZCB2YXJpYWJsZVxuICBpZiAodHlwZW9mIG1vZHVsZSAhPSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZVsnZXhwb3J0cyddID0gRGVmZXJyZWRcbiAgfSBlbHNlIHtcbiAgICB0aGlzWydQcm9taXonXSA9IERlZmVycmVkXG4gIH1cbn0pKClcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIl19
