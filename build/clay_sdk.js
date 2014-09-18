(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function(name, context, definition) {
  if (typeof module !== 'undefined' && module.exports) {
    return module.exports = definition();
  } else if (typeof define === 'function' && define.amd) {
    return define(definition);
  } else {
    return context[name] = definition();
  }
})('Clay', this, function() {
  var Promiz, SDK;
  Promiz = require('promiz');
  SDK = (function() {
    var onMessage, pendingMessages, postMessage;

    pendingMessages = {};

    postMessage = (function() {
      var messageId;
      messageId = 1;
      return function(message) {
        var deferred, err;
        deferred = new Promiz();
        try {
          message._id = messageId;
          pendingMessages[message._id] = deferred;
          messageId += 1;
          window.parent.postMessage(JSON.stringify(message));
        } catch (_error) {
          err = _error;
          deferred.reject(err);
        }
        return deferred;
      };
    })();

    onMessage = function(e) {
      var message;
      message = JSON.parse(e.data);
      return pendingMessages[message._id].resolve(message);
    };

    function SDK() {
      window.addEventListener('message', onMessage);
    }

    SDK.prototype.version = 'v0.0.0';

    SDK.prototype.init = function(_arg) {
      this.clientId = _arg.clientId;
      return null;
    };

    SDK.prototype.login = function(_arg) {
      var scope;
      scope = _arg.scope;
      return null;
    };

    SDK.prototype.api = function() {
      return null;
    };

    SDK.prototype.client = function(message) {
      if (window.parent === window.top) {
        return new Promiz().reject(new Error('Missing parent frame. Make sure you are within a clay game running frame'));
      }
      return postMessage(message);
    };

    return SDK;

  })();
  return new SDK();
});



},{"promiz":2}],2:[function(require,module,exports){
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL3pvbGkvY2xheS9jbGF5LWphdmFzY3JpcHQtc2RrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS96b2xpL2NsYXkvY2xheS1qYXZhc2NyaXB0LXNkay9zcmMvY2xheV9zZGsuY29mZmVlIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvY29tcG9uZW50cy9wcm9taXovcHJvbWl6Lm1pY3JvLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsQ0FBQyxTQUFDLElBQUQsRUFBTyxPQUFQLEVBQWdCLFVBQWhCLEdBQUE7QUFDQyxFQUFBLElBQUcsTUFBQSxDQUFBLE1BQUEsS0FBbUIsV0FBbkIsSUFBbUMsTUFBTSxDQUFDLE9BQTdDO1dBQ0UsTUFBTSxDQUFDLE9BQVAsR0FBaUIsVUFBQSxDQUFBLEVBRG5CO0dBQUEsTUFFSyxJQUFHLE1BQUEsQ0FBQSxNQUFBLEtBQWlCLFVBQWpCLElBQWdDLE1BQU0sQ0FBQyxHQUExQztXQUNILE1BQUEsQ0FBTyxVQUFQLEVBREc7R0FBQSxNQUFBO1dBR0gsT0FBUSxDQUFBLElBQUEsQ0FBUixHQUFnQixVQUFBLENBQUEsRUFIYjtHQUhOO0FBQUEsQ0FBRCxDQUFBLENBT0UsTUFQRixFQU9VLElBUFYsRUFPZ0IsU0FBQSxHQUFBO0FBRWQsTUFBQSxXQUFBO0FBQUEsRUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVIsQ0FBVCxDQUFBO0FBQUEsRUFFTTtBQUdKLFFBQUEsdUNBQUE7O0FBQUEsSUFBQSxlQUFBLEdBQWtCLEVBQWxCLENBQUE7O0FBQUEsSUFFQSxXQUFBLEdBQWlCLENBQUEsU0FBQSxHQUFBO0FBQ2YsVUFBQSxTQUFBO0FBQUEsTUFBQSxTQUFBLEdBQVksQ0FBWixDQUFBO2FBRUEsU0FBQyxPQUFELEdBQUE7QUFDRSxZQUFBLGFBQUE7QUFBQSxRQUFBLFFBQUEsR0FBZSxJQUFBLE1B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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoKG5hbWUsIGNvbnRleHQsIGRlZmluaXRpb24pIC0+XG4gIGlmIHR5cGVvZiBtb2R1bGUgaXNudCAndW5kZWZpbmVkJyBhbmQgbW9kdWxlLmV4cG9ydHNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKVxuICBlbHNlIGlmIHR5cGVvZiBkZWZpbmUgaXMgJ2Z1bmN0aW9uJyBhbmQgZGVmaW5lLmFtZFxuICAgIGRlZmluZShkZWZpbml0aW9uKVxuICBlbHNlXG4gICAgY29udGV4dFtuYW1lXSA9IGRlZmluaXRpb24oKVxuKSgnQ2xheScsIHRoaXMsIC0+XG5cbiAgUHJvbWl6ID0gcmVxdWlyZSAncHJvbWl6J1xuXG4gIGNsYXNzIFNES1xuXG4gICAgIyBQcml2YXRlXG4gICAgcGVuZGluZ01lc3NhZ2VzID0ge31cblxuICAgIHBvc3RNZXNzYWdlID0gZG8gLT5cbiAgICAgIG1lc3NhZ2VJZCA9IDFcblxuICAgICAgKG1lc3NhZ2UpIC0+XG4gICAgICAgIGRlZmVycmVkID0gbmV3IFByb21peigpXG5cbiAgICAgICAgdHJ5XG4gICAgICAgICAgbWVzc2FnZS5faWQgPSBtZXNzYWdlSWRcbiAgICAgICAgICBwZW5kaW5nTWVzc2FnZXNbbWVzc2FnZS5faWRdID0gZGVmZXJyZWRcblxuICAgICAgICAgIG1lc3NhZ2VJZCArPSAxXG5cbiAgICAgICAgICB3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlIEpTT04uc3RyaW5naWZ5IG1lc3NhZ2VcblxuICAgICAgICBjYXRjaCBlcnJcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QgZXJyXG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkXG5cblxuICAgIG9uTWVzc2FnZSA9IChlKSAtPlxuICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UgZS5kYXRhXG4gICAgICBwZW5kaW5nTWVzc2FnZXNbbWVzc2FnZS5faWRdLnJlc29sdmUgbWVzc2FnZVxuXG4gICAgIyBQdWJsaWNcbiAgICBjb25zdHJ1Y3RvcjogLT5cbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdtZXNzYWdlJywgb25NZXNzYWdlXG5cbiAgICB2ZXJzaW9uOiAndjAuMC4wJ1xuXG4gICAgaW5pdDogKHtAY2xpZW50SWR9KSAtPiBudWxsXG5cbiAgICBsb2dpbjogKHtzY29wZX0pIC0+XG4gICAgICAjIE9BdXRoIG1hZ2ljLiBHZXRzIHRva2VuXG4gICAgICBudWxsXG5cbiAgICBhcGk6IC0+XG4gICAgICAjIFRPRE86IGltcGxlbWVudFxuICAgICAgbnVsbFxuXG4gICAgY2xpZW50OiAobWVzc2FnZSkgLT5cbiAgICAgIHVubGVzcyB3aW5kb3cucGFyZW50IGlzbnQgd2luZG93LnRvcFxuICAgICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ01pc3NpbmcgcGFyZW50IGZyYW1lLiBNYWtlIHN1cmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5b3UgYXJlIHdpdGhpbiBhIGNsYXkgZ2FtZSBydW5uaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWUnXG5cbiAgICAgIHBvc3RNZXNzYWdlIG1lc3NhZ2VcblxuXG5cblxuICByZXR1cm4gbmV3IFNESygpXG5cblxuKVxuIiwiKGZ1bmN0aW9uICgpIHtcbiAgXG4gIC8qKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIERlZmVycmVkKGZuLCBlcikge1xuICAgIC8vIHN0YXRlc1xuICAgIC8vIDA6IHBlbmRpbmdcbiAgICAvLyAxOiByZXNvbHZpbmdcbiAgICAvLyAyOiByZWplY3RpbmdcbiAgICAvLyAzOiByZXNvbHZlZFxuICAgIC8vIDQ6IHJlamVjdGVkXG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgc3RhdGUgPSAwLFxuICAgICAgdmFsID0gMCxcbiAgICAgIG5leHQgPSBbXTtcblxuICAgIHNlbGZbJ3Byb21pc2UnXSA9IHNlbGZcblxuICAgIHNlbGZbJ3Jlc29sdmUnXSA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICBpZiAoIXN0YXRlKSB7XG4gICAgICAgIHZhbCA9IHZcbiAgICAgICAgc3RhdGUgPSAxXG5cbiAgICAgICAgc2V0VGltZW91dChmaXJlKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICBzZWxmWydyZWplY3QnXSA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICBpZiAoIXN0YXRlKSB7XG4gICAgICAgIHZhbCA9IHZcbiAgICAgICAgc3RhdGUgPSAyXG5cbiAgICAgICAgc2V0VGltZW91dChmaXJlKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICBzZWxmWyd0aGVuJ10gPSBmdW5jdGlvbiAoZm4sIGVyKSB7XG4gICAgICB2YXIgZCA9IG5ldyBEZWZlcnJlZChmbiwgZXIpXG4gICAgICBpZiAoc3RhdGUgPT0gMykge1xuICAgICAgICBkLnJlc29sdmUodmFsKVxuICAgICAgfVxuICAgICAgZWxzZSBpZiAoc3RhdGUgPT0gNCkge1xuICAgICAgICBkLnJlamVjdCh2YWwpXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgbmV4dC5wdXNoKGQpXG4gICAgICB9XG4gICAgICByZXR1cm4gZFxuICAgIH1cblxuICAgIHZhciBmaW5pc2ggPSBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgc3RhdGUgPSB0eXBlIHx8IDRcbiAgICAgIG5leHQubWFwKGZ1bmN0aW9uIChwKSB7XG4gICAgICAgIHN0YXRlID09IDMgJiYgcC5yZXNvbHZlKHZhbCkgfHwgcC5yZWplY3QodmFsKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyByZWYgOiByZWZlcmVuY2UgdG8gJ3RoZW4nIGZ1bmN0aW9uXG4gICAgLy8gY2IsIGVjLCBjbiA6IHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrLCBub3RUaGVubmFibGVDYWxsYmFja1xuICAgIGZ1bmN0aW9uIHRoZW5uYWJsZSAocmVmLCBjYiwgZWMsIGNuKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbCA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgcmVmID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdHJ5IHtcblxuICAgICAgICAgIC8vIGNudCBwcm90ZWN0cyBhZ2FpbnN0IGFidXNlIGNhbGxzIGZyb20gc3BlYyBjaGVja2VyXG4gICAgICAgICAgdmFyIGNudCA9IDBcbiAgICAgICAgICByZWYuY2FsbCh2YWwsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICBpZiAoY250KyspIHJldHVyblxuICAgICAgICAgICAgdmFsID0gdlxuICAgICAgICAgICAgY2IoKVxuICAgICAgICAgIH0sIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICBpZiAoY250KyspIHJldHVyblxuICAgICAgICAgICAgdmFsID0gdlxuICAgICAgICAgICAgZWMoKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICB2YWwgPSBlXG4gICAgICAgICAgZWMoKVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbigpXG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGZpcmUoKSB7XG5cbiAgICAgIC8vIGNoZWNrIGlmIGl0J3MgYSB0aGVuYWJsZVxuICAgICAgdmFyIHJlZjtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlZiA9IHZhbCAmJiB2YWwudGhlblxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB2YWwgPSBlXG4gICAgICAgIHN0YXRlID0gMlxuICAgICAgICByZXR1cm4gZmlyZSgpXG4gICAgICB9XG5cbiAgICAgIHRoZW5uYWJsZShyZWYsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3RhdGUgPSAxXG4gICAgICAgIGZpcmUoKVxuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICBzdGF0ZSA9IDJcbiAgICAgICAgZmlyZSgpXG4gICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKHN0YXRlID09IDEgJiYgdHlwZW9mIGZuID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHZhbCA9IGZuKHZhbClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBlbHNlIGlmIChzdGF0ZSA9PSAyICYmIHR5cGVvZiBlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YWwgPSBlcih2YWwpXG4gICAgICAgICAgICBzdGF0ZSA9IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICB2YWwgPSBlXG4gICAgICAgICAgcmV0dXJuIGZpbmlzaCgpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmFsID09IHNlbGYpIHtcbiAgICAgICAgICB2YWwgPSBUeXBlRXJyb3IoKVxuICAgICAgICAgIGZpbmlzaCgpXG4gICAgICAgIH0gZWxzZSB0aGVubmFibGUocmVmLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmaW5pc2goMylcbiAgICAgICAgICB9LCBmaW5pc2gsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZpbmlzaChzdGF0ZSA9PSAxICYmIDMpXG4gICAgICAgICAgfSlcblxuICAgICAgfSlcbiAgICB9XG5cblxuICB9XG5cbiAgLy8gRXhwb3J0IG91ciBsaWJyYXJ5IG9iamVjdCwgZWl0aGVyIGZvciBub2RlLmpzIG9yIGFzIGEgZ2xvYmFsbHkgc2NvcGVkIHZhcmlhYmxlXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlWydleHBvcnRzJ10gPSBEZWZlcnJlZFxuICB9IGVsc2Uge1xuICAgIHRoaXNbJ1Byb21peiddID0gRGVmZXJyZWRcbiAgfVxufSkoKVxuIl19
