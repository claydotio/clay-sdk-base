(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
(function(name, context, definition) {
  if (typeof module !== 'undefined' && module.exports) {
    return module.exports = definition();
  } else if (typeof define === 'function' && define.amd) {
    return define(definition);
  } else {
    return context[name] = definition();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL3pvbGkvY2xheS9jbGF5LWphdmFzY3JpcHQtc2RrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS96b2xpL2NsYXkvY2xheS1qYXZhc2NyaXB0LXNkay9zcmMvY2xheV9zZGsuY29mZmVlIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvY29tcG9uZW50cy9wcm9taXovcHJvbWl6Lm1pY3JvLmpzIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLENBQUMsU0FBQyxJQUFELEVBQU8sT0FBUCxFQUFnQixVQUFoQixHQUFBO0FBQ0MsRUFBQSxJQUFHLE1BQUEsQ0FBQSxNQUFBLEtBQW1CLFdBQW5CLElBQW1DLE1BQU0sQ0FBQyxPQUE3QztXQUNFLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFVBQUEsQ0FBQSxFQURuQjtHQUFBLE1BRUssSUFBRyxNQUFBLENBQUEsTUFBQSxLQUFpQixVQUFqQixJQUFnQyxNQUFNLENBQUMsR0FBMUM7V0FDSCxNQUFBLENBQU8sVUFBUCxFQURHO0dBQUEsTUFBQTtXQUdILE9BQVEsQ0FBQSxJQUFBLENBQVIsR0FBZ0IsVUFBQSxDQUFBLEVBSGI7R0FITjtBQUFBLENBQUQsQ0FBQSxDQU9FLE1BUEYsRUFPVSxJQVBWLEVBT2dCLFNBQUEsR0FBQTtBQUVkLE1BQUEsK0lBQUE7QUFBQSxFQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUixDQUFULENBQUE7QUFBQSxFQUVBLGNBQUEsR0FBaUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQVosSUFBOEIsU0FBL0IsQ0FDZixDQUFDLE9BRGMsQ0FDTixLQURNLEVBQ0MsS0FERCxDQUZqQixDQUFB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoKG5hbWUsIGNvbnRleHQsIGRlZmluaXRpb24pIC0+XG4gIGlmIHR5cGVvZiBtb2R1bGUgaXNudCAndW5kZWZpbmVkJyBhbmQgbW9kdWxlLmV4cG9ydHNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKVxuICBlbHNlIGlmIHR5cGVvZiBkZWZpbmUgaXMgJ2Z1bmN0aW9uJyBhbmQgZGVmaW5lLmFtZFxuICAgIGRlZmluZShkZWZpbml0aW9uKVxuICBlbHNlXG4gICAgY29udGV4dFtuYW1lXSA9IGRlZmluaXRpb24oKVxuKSgnQ2xheScsIHRoaXMsIC0+XG5cbiAgUHJvbWl6ID0gcmVxdWlyZSAncHJvbWl6J1xuXG4gIFRSVVNURURfRE9NQUlOID0gKHByb2Nlc3MuZW52LlRSVVNURURfRE9NQUlOIG9yICdjbGF5LmlvJylcbiAgICAucmVwbGFjZSgvXFwuL2csICdcXFxcLicpXG5cbiAgSVNfRlJBTUVEID0gd2luZG93LnBhcmVudCBpc250IHdpbmRvdy50b3BcblxuICBwZW5kaW5nTWVzc2FnZXMgPSB7fVxuICBpc0luaXRpYWxpemVkID0gZmFsc2VcbiAgY2xpZW50SWQgPSBudWxsXG4gIHN0YXR1cyA9IG51bGxcblxuICBwb3N0TWVzc2FnZSA9IGRvIC0+XG4gICAgbWVzc2FnZUlkID0gMVxuXG4gICAgKG1lc3NhZ2UpIC0+XG4gICAgICBkZWZlcnJlZCA9IG5ldyBQcm9taXooKVxuXG4gICAgICB0cnlcbiAgICAgICAgbWVzc2FnZS5faWQgPSBtZXNzYWdlSWRcbiAgICAgICAgbWVzc2FnZS5fY2xpZW50SWQgPSBjbGllbnRJZFxuICAgICAgICBtZXNzYWdlLl9hY2Nlc3NUb2tlbiA9IHN0YXR1cz8uYWNjZXNzVG9rZW5cblxuICAgICAgICBwZW5kaW5nTWVzc2FnZXNbbWVzc2FnZS5faWRdID0gZGVmZXJyZWRcblxuICAgICAgICBtZXNzYWdlSWQgKz0gMVxuXG4gICAgICAgICMgSXQncyBub3QgcG9zc2libGUgdG8gdGVsbCB3aG8gdGhlIHBhcmVudCBpcyBoZXJlXG4gICAgICAgICMgVGhlIGNsaWVudCBoYXMgdG8gcGluZyB0aGUgcGFyZW50IGFuZCBnZXQgYSByZXNwb25zZSB0byB2ZXJpZnlcbiAgICAgICAgd2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSBKU09OLnN0cmluZ2lmeShtZXNzYWdlKSwgJyonXG5cbiAgICAgIGNhdGNoIGVyclxuICAgICAgICBkZWZlcnJlZC5yZWplY3QgZXJyXG5cbiAgICAgIHJldHVybiBkZWZlcnJlZFxuXG4gIG9uTWVzc2FnZSA9IChlKSAtPlxuICAgIHVubGVzcyBpc1ZhbGlkT3JpZ2luIGUub3JpZ2luXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJJbnZhbGlkIG9yaWdpbiAje2Uub3JpZ2lufVwiXG5cbiAgICBtZXNzYWdlID0gSlNPTi5wYXJzZSBlLmRhdGFcbiAgICBwZW5kaW5nTWVzc2FnZXNbbWVzc2FnZS5faWRdLnJlc29sdmUgbWVzc2FnZS5yZXN1bHRcblxuXG4gICMgVGhpcyBpcyB1c2VkIHRvIHZlcmlmeSB0aGF0IHRoZSBwYXJlbnQgaXMgY2xheS5pb1xuICAjIElmIGl0J3Mgbm90LCB0aGUgcG9zdE1lc3NhZ2UgcHJvbWlzZSB3aWxsIGZhaWwgYmVjYXVzZSBvZiBvbk1lc3NhZ2UgY2hlY2tcbiAgdmFsaWRhdGVQYXJlbnQgPSAtPlxuICAgIHBvc3RNZXNzYWdlXG4gICAgICBtZXRob2Q6ICdwaW5nJ1xuXG4gIGlzVmFsaWRPcmlnaW4gPSAob3JpZ2luKSAtPlxuICAgIHJlZ2V4ID0gbmV3IFJlZ0V4cCBcIl5odHRwcz86Ly8oXFxcXHcrXFxcXC4pPyhcXFxcdytcXFxcLik/I3tUUlVTVEVEX0RPTUFJTn0vPyRcIlxuICAgIHJldHVybiByZWdleC50ZXN0IG9yaWdpblxuXG5cblxuICBjbGFzcyBTREtcbiAgICBjb25zdHJ1Y3RvcjogLT5cbiAgICAgIEB2ZXJzaW9uID0gJ3YwLjAuMCdcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdtZXNzYWdlJywgb25NZXNzYWdlXG5cbiAgICAjIEZPUiBURVNUSU5HIE9OTFlcbiAgICBfc2V0SW5pdGlhbGl6ZWQ6IChzdGF0ZSkgLT5cbiAgICAgIGlzSW5pdGlhbGl6ZWQgPSBzdGF0ZVxuXG4gICAgX3NldEZyYW1lZDogKHN0YXRlKSAtPlxuICAgICAgSVNfRlJBTUVEID0gc3RhdGVcblxuICAgICMgUHVibGljXG4gICAgaW5pdDogKG9wdHMpIC0+XG4gICAgICBjbGllbnRJZCA9IG9wdHM/LmNsaWVudElkXG5cbiAgICAgIHVubGVzcyBjbGllbnRJZFxuICAgICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ01pc3NpbmcgY2xpZW50SWQnXG5cbiAgICAgIGlmIElTX0ZSQU1FRFxuICAgICAgICB2YWxpZGF0ZVBhcmVudCgpXG4gICAgICAgIC50aGVuIC0+XG4gICAgICAgICAgcG9zdE1lc3NhZ2VcbiAgICAgICAgICAgIG1ldGhvZDogJ2F1dGguZ2V0U3RhdHVzJ1xuICAgICAgICAudGhlbiAoX3N0YXR1cykgLT5cbiAgICAgICAgICBpc0luaXRpYWxpemVkID0gdHJ1ZVxuICAgICAgICAgICMgVE9ETzogVG9rZW4gbWF5IGJlIGludmFsaWRcbiAgICAgICAgICBzdGF0dXMgPSBfc3RhdHVzXG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWl6KCkucmVqZWN0IG5ldyBFcnJvciAnVW5mcmFtZWQgTm90IEltcGxlbWVudGVkJ1xuXG4gICAgbG9naW46ICh7c2NvcGV9KSAtPlxuICAgICAgIyBUT0RPOiBPQXV0aCBtYWdpYy4gR2V0cyB0b2tlblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXooKS5yZWplY3QgbmV3IEVycm9yICdOb3QgSW1wbGVtZW50ZWQnXG5cbiAgICBhcGk6IC0+XG4gICAgICAjIFRPRE86IGltcGxlbWVudFxuICAgICAgcmV0dXJuIG5ldyBQcm9taXooKS5yZWplY3QgbmV3IEVycm9yICdOb3QgSW1wbGVtZW50ZWQnXG5cbiAgICBjbGllbnQ6IChtZXNzYWdlKSAtPlxuICAgICAgdW5sZXNzIGlzSW5pdGlhbGl6ZWRcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXooKS5yZWplY3QgbmV3IEVycm9yICdNdXN0IGNhbGwgQ2xheS5pbml0KCkgZmlyc3QnXG5cbiAgICAgIHVubGVzcyBJU19GUkFNRURcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXooKS5yZWplY3QgbmV3IEVycm9yICdNaXNzaW5nIHBhcmVudCBmcmFtZS4gTWFrZSBzdXJlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeW91IGFyZSB3aXRoaW4gYSBjbGF5IGdhbWUgcnVubmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lJ1xuXG4gICAgICB2YWxpZGF0ZVBhcmVudCgpXG4gICAgICAudGhlbiAtPlxuICAgICAgICBwb3N0TWVzc2FnZSBtZXNzYWdlXG5cblxuXG5cbiAgcmV0dXJuIG5ldyBTREsoKVxuXG5cbilcbiIsIihmdW5jdGlvbiAoKSB7XG4gIFxuICAvKipcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBEZWZlcnJlZChmbiwgZXIpIHtcbiAgICAvLyBzdGF0ZXNcbiAgICAvLyAwOiBwZW5kaW5nXG4gICAgLy8gMTogcmVzb2x2aW5nXG4gICAgLy8gMjogcmVqZWN0aW5nXG4gICAgLy8gMzogcmVzb2x2ZWRcbiAgICAvLyA0OiByZWplY3RlZFxuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIHN0YXRlID0gMCxcbiAgICAgIHZhbCA9IDAsXG4gICAgICBuZXh0ID0gW107XG5cbiAgICBzZWxmWydwcm9taXNlJ10gPSBzZWxmXG5cbiAgICBzZWxmWydyZXNvbHZlJ10gPSBmdW5jdGlvbiAodikge1xuICAgICAgaWYgKCFzdGF0ZSkge1xuICAgICAgICB2YWwgPSB2XG4gICAgICAgIHN0YXRlID0gMVxuXG4gICAgICAgIHNldFRpbWVvdXQoZmlyZSlcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICAgc2VsZlsncmVqZWN0J10gPSBmdW5jdGlvbiAodikge1xuICAgICAgaWYgKCFzdGF0ZSkge1xuICAgICAgICB2YWwgPSB2XG4gICAgICAgIHN0YXRlID0gMlxuXG4gICAgICAgIHNldFRpbWVvdXQoZmlyZSlcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICAgc2VsZlsndGhlbiddID0gZnVuY3Rpb24gKGZuLCBlcikge1xuICAgICAgdmFyIGQgPSBuZXcgRGVmZXJyZWQoZm4sIGVyKVxuICAgICAgaWYgKHN0YXRlID09IDMpIHtcbiAgICAgICAgZC5yZXNvbHZlKHZhbClcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHN0YXRlID09IDQpIHtcbiAgICAgICAgZC5yZWplY3QodmFsKVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG5leHQucHVzaChkKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGRcbiAgICB9XG5cbiAgICB2YXIgZmluaXNoID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgIHN0YXRlID0gdHlwZSB8fCA0XG4gICAgICBuZXh0Lm1hcChmdW5jdGlvbiAocCkge1xuICAgICAgICBzdGF0ZSA9PSAzICYmIHAucmVzb2x2ZSh2YWwpIHx8IHAucmVqZWN0KHZhbClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8gcmVmIDogcmVmZXJlbmNlIHRvICd0aGVuJyBmdW5jdGlvblxuICAgIC8vIGNiLCBlYywgY24gOiBzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaywgbm90VGhlbm5hYmxlQ2FsbGJhY2tcbiAgICBmdW5jdGlvbiB0aGVubmFibGUgKHJlZiwgY2IsIGVjLCBjbikge1xuICAgICAgaWYgKHR5cGVvZiB2YWwgPT0gJ29iamVjdCcgJiYgdHlwZW9mIHJlZiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRyeSB7XG5cbiAgICAgICAgICAvLyBjbnQgcHJvdGVjdHMgYWdhaW5zdCBhYnVzZSBjYWxscyBmcm9tIHNwZWMgY2hlY2tlclxuICAgICAgICAgIHZhciBjbnQgPSAwXG4gICAgICAgICAgcmVmLmNhbGwodmFsLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgaWYgKGNudCsrKSByZXR1cm5cbiAgICAgICAgICAgIHZhbCA9IHZcbiAgICAgICAgICAgIGNiKClcbiAgICAgICAgICB9LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgaWYgKGNudCsrKSByZXR1cm5cbiAgICAgICAgICAgIHZhbCA9IHZcbiAgICAgICAgICAgIGVjKClcbiAgICAgICAgICB9KVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgdmFsID0gZVxuICAgICAgICAgIGVjKClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY24oKVxuICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBmaXJlKCkge1xuXG4gICAgICAvLyBjaGVjayBpZiBpdCdzIGEgdGhlbmFibGVcbiAgICAgIHZhciByZWY7XG4gICAgICB0cnkge1xuICAgICAgICByZWYgPSB2YWwgJiYgdmFsLnRoZW5cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdmFsID0gZVxuICAgICAgICBzdGF0ZSA9IDJcbiAgICAgICAgcmV0dXJuIGZpcmUoKVxuICAgICAgfVxuXG4gICAgICB0aGVubmFibGUocmVmLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN0YXRlID0gMVxuICAgICAgICBmaXJlKClcbiAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3RhdGUgPSAyXG4gICAgICAgIGZpcmUoKVxuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChzdGF0ZSA9PSAxICYmIHR5cGVvZiBmbiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YWwgPSBmbih2YWwpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZWxzZSBpZiAoc3RhdGUgPT0gMiAmJiB0eXBlb2YgZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdmFsID0gZXIodmFsKVxuICAgICAgICAgICAgc3RhdGUgPSAxXG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgdmFsID0gZVxuICAgICAgICAgIHJldHVybiBmaW5pc2goKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbCA9PSBzZWxmKSB7XG4gICAgICAgICAgdmFsID0gVHlwZUVycm9yKClcbiAgICAgICAgICBmaW5pc2goKVxuICAgICAgICB9IGVsc2UgdGhlbm5hYmxlKHJlZiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZmluaXNoKDMpXG4gICAgICAgICAgfSwgZmluaXNoLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmaW5pc2goc3RhdGUgPT0gMSAmJiAzKVxuICAgICAgICAgIH0pXG5cbiAgICAgIH0pXG4gICAgfVxuXG5cbiAgfVxuXG4gIC8vIEV4cG9ydCBvdXIgbGlicmFyeSBvYmplY3QsIGVpdGhlciBmb3Igbm9kZS5qcyBvciBhcyBhIGdsb2JhbGx5IHNjb3BlZCB2YXJpYWJsZVxuICBpZiAodHlwZW9mIG1vZHVsZSAhPSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZVsnZXhwb3J0cyddID0gRGVmZXJyZWRcbiAgfSBlbHNlIHtcbiAgICB0aGlzWydQcm9taXonXSA9IERlZmVycmVkXG4gIH1cbn0pKClcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIl19
