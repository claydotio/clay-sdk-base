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
  var SDK;
  SDK = (function() {
    function SDK() {}

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

    SDK.prototype.client = function(_arg) {
      var method;
      method = _arg.method;
      return null;
    };

    return SDK;

  })();
  return new SDK();
});



},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL3pvbGkvY2xheS9jbGF5LWphdmFzY3JpcHQtc2RrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS96b2xpL2NsYXkvY2xheS1qYXZhc2NyaXB0LXNkay9zcmMvY2xheV9zZGsuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsQ0FBQyxTQUFDLElBQUQsRUFBTyxPQUFQLEVBQWdCLFVBQWhCLEdBQUE7QUFDQyxFQUFBLElBQUcsTUFBQSxDQUFBLE1BQUEsS0FBbUIsV0FBbkIsSUFBbUMsTUFBTSxDQUFDLE9BQTdDO1dBQ0UsTUFBTSxDQUFDLE9BQVAsR0FBaUIsVUFBQSxDQUFBLEVBRG5CO0dBQUEsTUFFSyxJQUFHLE1BQUEsQ0FBQSxNQUFBLEtBQWlCLFVBQWpCLElBQWdDLE1BQU0sQ0FBQyxHQUExQztXQUNILE1BQUEsQ0FBTyxVQUFQLEVBREc7R0FBQSxNQUFBO1dBR0gsT0FBUSxDQUFBLElBQUEsQ0FBUixHQUFnQixVQUFBLENBQUEsRUFIYjtHQUhOO0FBQUEsQ0FBRCxDQUFBLENBT0UsTUFQRixFQU9VLElBUFYsRUFPZ0IsU0FBQSxHQUFBO0FBQ2QsTUFBQSxHQUFBO0FBQUEsRUFBTTtxQkFDSjs7QUFBQSxrQkFBQSxPQUFBLEdBQVMsUUFBVCxDQUFBOztBQUFBLGtCQUVBLElBQUEsR0FBTSxTQUFDLElBQUQsR0FBQTtBQUFpQixNQUFmLElBQUMsQ0FBQSxXQUFGLEtBQUUsUUFBYyxDQUFBO2FBQUEsS0FBakI7SUFBQSxDQUZOLENBQUE7O0FBQUEsa0JBSUEsS0FBQSxHQUFPLFNBQUMsSUFBRCxHQUFBO0FBRUwsVUFBQSxLQUFBO0FBQUEsTUFGTyxRQUFELEtBQUMsS0FFUCxDQUFBO2FBQUEsS0FGSztJQUFBLENBSlAsQ0FBQTs7QUFBQSxrQkFRQSxHQUFBLEdBQUssU0FBQSxHQUFBO2FBRUgsS0FGRztJQUFBLENBUkwsQ0FBQTs7QUFBQSxrQkFZQSxNQUFBLEdBQVEsU0FBQyxJQUFELEdBQUE7QUFFTixVQUFBLE1BQUE7QUFBQSxNQUZRLFNBQUQsS0FBQyxNQUVSLENBQUE7YUFBQSxLQUZNO0lBQUEsQ0FaUixDQUFBOztlQUFBOztNQURGLENBQUE7QUFtQkEsU0FBVyxJQUFBLEdBQUEsQ0FBQSxDQUFYLENBcEJjO0FBQUEsQ0FQaEIsQ0FBQSxDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIigobmFtZSwgY29udGV4dCwgZGVmaW5pdGlvbikgLT5cbiAgaWYgdHlwZW9mIG1vZHVsZSBpc250ICd1bmRlZmluZWQnIGFuZCBtb2R1bGUuZXhwb3J0c1xuICAgIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpXG4gIGVsc2UgaWYgdHlwZW9mIGRlZmluZSBpcyAnZnVuY3Rpb24nIGFuZCBkZWZpbmUuYW1kXG4gICAgZGVmaW5lKGRlZmluaXRpb24pXG4gIGVsc2VcbiAgICBjb250ZXh0W25hbWVdID0gZGVmaW5pdGlvbigpXG4pKCdDbGF5JywgdGhpcywgLT5cbiAgY2xhc3MgU0RLXG4gICAgdmVyc2lvbjogJ3YwLjAuMCdcblxuICAgIGluaXQ6ICh7QGNsaWVudElkfSkgLT4gbnVsbFxuXG4gICAgbG9naW46ICh7c2NvcGV9KSAtPlxuICAgICAgIyBPQXV0aCBtYWdpYy4gR2V0cyB0b2tlblxuICAgICAgbnVsbFxuXG4gICAgYXBpOiAtPlxuICAgICAgIyBUT0RPOiBpbXBsZW1lbnRcbiAgICAgIG51bGxcblxuICAgIGNsaWVudDogKHttZXRob2R9KSAtPlxuICAgICAgIyBUT0RPOiBpbXBsZW1lbnRcbiAgICAgIG51bGxcblxuXG5cbiAgcmV0dXJuIG5ldyBTREsoKVxuXG5cbilcbiJdfQ==
