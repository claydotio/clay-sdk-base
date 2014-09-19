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
    return pendingMessages[message._id].resolve(message);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL3pvbGkvY2xheS9jbGF5LWphdmFzY3JpcHQtc2RrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS96b2xpL2NsYXkvY2xheS1qYXZhc2NyaXB0LXNkay9zcmMvY2xheV9zZGsuY29mZmVlIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvY29tcG9uZW50cy9wcm9taXovcHJvbWl6Lm1pY3JvLmpzIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLENBQUMsU0FBQyxJQUFELEVBQU8sT0FBUCxFQUFnQixVQUFoQixHQUFBO0FBQ0MsRUFBQSxJQUFHLE1BQUEsQ0FBQSxNQUFBLEtBQW1CLFdBQW5CLElBQW1DLE1BQU0sQ0FBQyxPQUE3QztXQUNFLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFVBQUEsQ0FBQSxFQURuQjtHQUFBLE1BRUssSUFBRyxNQUFBLENBQUEsTUFBQSxLQUFpQixVQUFqQixJQUFnQyxNQUFNLENBQUMsR0FBMUM7V0FDSCxNQUFBLENBQU8sVUFBUCxFQURHO0dBQUEsTUFBQTtXQUdILE9BQVEsQ0FBQSxJQUFBLENBQVIsR0FBZ0IsVUFBQSxDQUFBLEVBSGI7R0FITjtBQUFBLENBQUQsQ0FBQSxDQU9FLE1BUEYsRUFPVSxJQVBWLEVBT2dCLFNBQUEsR0FBQTtBQUVkLE1BQUEsK0lBQUE7QUFBQSxFQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUixDQUFULENBQUE7QUFBQSxFQUVBLGNBQUEsR0FBaUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQVosSUFBOEIsU0FBL0IsQ0FDZixDQUFDLE9BRGMsQ0FDTixLQURNLEVBQ0MsS0FERCxDQUZqQixDQUFB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIigobmFtZSwgY29udGV4dCwgZGVmaW5pdGlvbikgLT5cbiAgaWYgdHlwZW9mIG1vZHVsZSBpc250ICd1bmRlZmluZWQnIGFuZCBtb2R1bGUuZXhwb3J0c1xuICAgIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpXG4gIGVsc2UgaWYgdHlwZW9mIGRlZmluZSBpcyAnZnVuY3Rpb24nIGFuZCBkZWZpbmUuYW1kXG4gICAgZGVmaW5lKGRlZmluaXRpb24pXG4gIGVsc2VcbiAgICBjb250ZXh0W25hbWVdID0gZGVmaW5pdGlvbigpXG4pKCdDbGF5JywgdGhpcywgLT5cblxuICBQcm9taXogPSByZXF1aXJlICdwcm9taXonXG5cbiAgVFJVU1RFRF9ET01BSU4gPSAocHJvY2Vzcy5lbnYuVFJVU1RFRF9ET01BSU4gb3IgJ2NsYXkuaW8nKVxuICAgIC5yZXBsYWNlKC9cXC4vZywgJ1xcXFwuJylcblxuICBJU19GUkFNRUQgPSB3aW5kb3cucGFyZW50IGlzbnQgd2luZG93LnRvcFxuXG4gIHBlbmRpbmdNZXNzYWdlcyA9IHt9XG4gIGlzSW5pdGlhbGl6ZWQgPSBmYWxzZVxuICBjbGllbnRJZCA9IG51bGxcbiAgc3RhdHVzID0gbnVsbFxuXG4gIHBvc3RNZXNzYWdlID0gZG8gLT5cbiAgICBtZXNzYWdlSWQgPSAxXG5cbiAgICAobWVzc2FnZSkgLT5cbiAgICAgIGRlZmVycmVkID0gbmV3IFByb21peigpXG5cbiAgICAgIHRyeVxuICAgICAgICBtZXNzYWdlLl9pZCA9IG1lc3NhZ2VJZFxuICAgICAgICBtZXNzYWdlLl9jbGllbnRJZCA9IGNsaWVudElkXG4gICAgICAgIG1lc3NhZ2UuX2FjY2Vzc1Rva2VuID0gc3RhdHVzPy5hY2Nlc3NUb2tlblxuXG4gICAgICAgIHBlbmRpbmdNZXNzYWdlc1ttZXNzYWdlLl9pZF0gPSBkZWZlcnJlZFxuXG4gICAgICAgIG1lc3NhZ2VJZCArPSAxXG5cbiAgICAgICAgIyBJdCdzIG5vdCBwb3NzaWJsZSB0byB0ZWxsIHdobyB0aGUgcGFyZW50IGlzIGhlcmVcbiAgICAgICAgIyBUaGUgY2xpZW50IGhhcyB0byBwaW5nIHRoZSBwYXJlbnQgYW5kIGdldCBhIHJlc3BvbnNlIHRvIHZlcmlmeVxuICAgICAgICB3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlIEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpLCAnKidcblxuICAgICAgY2F0Y2ggZXJyXG4gICAgICAgIGRlZmVycmVkLnJlamVjdCBlcnJcblxuICAgICAgcmV0dXJuIGRlZmVycmVkXG5cbiAgb25NZXNzYWdlID0gKGUpIC0+XG4gICAgdW5sZXNzIGlzVmFsaWRPcmlnaW4gZS5vcmlnaW5cbiAgICAgIHRocm93IG5ldyBFcnJvciBcIkludmFsaWQgb3JpZ2luICN7ZS5vcmlnaW59XCJcblxuICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlIGUuZGF0YVxuICAgIHBlbmRpbmdNZXNzYWdlc1ttZXNzYWdlLl9pZF0ucmVzb2x2ZSBtZXNzYWdlXG5cblxuICAjIFRoaXMgaXMgdXNlZCB0byB2ZXJpZnkgdGhhdCB0aGUgcGFyZW50IGlzIGNsYXkuaW9cbiAgIyBJZiBpdCdzIG5vdCwgdGhlIHBvc3RNZXNzYWdlIHByb21pc2Ugd2lsbCBmYWlsIGJlY2F1c2Ugb2Ygb25NZXNzYWdlIGNoZWNrXG4gIHZhbGlkYXRlUGFyZW50ID0gLT5cbiAgICBwb3N0TWVzc2FnZVxuICAgICAgbWV0aG9kOiAncGluZydcblxuICBpc1ZhbGlkT3JpZ2luID0gKG9yaWdpbikgLT5cbiAgICByZWdleCA9IG5ldyBSZWdFeHAgXCJeaHR0cHM/Oi8vKFxcXFx3K1xcXFwuKT8oXFxcXHcrXFxcXC4pPyN7VFJVU1RFRF9ET01BSU59Lz8kXCJcbiAgICByZXR1cm4gcmVnZXgudGVzdCBvcmlnaW5cblxuXG5cbiAgY2xhc3MgU0RLXG4gICAgY29uc3RydWN0b3I6IC0+XG4gICAgICBAdmVyc2lvbiA9ICd2MC4wLjAnXG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbWVzc2FnZScsIG9uTWVzc2FnZVxuXG4gICAgIyBGT1IgVEVTVElORyBPTkxZXG4gICAgX3NldEluaXRpYWxpemVkOiAoc3RhdGUpIC0+XG4gICAgICBpc0luaXRpYWxpemVkID0gc3RhdGVcblxuICAgIF9zZXRGcmFtZWQ6IChzdGF0ZSkgLT5cbiAgICAgIElTX0ZSQU1FRCA9IHN0YXRlXG5cbiAgICAjIFB1YmxpY1xuICAgIGluaXQ6IChvcHRzKSAtPlxuICAgICAgY2xpZW50SWQgPSBvcHRzPy5jbGllbnRJZFxuXG4gICAgICB1bmxlc3MgY2xpZW50SWRcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXooKS5yZWplY3QgbmV3IEVycm9yICdNaXNzaW5nIGNsaWVudElkJ1xuXG4gICAgICBpZiBJU19GUkFNRURcbiAgICAgICAgdmFsaWRhdGVQYXJlbnQoKVxuICAgICAgICAudGhlbiAtPlxuICAgICAgICAgIHBvc3RNZXNzYWdlXG4gICAgICAgICAgICBtZXRob2Q6ICdhdXRoLmdldFN0YXR1cydcbiAgICAgICAgLnRoZW4gKF9zdGF0dXMpIC0+XG4gICAgICAgICAgaXNJbml0aWFsaXplZCA9IHRydWVcbiAgICAgICAgICAjIFRPRE86IFRva2VuIG1heSBiZSBpbnZhbGlkXG4gICAgICAgICAgc3RhdHVzID0gX3N0YXR1c1xuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ1VuZnJhbWVkIE5vdCBJbXBsZW1lbnRlZCdcblxuICAgIGxvZ2luOiAoe3Njb3BlfSkgLT5cbiAgICAgICMgVE9ETzogT0F1dGggbWFnaWMuIEdldHMgdG9rZW5cbiAgICAgIHJldHVybiBuZXcgUHJvbWl6KCkucmVqZWN0IG5ldyBFcnJvciAnTm90IEltcGxlbWVudGVkJ1xuXG4gICAgYXBpOiAtPlxuICAgICAgIyBUT0RPOiBpbXBsZW1lbnRcbiAgICAgIHJldHVybiBuZXcgUHJvbWl6KCkucmVqZWN0IG5ldyBFcnJvciAnTm90IEltcGxlbWVudGVkJ1xuXG4gICAgY2xpZW50OiAobWVzc2FnZSkgLT5cbiAgICAgIHVubGVzcyBpc0luaXRpYWxpemVkXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWl6KCkucmVqZWN0IG5ldyBFcnJvciAnTXVzdCBjYWxsIENsYXkuaW5pdCgpIGZpcnN0J1xuXG4gICAgICB1bmxlc3MgSVNfRlJBTUVEXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWl6KCkucmVqZWN0IG5ldyBFcnJvciAnTWlzc2luZyBwYXJlbnQgZnJhbWUuIE1ha2Ugc3VyZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHlvdSBhcmUgd2l0aGluIGEgY2xheSBnYW1lIHJ1bm5pbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZSdcblxuICAgICAgdmFsaWRhdGVQYXJlbnQoKVxuICAgICAgLnRoZW4gLT5cbiAgICAgICAgcG9zdE1lc3NhZ2UgbWVzc2FnZVxuXG5cblxuXG4gIHJldHVybiBuZXcgU0RLKClcblxuXG4pXG4iLCIoZnVuY3Rpb24gKCkge1xuICBcbiAgLyoqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gRGVmZXJyZWQoZm4sIGVyKSB7XG4gICAgLy8gc3RhdGVzXG4gICAgLy8gMDogcGVuZGluZ1xuICAgIC8vIDE6IHJlc29sdmluZ1xuICAgIC8vIDI6IHJlamVjdGluZ1xuICAgIC8vIDM6IHJlc29sdmVkXG4gICAgLy8gNDogcmVqZWN0ZWRcbiAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICBzdGF0ZSA9IDAsXG4gICAgICB2YWwgPSAwLFxuICAgICAgbmV4dCA9IFtdO1xuXG4gICAgc2VsZlsncHJvbWlzZSddID0gc2VsZlxuXG4gICAgc2VsZlsncmVzb2x2ZSddID0gZnVuY3Rpb24gKHYpIHtcbiAgICAgIGlmICghc3RhdGUpIHtcbiAgICAgICAgdmFsID0gdlxuICAgICAgICBzdGF0ZSA9IDFcblxuICAgICAgICBzZXRUaW1lb3V0KGZpcmUpXG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAgIHNlbGZbJ3JlamVjdCddID0gZnVuY3Rpb24gKHYpIHtcbiAgICAgIGlmICghc3RhdGUpIHtcbiAgICAgICAgdmFsID0gdlxuICAgICAgICBzdGF0ZSA9IDJcblxuICAgICAgICBzZXRUaW1lb3V0KGZpcmUpXG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAgIHNlbGZbJ3RoZW4nXSA9IGZ1bmN0aW9uIChmbiwgZXIpIHtcbiAgICAgIHZhciBkID0gbmV3IERlZmVycmVkKGZuLCBlcilcbiAgICAgIGlmIChzdGF0ZSA9PSAzKSB7XG4gICAgICAgIGQucmVzb2x2ZSh2YWwpXG4gICAgICB9XG4gICAgICBlbHNlIGlmIChzdGF0ZSA9PSA0KSB7XG4gICAgICAgIGQucmVqZWN0KHZhbClcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBuZXh0LnB1c2goZClcbiAgICAgIH1cbiAgICAgIHJldHVybiBkXG4gICAgfVxuXG4gICAgdmFyIGZpbmlzaCA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICBzdGF0ZSA9IHR5cGUgfHwgNFxuICAgICAgbmV4dC5tYXAoZnVuY3Rpb24gKHApIHtcbiAgICAgICAgc3RhdGUgPT0gMyAmJiBwLnJlc29sdmUodmFsKSB8fCBwLnJlamVjdCh2YWwpXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIHJlZiA6IHJlZmVyZW5jZSB0byAndGhlbicgZnVuY3Rpb25cbiAgICAvLyBjYiwgZWMsIGNuIDogc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2ssIG5vdFRoZW5uYWJsZUNhbGxiYWNrXG4gICAgZnVuY3Rpb24gdGhlbm5hYmxlIChyZWYsIGNiLCBlYywgY24pIHtcbiAgICAgIGlmICh0eXBlb2YgdmFsID09ICdvYmplY3QnICYmIHR5cGVvZiByZWYgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0cnkge1xuXG4gICAgICAgICAgLy8gY250IHByb3RlY3RzIGFnYWluc3QgYWJ1c2UgY2FsbHMgZnJvbSBzcGVjIGNoZWNrZXJcbiAgICAgICAgICB2YXIgY250ID0gMFxuICAgICAgICAgIHJlZi5jYWxsKHZhbCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIGlmIChjbnQrKykgcmV0dXJuXG4gICAgICAgICAgICB2YWwgPSB2XG4gICAgICAgICAgICBjYigpXG4gICAgICAgICAgfSwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIGlmIChjbnQrKykgcmV0dXJuXG4gICAgICAgICAgICB2YWwgPSB2XG4gICAgICAgICAgICBlYygpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHZhbCA9IGVcbiAgICAgICAgICBlYygpXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNuKClcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZmlyZSgpIHtcblxuICAgICAgLy8gY2hlY2sgaWYgaXQncyBhIHRoZW5hYmxlXG4gICAgICB2YXIgcmVmO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVmID0gdmFsICYmIHZhbC50aGVuXG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHZhbCA9IGVcbiAgICAgICAgc3RhdGUgPSAyXG4gICAgICAgIHJldHVybiBmaXJlKClcbiAgICAgIH1cblxuICAgICAgdGhlbm5hYmxlKHJlZiwgZnVuY3Rpb24gKCkge1xuICAgICAgICBzdGF0ZSA9IDFcbiAgICAgICAgZmlyZSgpXG4gICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN0YXRlID0gMlxuICAgICAgICBmaXJlKClcbiAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBpZiAoc3RhdGUgPT0gMSAmJiB0eXBlb2YgZm4gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdmFsID0gZm4odmFsKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGVsc2UgaWYgKHN0YXRlID09IDIgJiYgdHlwZW9mIGVyID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHZhbCA9IGVyKHZhbClcbiAgICAgICAgICAgIHN0YXRlID0gMVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHZhbCA9IGVcbiAgICAgICAgICByZXR1cm4gZmluaXNoKClcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWwgPT0gc2VsZikge1xuICAgICAgICAgIHZhbCA9IFR5cGVFcnJvcigpXG4gICAgICAgICAgZmluaXNoKClcbiAgICAgICAgfSBlbHNlIHRoZW5uYWJsZShyZWYsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZpbmlzaCgzKVxuICAgICAgICAgIH0sIGZpbmlzaCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZmluaXNoKHN0YXRlID09IDEgJiYgMylcbiAgICAgICAgICB9KVxuXG4gICAgICB9KVxuICAgIH1cblxuXG4gIH1cblxuICAvLyBFeHBvcnQgb3VyIGxpYnJhcnkgb2JqZWN0LCBlaXRoZXIgZm9yIG5vZGUuanMgb3IgYXMgYSBnbG9iYWxseSBzY29wZWQgdmFyaWFibGVcbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGVbJ2V4cG9ydHMnXSA9IERlZmVycmVkXG4gIH0gZWxzZSB7XG4gICAgdGhpc1snUHJvbWl6J10gPSBEZWZlcnJlZFxuICB9XG59KSgpXG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiJdfQ==
