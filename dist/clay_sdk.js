!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Clay=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var IS_FRAMED,Promiz,SDK,TRUSTED_DOMAIN,clientId,isInitialized,isValidOrigin,onMessage,pendingMessages,postMessage,status,validateParent;Promiz=require("promiz"),TRUSTED_DOMAIN="192.168.2.98.xip.io:3000".replace(/\./g,"\\."),IS_FRAMED=window.self!==window.top,pendingMessages={},isInitialized=!1,clientId=null,status=null,postMessage=function(){var e;return e=1,function(n){var t,i;t=new Promiz;try{n._id=e,n._clientId=clientId,n._accessToken=null!=status?status.accessToken:void 0,pendingMessages[n._id]=t,e+=1,window.parent.postMessage(JSON.stringify(n),"*")}catch(r){i=r,t.reject(i)}return t}}(),onMessage=function(e){var n;if(!isValidOrigin(e.origin))throw new Error("Invalid origin "+e.origin);return console.log("msg",e.data),n=JSON.parse(e.data),pendingMessages[n._id].resolve(n.result)},validateParent=function(){return postMessage({method:"ping"})},isValidOrigin=function(e){var n;return n=new RegExp("^https?://(\\w+\\.)?(\\w+\\.)?"+TRUSTED_DOMAIN+"/?$"),n.test(e)},SDK=function(){function e(){this.version="v0.0.0",window.addEventListener("message",onMessage)}return e.prototype._setInitialized=function(e){return isInitialized=e},e.prototype._setFramed=function(e){return IS_FRAMED=e},e.prototype.init=function(e){return clientId=null!=e?e.clientId:void 0,clientId?IS_FRAMED?validateParent().then(function(){return postMessage({method:"auth.getStatus"})}).then(function(e){return isInitialized=!0,status=e}):(new Promiz).reject(new Error("Unframed Not Implemented")):(new Promiz).reject(new Error("Missing clientId"))},e.prototype.login=function(e){var n;return n=e.scope,(new Promiz).reject(new Error("Not Implemented"))},e.prototype.api=function(){return(new Promiz).reject(new Error("Not Implemented"))},e.prototype.client=function(e){return isInitialized?IS_FRAMED?validateParent().then(function(){return postMessage(e)}):(new Promiz).reject(new Error("Missing parent frame. Make sure you are within a clay game running frame")):(new Promiz).reject(new Error("Must call Clay.init() first"))},e}(),module.exports=new SDK;
},{"promiz":2}],2:[function(require,module,exports){
!function(){function t(n,e){function o(t,n,e,o){if("object"==typeof i&&"function"==typeof t)try{var c=0;t.call(i,function(t){c++||(i=t,n())},function(t){c++||(i=t,e())})}catch(r){i=r,e()}else o()}function c(){var t;try{t=i&&i.then}catch(f){return i=f,u=2,c()}o(t,function(){u=1,c()},function(){u=2,c()},function(){try{1==u&&"function"==typeof n?i=n(i):2==u&&"function"==typeof e&&(i=e(i),u=1)}catch(c){return i=c,s()}i==r?(i=TypeError(),s()):o(t,function(){s(3)},s,function(){s(1==u&&3)})})}var r=this,u=0,i=0,f=[];r.promise=r,r.resolve=function(t){return u||(i=t,u=1,setTimeout(c)),this},r.reject=function(t){return u||(i=t,u=2,setTimeout(c)),this},r.then=function(n,e){var o=new t(n,e);return 3==u?o.resolve(i):4==u?o.reject(i):f.push(o),o};var s=function(t){u=t||4,f.map(function(t){3==u&&t.resolve(i)||t.reject(i)})}}"undefined"!=typeof module?module.exports=t:this.Promiz=t}();
},{}]},{},[1])(1)
});