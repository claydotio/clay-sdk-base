(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
var IS_FRAMED, Promiz, SDK, TRUSTED_DOMAIN, debug, gameId, isInitialized, isValidOrigin, onMessage, pendingMessages, postMessage, status, validateParent;

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
  return pendingMessages[message.id].resolve(message.result);
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

SDK = (function() {
  function SDK() {
    this.version = 'v0.0.2';
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
      return new Promiz().reject(new Error('Unframed Not Implemented'));
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
    if (!isInitialized) {
      return new Promiz().reject(new Error('Must call Clay.init() first'));
    }
    if (!IS_FRAMED) {
      return new Promiz().reject(new Error('Missing parent frame. Make sure you are within a clay game running frame'));
    }
    return validateParent().then(function() {
      return postMessage(message);
    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL3pvbGkvY2xheS9jbGF5LWphdmFzY3JpcHQtc2RrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS96b2xpL2NsYXkvY2xheS1qYXZhc2NyaXB0LXNkay9zcmMvY2xheV9zZGsuY29mZmVlIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvY29tcG9uZW50cy9wcm9taXovcHJvbWl6Lm1pY3JvLmpzIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsb0pBQUE7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSLENBQVQsQ0FBQTs7QUFBQSxjQUVBLEdBQWlCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFaLElBQThCLFNBQS9CLENBQ2YsQ0FBQyxPQURjLENBQ04sS0FETSxFQUNDLEtBREQsQ0FGakIsQ0FBQTs7QUFBQSxTQUtBLEdBQVksTUFBTSxDQUFDLElBQVAsS0FBaUIsTUFBTSxDQUFDLEdBTHBDLENBQUE7O0FBQUEsZUFPQSxHQUFrQixFQVBsQixDQUFBOztBQUFBLGFBUUEsR0FBZ0IsS0FSaEIsQ0FBQTs7QUFBQSxNQVNBLEdBQVMsSUFUVCxDQUFBOztBQUFBLE1BVUEsR0FBUyxJQVZULENBQUE7O0FBQUEsS0FXQSxHQUFRLEtBWFIsQ0FBQTs7QUFBQSxXQWNBLEdBQWlCLENBQUEsU0FBQSxHQUFBO0FBQ2YsTUFBQSxTQUFBO0FBQUEsRUFBQSxTQUFBLEdBQVksQ0FBWixDQUFBO1NBRUEsU0FBQyxPQUFELEdBQUE7QUFDRSxRQUFBLGFBQUE7QUFBQSxJQUFBLFFBQUEsR0FBZSxJQUFBLE1BQUEsQ0FBQSxDQUFmLENBQUE7QUFFQTtBQUNFLE1B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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiUHJvbWl6ID0gcmVxdWlyZSAncHJvbWl6J1xuXG5UUlVTVEVEX0RPTUFJTiA9IChwcm9jZXNzLmVudi5UUlVTVEVEX0RPTUFJTiBvciAnY2xheS5pbycpXG4gIC5yZXBsYWNlKC9cXC4vZywgJ1xcXFwuJylcblxuSVNfRlJBTUVEID0gd2luZG93LnNlbGYgaXNudCB3aW5kb3cudG9wXG5cbnBlbmRpbmdNZXNzYWdlcyA9IHt9XG5pc0luaXRpYWxpemVkID0gZmFsc2VcbmdhbWVJZCA9IG51bGxcbnN0YXR1cyA9IG51bGxcbmRlYnVnID0gZmFsc2VcblxuXG5wb3N0TWVzc2FnZSA9IGRvIC0+XG4gIG1lc3NhZ2VJZCA9IDFcblxuICAobWVzc2FnZSkgLT5cbiAgICBkZWZlcnJlZCA9IG5ldyBQcm9taXooKVxuXG4gICAgdHJ5XG4gICAgICBtZXNzYWdlLmlkID0gbWVzc2FnZUlkXG4gICAgICBtZXNzYWdlLmdhbWVJZCA9IGdhbWVJZFxuICAgICAgbWVzc2FnZS5hY2Nlc3NUb2tlbiA9IHN0YXR1cz8uYWNjZXNzVG9rZW5cbiAgICAgIG1lc3NhZ2UuX2NsYXkgPSB0cnVlXG4gICAgICBtZXNzYWdlLmpzb25ycGMgPSAnMi4wJ1xuXG4gICAgICBwZW5kaW5nTWVzc2FnZXNbbWVzc2FnZS5pZF0gPSBkZWZlcnJlZFxuXG4gICAgICBtZXNzYWdlSWQgKz0gMVxuXG4gICAgICAjIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHRlbGwgd2hvIHRoZSBwYXJlbnQgaXMgaGVyZVxuICAgICAgIyBUaGUgY2xpZW50IGhhcyB0byBwaW5nIHRoZSBwYXJlbnQgYW5kIGdldCBhIHJlc3BvbnNlIHRvIHZlcmlmeVxuICAgICAgd2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSBKU09OLnN0cmluZ2lmeShtZXNzYWdlKSwgJyonXG5cbiAgICBjYXRjaCBlcnJcbiAgICAgIGRlZmVycmVkLnJlamVjdCBlcnJcblxuICAgIHJldHVybiBkZWZlcnJlZFxuXG5vbk1lc3NhZ2UgPSAoZSkgLT5cbiAgaWYgbm90IGRlYnVnIGFuZCBub3QgaXNWYWxpZE9yaWdpbiBlLm9yaWdpblxuICAgIHRocm93IG5ldyBFcnJvciBcIkludmFsaWQgb3JpZ2luICN7ZS5vcmlnaW59XCJcblxuICBtZXNzYWdlID0gSlNPTi5wYXJzZSBlLmRhdGFcblxuICB1bmxlc3MgbWVzc2FnZS5pZFxuICAgIHJldHVyblxuXG4gIHBlbmRpbmdNZXNzYWdlc1ttZXNzYWdlLmlkXS5yZXNvbHZlIG1lc3NhZ2UucmVzdWx0XG5cblxuIyBUaGlzIGlzIHVzZWQgdG8gdmVyaWZ5IHRoYXQgdGhlIHBhcmVudCBpcyBjbGF5LmlvXG4jIElmIGl0J3Mgbm90LCB0aGUgcG9zdE1lc3NhZ2UgcHJvbWlzZSB3aWxsIGZhaWwgYmVjYXVzZSBvZiBvbk1lc3NhZ2UgY2hlY2tcbnZhbGlkYXRlUGFyZW50ID0gLT5cbiAgcG9zdE1lc3NhZ2VcbiAgICBtZXRob2Q6ICdwaW5nJ1xuXG5pc1ZhbGlkT3JpZ2luID0gKG9yaWdpbikgLT5cbiAgcmVnZXggPSBuZXcgUmVnRXhwIFwiXmh0dHBzPzovLyhcXFxcdytcXFxcLik/KFxcXFx3K1xcXFwuKT8je1RSVVNURURfRE9NQUlOfS8/JFwiXG4gIHJldHVybiByZWdleC50ZXN0IG9yaWdpblxuXG5cblxuY2xhc3MgU0RLXG4gIGNvbnN0cnVjdG9yOiAtPlxuICAgIEB2ZXJzaW9uID0gJ3YwLjAuMidcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbWVzc2FnZScsIG9uTWVzc2FnZVxuXG4gICMgRk9SIFRFU1RJTkcgT05MWVxuICBfc2V0SW5pdGlhbGl6ZWQ6IChzdGF0ZSkgLT5cbiAgICBpc0luaXRpYWxpemVkID0gc3RhdGVcblxuICBfc2V0RGVidWc6IChzdGF0ZSkgLT5cbiAgICBkZWJ1ZyA9IHN0YXRlXG5cbiAgX3NldEZyYW1lZDogKHN0YXRlKSAtPlxuICAgIElTX0ZSQU1FRCA9IHN0YXRlXG5cbiAgIyB1c2VkIGJ5IGNsYXlfdWksIGNvdWxkIHByb2JhYmx5IGJlIGJldHRlclxuICBfY29uZmlnOiB7fVxuXG4gICMgUHVibGljXG4gIGluaXQ6IChvcHRzKSAtPlxuICAgIGdhbWVJZCA9IG9wdHM/LmdhbWVJZFxuICAgIGRlYnVnID0gQm9vbGVhbiBvcHRzPy5kZWJ1Z1xuXG4gICAgQF9jb25maWcuZ2FtZUlkID0gZ2FtZUlkXG5cbiAgICB1bmxlc3MgZ2FtZUlkXG4gICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ01pc3NpbmcgZ2FtZUlkJ1xuXG4gICAgaWYgSVNfRlJBTUVEXG4gICAgICByZXR1cm4gdmFsaWRhdGVQYXJlbnQoKVxuICAgICAgLnRoZW4gLT5cbiAgICAgICAgcG9zdE1lc3NhZ2VcbiAgICAgICAgICBtZXRob2Q6ICdhdXRoLmdldFN0YXR1cydcbiAgICAgIC50aGVuIChfc3RhdHVzKSAtPlxuICAgICAgICBpc0luaXRpYWxpemVkID0gdHJ1ZVxuICAgICAgICAjIFRPRE86IFRva2VuIG1heSBiZSBpbnZhbGlkXG4gICAgICAgIHN0YXR1cyA9IF9zdGF0dXNcblxuICAgIGVsc2VcbiAgICAgIHJldHVybiBuZXcgUHJvbWl6KCkucmVqZWN0IG5ldyBFcnJvciAnVW5mcmFtZWQgTm90IEltcGxlbWVudGVkJ1xuXG4gIGxvZ2luOiAoe3Njb3BlfSkgLT5cbiAgICAjIFRPRE86IE9BdXRoIG1hZ2ljLiBHZXRzIHRva2VuXG4gICAgcmV0dXJuIG5ldyBQcm9taXooKS5yZWplY3QgbmV3IEVycm9yICdOb3QgSW1wbGVtZW50ZWQnXG5cbiAgYXBpOiAtPlxuICAgICMgVE9ETzogaW1wbGVtZW50XG4gICAgcmV0dXJuIG5ldyBQcm9taXooKS5yZWplY3QgbmV3IEVycm9yICdOb3QgSW1wbGVtZW50ZWQnXG5cbiAgY2xpZW50OiAobWVzc2FnZSkgLT5cbiAgICB1bmxlc3MgaXNJbml0aWFsaXplZFxuICAgICAgcmV0dXJuIG5ldyBQcm9taXooKS5yZWplY3QgbmV3IEVycm9yICdNdXN0IGNhbGwgQ2xheS5pbml0KCkgZmlyc3QnXG5cbiAgICB1bmxlc3MgSVNfRlJBTUVEXG4gICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ01pc3NpbmcgcGFyZW50IGZyYW1lLiBNYWtlIHN1cmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeW91IGFyZSB3aXRoaW4gYSBjbGF5IGdhbWUgcnVubmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZSdcblxuICAgIHZhbGlkYXRlUGFyZW50KClcbiAgICAudGhlbiAtPlxuICAgICAgcG9zdE1lc3NhZ2UgbWVzc2FnZVxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTREsoKVxuIiwiKGZ1bmN0aW9uICgpIHtcbiAgXG4gIC8qKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIERlZmVycmVkKGZuLCBlcikge1xuICAgIC8vIHN0YXRlc1xuICAgIC8vIDA6IHBlbmRpbmdcbiAgICAvLyAxOiByZXNvbHZpbmdcbiAgICAvLyAyOiByZWplY3RpbmdcbiAgICAvLyAzOiByZXNvbHZlZFxuICAgIC8vIDQ6IHJlamVjdGVkXG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgc3RhdGUgPSAwLFxuICAgICAgdmFsID0gMCxcbiAgICAgIG5leHQgPSBbXTtcblxuICAgIHNlbGZbJ3Byb21pc2UnXSA9IHNlbGZcblxuICAgIHNlbGZbJ3Jlc29sdmUnXSA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICBpZiAoIXN0YXRlKSB7XG4gICAgICAgIHZhbCA9IHZcbiAgICAgICAgc3RhdGUgPSAxXG5cbiAgICAgICAgc2V0VGltZW91dChmaXJlKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICBzZWxmWydyZWplY3QnXSA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICBpZiAoIXN0YXRlKSB7XG4gICAgICAgIHZhbCA9IHZcbiAgICAgICAgc3RhdGUgPSAyXG5cbiAgICAgICAgc2V0VGltZW91dChmaXJlKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICBzZWxmWyd0aGVuJ10gPSBmdW5jdGlvbiAoZm4sIGVyKSB7XG4gICAgICB2YXIgZCA9IG5ldyBEZWZlcnJlZChmbiwgZXIpXG4gICAgICBpZiAoc3RhdGUgPT0gMykge1xuICAgICAgICBkLnJlc29sdmUodmFsKVxuICAgICAgfVxuICAgICAgZWxzZSBpZiAoc3RhdGUgPT0gNCkge1xuICAgICAgICBkLnJlamVjdCh2YWwpXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgbmV4dC5wdXNoKGQpXG4gICAgICB9XG4gICAgICByZXR1cm4gZFxuICAgIH1cblxuICAgIHZhciBmaW5pc2ggPSBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgc3RhdGUgPSB0eXBlIHx8IDRcbiAgICAgIG5leHQubWFwKGZ1bmN0aW9uIChwKSB7XG4gICAgICAgIHN0YXRlID09IDMgJiYgcC5yZXNvbHZlKHZhbCkgfHwgcC5yZWplY3QodmFsKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyByZWYgOiByZWZlcmVuY2UgdG8gJ3RoZW4nIGZ1bmN0aW9uXG4gICAgLy8gY2IsIGVjLCBjbiA6IHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrLCBub3RUaGVubmFibGVDYWxsYmFja1xuICAgIGZ1bmN0aW9uIHRoZW5uYWJsZSAocmVmLCBjYiwgZWMsIGNuKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbCA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgcmVmID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdHJ5IHtcblxuICAgICAgICAgIC8vIGNudCBwcm90ZWN0cyBhZ2FpbnN0IGFidXNlIGNhbGxzIGZyb20gc3BlYyBjaGVja2VyXG4gICAgICAgICAgdmFyIGNudCA9IDBcbiAgICAgICAgICByZWYuY2FsbCh2YWwsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICBpZiAoY250KyspIHJldHVyblxuICAgICAgICAgICAgdmFsID0gdlxuICAgICAgICAgICAgY2IoKVxuICAgICAgICAgIH0sIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICBpZiAoY250KyspIHJldHVyblxuICAgICAgICAgICAgdmFsID0gdlxuICAgICAgICAgICAgZWMoKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICB2YWwgPSBlXG4gICAgICAgICAgZWMoKVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbigpXG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGZpcmUoKSB7XG5cbiAgICAgIC8vIGNoZWNrIGlmIGl0J3MgYSB0aGVuYWJsZVxuICAgICAgdmFyIHJlZjtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlZiA9IHZhbCAmJiB2YWwudGhlblxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB2YWwgPSBlXG4gICAgICAgIHN0YXRlID0gMlxuICAgICAgICByZXR1cm4gZmlyZSgpXG4gICAgICB9XG5cbiAgICAgIHRoZW5uYWJsZShyZWYsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3RhdGUgPSAxXG4gICAgICAgIGZpcmUoKVxuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICBzdGF0ZSA9IDJcbiAgICAgICAgZmlyZSgpXG4gICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKHN0YXRlID09IDEgJiYgdHlwZW9mIGZuID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHZhbCA9IGZuKHZhbClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBlbHNlIGlmIChzdGF0ZSA9PSAyICYmIHR5cGVvZiBlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YWwgPSBlcih2YWwpXG4gICAgICAgICAgICBzdGF0ZSA9IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICB2YWwgPSBlXG4gICAgICAgICAgcmV0dXJuIGZpbmlzaCgpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmFsID09IHNlbGYpIHtcbiAgICAgICAgICB2YWwgPSBUeXBlRXJyb3IoKVxuICAgICAgICAgIGZpbmlzaCgpXG4gICAgICAgIH0gZWxzZSB0aGVubmFibGUocmVmLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmaW5pc2goMylcbiAgICAgICAgICB9LCBmaW5pc2gsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZpbmlzaChzdGF0ZSA9PSAxICYmIDMpXG4gICAgICAgICAgfSlcblxuICAgICAgfSlcbiAgICB9XG5cblxuICB9XG5cbiAgLy8gRXhwb3J0IG91ciBsaWJyYXJ5IG9iamVjdCwgZWl0aGVyIGZvciBub2RlLmpzIG9yIGFzIGEgZ2xvYmFsbHkgc2NvcGVkIHZhcmlhYmxlXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlWydleHBvcnRzJ10gPSBEZWZlcnJlZFxuICB9IGVsc2Uge1xuICAgIHRoaXNbJ1Byb21peiddID0gRGVmZXJyZWRcbiAgfVxufSkoKVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iXX0=
