(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
(function(name, context, definition) {
  var Clay, key, val, _results;
  if (typeof module !== 'undefined' && module.exports) {
    return module.exports = definition();
  } else if (typeof define === 'function' && define.amd) {
    return define(definition);
  } else {
    if (context[name]) {
      Clay = definition();
      _results = [];
      for (key in Clay) {
        val = Clay[key];
        if (typeof val === 'function') {
          _results.push(context[name][key] = function() {
            return val.apply(Clay, arguments);
          });
        } else {
          _results.push(context[name][key] = val);
        }
      }
      return _results;
    } else {
      return context[name] = definition();
    }
  }
})('Clay', this, function() {
  var IS_FRAMED, Promiz, SDK, TRUSTED_DOMAIN, clientId, isInitialized, isValidOrigin, onMessage, pendingMessages, postMessage, status, validateParent;
  Promiz = require('promiz');
  TRUSTED_DOMAIN = (process.env.TRUSTED_DOMAIN || 'clay.io').replace(/\./g, '\\.');
  IS_FRAMED = window.parent !== window.top;
  pendingMessages = {};
  isInitialized = false;
  clientId = null;
  status = null;
  postMessage = (function() {
    var messageId;
    messageId = 1;
    return function(message) {
      var deferred, err;
      deferred = new Promiz();
      try {
        message._id = messageId;
        message._clientId = clientId;
        message._accessToken = status != null ? status.accessToken : void 0;
        pendingMessages[message._id] = deferred;
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
    if (!isValidOrigin(e.origin)) {
      throw new Error("Invalid origin " + e.origin);
    }
    message = JSON.parse(e.data);
    return pendingMessages[message._id].resolve(message.result);
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
      this.version = 'v0.0.0';
      window.addEventListener('message', onMessage);
    }

    SDK.prototype._setInitialized = function(state) {
      return isInitialized = state;
    };

    SDK.prototype._setFramed = function(state) {
      return IS_FRAMED = state;
    };

    SDK.prototype.init = function(opts) {
      clientId = opts != null ? opts.clientId : void 0;
      if (!clientId) {
        return new Promiz().reject(new Error('Missing clientId'));
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
  return new SDK();
});



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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL3pvbGkvY2xheS9jbGF5LWphdmFzY3JpcHQtc2RrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS96b2xpL2NsYXkvY2xheS1qYXZhc2NyaXB0LXNkay9zcmMvY2xheV9zZGsuY29mZmVlIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvY29tcG9uZW50cy9wcm9taXovcHJvbWl6Lm1pY3JvLmpzIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLENBQUMsU0FBQyxJQUFELEVBQU8sT0FBUCxFQUFnQixVQUFoQixHQUFBO0FBQ0MsTUFBQSx3QkFBQTtBQUFBLEVBQUEsSUFBRyxNQUFBLENBQUEsTUFBQSxLQUFtQixXQUFuQixJQUFtQyxNQUFNLENBQUMsT0FBN0M7V0FDRSxNQUFNLENBQUMsT0FBUCxHQUFpQixVQUFBLENBQUEsRUFEbkI7R0FBQSxNQUVLLElBQUcsTUFBQSxDQUFBLE1BQUEsS0FBaUIsVUFBakIsSUFBZ0MsTUFBTSxDQUFDLEdBQTFDO1dBQ0gsTUFBQSxDQUFPLFVBQVAsRUFERztHQUFBLE1BQUE7QUFHSCxJQUFBLElBQUcsT0FBUSxDQUFBLElBQUEsQ0FBWDtBQUNFLE1BQUEsSUFBQSxHQUFPLFVBQUEsQ0FBQSxDQUFQLENBQUE7QUFDQTtXQUFBLFdBQUE7d0JBQUE7QUFDRSxRQUFBLElBQUcsTUFBQSxDQUFBLEdBQUEsS0FBYyxVQUFqQjt3QkFDRSxPQUFRLENBQUEsSUFBQSxDQUFNLENBQUEsR0FBQSxDQUFkLEdBQXFCLFNBQUEsR0FBQTttQkFBRyxHQUFHLENBQUMsS0FBSixDQUFVLElBQVYsRUFBZ0IsU0FBaEIsRUFBSDtVQUFBLEdBRHZCO1NB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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKChuYW1lLCBjb250ZXh0LCBkZWZpbml0aW9uKSAtPlxuICBpZiB0eXBlb2YgbW9kdWxlIGlzbnQgJ3VuZGVmaW5lZCcgYW5kIG1vZHVsZS5leHBvcnRzXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKClcbiAgZWxzZSBpZiB0eXBlb2YgZGVmaW5lIGlzICdmdW5jdGlvbicgYW5kIGRlZmluZS5hbWRcbiAgICBkZWZpbmUoZGVmaW5pdGlvbilcbiAgZWxzZVxuICAgIGlmIGNvbnRleHRbbmFtZV1cbiAgICAgIENsYXkgPSBkZWZpbml0aW9uKClcbiAgICAgIGZvciBrZXksIHZhbCBvZiBDbGF5XG4gICAgICAgIGlmIHR5cGVvZiB2YWwgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICAgIGNvbnRleHRbbmFtZV1ba2V5XSA9IC0+IHZhbC5hcHBseSBDbGF5LCBhcmd1bWVudHNcbiAgICAgICAgZWxzZSBjb250ZXh0W25hbWVdW2tleV0gPSB2YWxcbiAgICBlbHNlXG4gICAgICBjb250ZXh0W25hbWVdID0gZGVmaW5pdGlvbigpXG4pKCdDbGF5JywgdGhpcywgLT5cblxuICBQcm9taXogPSByZXF1aXJlICdwcm9taXonXG5cbiAgVFJVU1RFRF9ET01BSU4gPSAocHJvY2Vzcy5lbnYuVFJVU1RFRF9ET01BSU4gb3IgJ2NsYXkuaW8nKVxuICAgIC5yZXBsYWNlKC9cXC4vZywgJ1xcXFwuJylcblxuICBJU19GUkFNRUQgPSB3aW5kb3cucGFyZW50IGlzbnQgd2luZG93LnRvcFxuXG4gIHBlbmRpbmdNZXNzYWdlcyA9IHt9XG4gIGlzSW5pdGlhbGl6ZWQgPSBmYWxzZVxuICBjbGllbnRJZCA9IG51bGxcbiAgc3RhdHVzID0gbnVsbFxuXG4gIHBvc3RNZXNzYWdlID0gZG8gLT5cbiAgICBtZXNzYWdlSWQgPSAxXG5cbiAgICAobWVzc2FnZSkgLT5cbiAgICAgIGRlZmVycmVkID0gbmV3IFByb21peigpXG5cbiAgICAgIHRyeVxuICAgICAgICBtZXNzYWdlLl9pZCA9IG1lc3NhZ2VJZFxuICAgICAgICBtZXNzYWdlLl9jbGllbnRJZCA9IGNsaWVudElkXG4gICAgICAgIG1lc3NhZ2UuX2FjY2Vzc1Rva2VuID0gc3RhdHVzPy5hY2Nlc3NUb2tlblxuXG4gICAgICAgIHBlbmRpbmdNZXNzYWdlc1ttZXNzYWdlLl9pZF0gPSBkZWZlcnJlZFxuXG4gICAgICAgIG1lc3NhZ2VJZCArPSAxXG5cbiAgICAgICAgIyBJdCdzIG5vdCBwb3NzaWJsZSB0byB0ZWxsIHdobyB0aGUgcGFyZW50IGlzIGhlcmVcbiAgICAgICAgIyBUaGUgY2xpZW50IGhhcyB0byBwaW5nIHRoZSBwYXJlbnQgYW5kIGdldCBhIHJlc3BvbnNlIHRvIHZlcmlmeVxuICAgICAgICB3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlIEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpLCAnKidcblxuICAgICAgY2F0Y2ggZXJyXG4gICAgICAgIGRlZmVycmVkLnJlamVjdCBlcnJcblxuICAgICAgcmV0dXJuIGRlZmVycmVkXG5cbiAgb25NZXNzYWdlID0gKGUpIC0+XG4gICAgdW5sZXNzIGlzVmFsaWRPcmlnaW4gZS5vcmlnaW5cbiAgICAgIHRocm93IG5ldyBFcnJvciBcIkludmFsaWQgb3JpZ2luICN7ZS5vcmlnaW59XCJcblxuICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlIGUuZGF0YVxuICAgIHBlbmRpbmdNZXNzYWdlc1ttZXNzYWdlLl9pZF0ucmVzb2x2ZSBtZXNzYWdlLnJlc3VsdFxuXG5cbiAgIyBUaGlzIGlzIHVzZWQgdG8gdmVyaWZ5IHRoYXQgdGhlIHBhcmVudCBpcyBjbGF5LmlvXG4gICMgSWYgaXQncyBub3QsIHRoZSBwb3N0TWVzc2FnZSBwcm9taXNlIHdpbGwgZmFpbCBiZWNhdXNlIG9mIG9uTWVzc2FnZSBjaGVja1xuICB2YWxpZGF0ZVBhcmVudCA9IC0+XG4gICAgcG9zdE1lc3NhZ2VcbiAgICAgIG1ldGhvZDogJ3BpbmcnXG5cbiAgaXNWYWxpZE9yaWdpbiA9IChvcmlnaW4pIC0+XG4gICAgcmVnZXggPSBuZXcgUmVnRXhwIFwiXmh0dHBzPzovLyhcXFxcdytcXFxcLik/KFxcXFx3K1xcXFwuKT8je1RSVVNURURfRE9NQUlOfS8/JFwiXG4gICAgcmV0dXJuIHJlZ2V4LnRlc3Qgb3JpZ2luXG5cblxuXG4gIGNsYXNzIFNES1xuICAgIGNvbnN0cnVjdG9yOiAtPlxuICAgICAgQHZlcnNpb24gPSAndjAuMC4wJ1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJ21lc3NhZ2UnLCBvbk1lc3NhZ2VcblxuICAgICMgRk9SIFRFU1RJTkcgT05MWVxuICAgIF9zZXRJbml0aWFsaXplZDogKHN0YXRlKSAtPlxuICAgICAgaXNJbml0aWFsaXplZCA9IHN0YXRlXG5cbiAgICBfc2V0RnJhbWVkOiAoc3RhdGUpIC0+XG4gICAgICBJU19GUkFNRUQgPSBzdGF0ZVxuXG4gICAgIyBQdWJsaWNcbiAgICBpbml0OiAob3B0cykgLT5cbiAgICAgIGNsaWVudElkID0gb3B0cz8uY2xpZW50SWRcblxuICAgICAgdW5sZXNzIGNsaWVudElkXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWl6KCkucmVqZWN0IG5ldyBFcnJvciAnTWlzc2luZyBjbGllbnRJZCdcblxuICAgICAgaWYgSVNfRlJBTUVEXG4gICAgICAgIHZhbGlkYXRlUGFyZW50KClcbiAgICAgICAgLnRoZW4gLT5cbiAgICAgICAgICBwb3N0TWVzc2FnZVxuICAgICAgICAgICAgbWV0aG9kOiAnYXV0aC5nZXRTdGF0dXMnXG4gICAgICAgIC50aGVuIChfc3RhdHVzKSAtPlxuICAgICAgICAgIGlzSW5pdGlhbGl6ZWQgPSB0cnVlXG4gICAgICAgICAgIyBUT0RPOiBUb2tlbiBtYXkgYmUgaW52YWxpZFxuICAgICAgICAgIHN0YXR1cyA9IF9zdGF0dXNcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXooKS5yZWplY3QgbmV3IEVycm9yICdVbmZyYW1lZCBOb3QgSW1wbGVtZW50ZWQnXG5cbiAgICBsb2dpbjogKHtzY29wZX0pIC0+XG4gICAgICAjIFRPRE86IE9BdXRoIG1hZ2ljLiBHZXRzIHRva2VuXG4gICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ05vdCBJbXBsZW1lbnRlZCdcblxuICAgIGFwaTogLT5cbiAgICAgICMgVE9ETzogaW1wbGVtZW50XG4gICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ05vdCBJbXBsZW1lbnRlZCdcblxuICAgIGNsaWVudDogKG1lc3NhZ2UpIC0+XG4gICAgICB1bmxlc3MgaXNJbml0aWFsaXplZFxuICAgICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ011c3QgY2FsbCBDbGF5LmluaXQoKSBmaXJzdCdcblxuICAgICAgdW5sZXNzIElTX0ZSQU1FRFxuICAgICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ01pc3NpbmcgcGFyZW50IGZyYW1lLiBNYWtlIHN1cmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5b3UgYXJlIHdpdGhpbiBhIGNsYXkgZ2FtZSBydW5uaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWUnXG5cbiAgICAgIHZhbGlkYXRlUGFyZW50KClcbiAgICAgIC50aGVuIC0+XG4gICAgICAgIHBvc3RNZXNzYWdlIG1lc3NhZ2VcblxuXG5cblxuICByZXR1cm4gbmV3IFNESygpXG5cblxuKVxuIiwiKGZ1bmN0aW9uICgpIHtcbiAgXG4gIC8qKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIERlZmVycmVkKGZuLCBlcikge1xuICAgIC8vIHN0YXRlc1xuICAgIC8vIDA6IHBlbmRpbmdcbiAgICAvLyAxOiByZXNvbHZpbmdcbiAgICAvLyAyOiByZWplY3RpbmdcbiAgICAvLyAzOiByZXNvbHZlZFxuICAgIC8vIDQ6IHJlamVjdGVkXG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgc3RhdGUgPSAwLFxuICAgICAgdmFsID0gMCxcbiAgICAgIG5leHQgPSBbXTtcblxuICAgIHNlbGZbJ3Byb21pc2UnXSA9IHNlbGZcblxuICAgIHNlbGZbJ3Jlc29sdmUnXSA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICBpZiAoIXN0YXRlKSB7XG4gICAgICAgIHZhbCA9IHZcbiAgICAgICAgc3RhdGUgPSAxXG5cbiAgICAgICAgc2V0VGltZW91dChmaXJlKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICBzZWxmWydyZWplY3QnXSA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICBpZiAoIXN0YXRlKSB7XG4gICAgICAgIHZhbCA9IHZcbiAgICAgICAgc3RhdGUgPSAyXG5cbiAgICAgICAgc2V0VGltZW91dChmaXJlKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICBzZWxmWyd0aGVuJ10gPSBmdW5jdGlvbiAoZm4sIGVyKSB7XG4gICAgICB2YXIgZCA9IG5ldyBEZWZlcnJlZChmbiwgZXIpXG4gICAgICBpZiAoc3RhdGUgPT0gMykge1xuICAgICAgICBkLnJlc29sdmUodmFsKVxuICAgICAgfVxuICAgICAgZWxzZSBpZiAoc3RhdGUgPT0gNCkge1xuICAgICAgICBkLnJlamVjdCh2YWwpXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgbmV4dC5wdXNoKGQpXG4gICAgICB9XG4gICAgICByZXR1cm4gZFxuICAgIH1cblxuICAgIHZhciBmaW5pc2ggPSBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgc3RhdGUgPSB0eXBlIHx8IDRcbiAgICAgIG5leHQubWFwKGZ1bmN0aW9uIChwKSB7XG4gICAgICAgIHN0YXRlID09IDMgJiYgcC5yZXNvbHZlKHZhbCkgfHwgcC5yZWplY3QodmFsKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyByZWYgOiByZWZlcmVuY2UgdG8gJ3RoZW4nIGZ1bmN0aW9uXG4gICAgLy8gY2IsIGVjLCBjbiA6IHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrLCBub3RUaGVubmFibGVDYWxsYmFja1xuICAgIGZ1bmN0aW9uIHRoZW5uYWJsZSAocmVmLCBjYiwgZWMsIGNuKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbCA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgcmVmID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdHJ5IHtcblxuICAgICAgICAgIC8vIGNudCBwcm90ZWN0cyBhZ2FpbnN0IGFidXNlIGNhbGxzIGZyb20gc3BlYyBjaGVja2VyXG4gICAgICAgICAgdmFyIGNudCA9IDBcbiAgICAgICAgICByZWYuY2FsbCh2YWwsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICBpZiAoY250KyspIHJldHVyblxuICAgICAgICAgICAgdmFsID0gdlxuICAgICAgICAgICAgY2IoKVxuICAgICAgICAgIH0sIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICBpZiAoY250KyspIHJldHVyblxuICAgICAgICAgICAgdmFsID0gdlxuICAgICAgICAgICAgZWMoKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICB2YWwgPSBlXG4gICAgICAgICAgZWMoKVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbigpXG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGZpcmUoKSB7XG5cbiAgICAgIC8vIGNoZWNrIGlmIGl0J3MgYSB0aGVuYWJsZVxuICAgICAgdmFyIHJlZjtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlZiA9IHZhbCAmJiB2YWwudGhlblxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB2YWwgPSBlXG4gICAgICAgIHN0YXRlID0gMlxuICAgICAgICByZXR1cm4gZmlyZSgpXG4gICAgICB9XG5cbiAgICAgIHRoZW5uYWJsZShyZWYsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3RhdGUgPSAxXG4gICAgICAgIGZpcmUoKVxuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICBzdGF0ZSA9IDJcbiAgICAgICAgZmlyZSgpXG4gICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKHN0YXRlID09IDEgJiYgdHlwZW9mIGZuID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHZhbCA9IGZuKHZhbClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBlbHNlIGlmIChzdGF0ZSA9PSAyICYmIHR5cGVvZiBlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YWwgPSBlcih2YWwpXG4gICAgICAgICAgICBzdGF0ZSA9IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICB2YWwgPSBlXG4gICAgICAgICAgcmV0dXJuIGZpbmlzaCgpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmFsID09IHNlbGYpIHtcbiAgICAgICAgICB2YWwgPSBUeXBlRXJyb3IoKVxuICAgICAgICAgIGZpbmlzaCgpXG4gICAgICAgIH0gZWxzZSB0aGVubmFibGUocmVmLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmaW5pc2goMylcbiAgICAgICAgICB9LCBmaW5pc2gsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZpbmlzaChzdGF0ZSA9PSAxICYmIDMpXG4gICAgICAgICAgfSlcblxuICAgICAgfSlcbiAgICB9XG5cblxuICB9XG5cbiAgLy8gRXhwb3J0IG91ciBsaWJyYXJ5IG9iamVjdCwgZWl0aGVyIGZvciBub2RlLmpzIG9yIGFzIGEgZ2xvYmFsbHkgc2NvcGVkIHZhcmlhYmxlXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlWydleHBvcnRzJ10gPSBEZWZlcnJlZFxuICB9IGVsc2Uge1xuICAgIHRoaXNbJ1Byb21peiddID0gRGVmZXJyZWRcbiAgfVxufSkoKVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iXX0=
