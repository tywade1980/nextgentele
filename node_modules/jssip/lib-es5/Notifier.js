"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var EventEmitter = require('events').EventEmitter;

var Logger = require('./Logger');

var JsSIP_C = require('./Constants');

var Utils = require('./Utils');

var Dialog = require('./Dialog');

var logger = new Logger('Notifier');
/**
 * Termination codes. 
 */

var C = {
  // Termination codes.
  NOTIFY_RESPONSE_TIMEOUT: 0,
  NOTIFY_TRANSPORT_ERROR: 1,
  NOTIFY_NON_OK_RESPONSE: 2,
  NOTIFY_FAILED_AUTHENTICATION: 3,
  SEND_FINAL_NOTIFY: 4,
  RECEIVE_UNSUBSCRIBE: 5,
  SUBSCRIPTION_EXPIRED: 6,
  // Notifer states
  STATE_PENDING: 0,
  STATE_ACTIVE: 1,
  STATE_TERMINATED: 2
};
/**
 * RFC 6665 Notifier implementation.
 */

module.exports = /*#__PURE__*/function (_EventEmitter) {
  _inherits(Notifier, _EventEmitter);

  var _super = _createSuper(Notifier);

  _createClass(Notifier, [{
    key: "C",
    get: function get() {
      return C;
    }
    /**
     * @param {UA} ua - JsSIP User Agent instance.
     * @param {IncomingRequest} subscribe - Subscribe request.
     * @param {string} contentType - Content-Type header value.
     * @param {NotifierOptions} options - Optional parameters.
     *   @param {Array<string>}  extraHeaders - Additional SIP headers.
     *   @param {string} allowEvents - Allow-Events header value.
     *   @param {boolean} pending - Set initial dialog state as "pending". 
     */

  }], [{
    key: "C",

    /**
     * Expose C object.
     */
    get: function get() {
      return C;
    }
  }]);

  function Notifier(ua, subscribe, contentType, _ref) {
    var _this;

    var extraHeaders = _ref.extraHeaders,
        allowEvents = _ref.allowEvents,
        pending = _ref.pending;

    _classCallCheck(this, Notifier);

    logger.debug('new');
    _this = _super.call(this);

    if (!subscribe) {
      throw new TypeError('subscribe is undefined');
    }

    if (!contentType) {
      throw new TypeError('contentType is undefined');
    }

    _this._ua = ua;
    _this._initial_subscribe = subscribe;
    _this._expires_timestamp = null;
    _this._expires_timer = null; // Notifier state: pending, active, terminated. Not used: init, resp_wait.

    _this._state = pending ? C.STATE_PENDING : C.STATE_ACTIVE; // Optional. Used to build terminated Subscription-State.

    _this._terminated_reason = null;
    _this._terminated_retry_after = null; // Custom session empty object for high level use.

    _this.data = {};
    _this._dialog = null;
    var eventName = subscribe.getHeader('event');
    _this._content_type = contentType;
    _this._expires = parseInt(subscribe.getHeader('expires'));
    _this._headers = Utils.cloneArray(extraHeaders);

    _this._headers.push("Event: ".concat(eventName)); // Use contact from extraHeaders or create it.


    _this._contact = _this._headers.find(function (header) {
      return header.startsWith('Contact');
    });

    if (!_this._contact) {
      _this._contact = "Contact: ".concat(_this._ua._contact.toString());

      _this._headers.push(_this._contact);
    }

    if (allowEvents) {
      _this._headers.push("Allow-Events: ".concat(allowEvents));
    }

    _this._target = subscribe.from.uri.user;
    subscribe.to_tag = Utils.newTag(); // Create dialog for normal and fetch-subscribe.

    var dialog = new Dialog(_assertThisInitialized(_this), subscribe, 'UAS');

    if (dialog.error) {
      logger.warn(dialog.error);
      throw new Error('SUBSCRIBE missed Contact');
    }

    _this._dialog = dialog;

    if (_this._expires > 0) {
      // Set expires timer and time-stamp.
      _this._setExpiresTimer();
    }

    return _this;
  }
  /**
   * Dialog callback.
   * Called also for initial subscribe. 
   * Supported RFC 6665 4.4.3: initial fetch subscribe (with expires: 0).
   */


  _createClass(Notifier, [{
    key: "receiveRequest",
    value: function receiveRequest(request) {
      if (request.method !== JsSIP_C.SUBSCRIBE) {
        request.reply(405);
        return;
      }

      var expiresValue = request.getHeader('expires');

      if (expiresValue === undefined || expiresValue === null) {
        // Missed header Expires. RFC 6665 3.1.1. Set default expires value.  
        expiresValue = '900';
        logger.debug("Missed expires header. Set by default ".concat(expiresValue));
      }

      this._expires = parseInt(expiresValue);
      request.reply(200, null, ["Expires: ".concat(this._expires), "".concat(this._contact)]);
      var body = request.body;
      var content_type = request.getHeader('content-type');
      var is_unsubscribe = this._expires === 0;

      if (!is_unsubscribe) {
        this._setExpiresTimer();
      }

      logger.debug('emit "subscribe"');
      this.emit('subscribe', is_unsubscribe, request, body, content_type);

      if (is_unsubscribe) {
        this._dialogTerminated(C.RECEIVE_UNSUBSCRIBE);
      }
    }
    /**
     * User API
     */

    /**
     * Please call after creating the Notifier instance and setting the event handlers.
     */

  }, {
    key: "start",
    value: function start() {
      logger.debug('start()');
      this.receiveRequest(this._initial_subscribe);
    }
    /**
     * Switch pending dialog state to active.
     */

  }, {
    key: "setActiveState",
    value: function setActiveState() {
      logger.debug('setActiveState()');

      if (this._state === C.STATE_PENDING) {
        this._state = C.STATE_ACTIVE;
      }
    }
    /**
     *  Send the initial and subsequent notify request.
     *  @param {string} body - notify request body.
     */

  }, {
    key: "notify",
    value: function notify() {
      var _this2 = this;

      var body = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      logger.debug('notify()'); // Prevent send notify after final notify.

      if (!this._dialog) {
        logger.warn('final notify has sent');
        return;
      }

      var subs_state = this._stateNumberToString(this._state);

      if (this._state !== C.STATE_TERMINATED) {
        var expires = Math.floor((this._expires_timestamp - new Date().getTime()) / 1000);

        if (expires < 0) {
          expires = 0;
        }

        subs_state += ";expires=".concat(expires);
      } else {
        if (this._terminated_reason) {
          subs_state += ";reason=".concat(this._terminated_reason);
        }

        if (this._terminated_retry_after !== null) {
          subs_state += ";retry-after=".concat(this._terminated_retry_after);
        }
      }

      var headers = this._headers.slice();

      headers.push("Subscription-State: ".concat(subs_state));

      if (body) {
        headers.push("Content-Type: ".concat(this._content_type));
      }

      this._dialog.sendRequest(JsSIP_C.NOTIFY, {
        body: body,
        extraHeaders: headers,
        eventHandlers: {
          onRequestTimeout: function onRequestTimeout() {
            _this2._dialogTerminated(C.NOTIFY_RESPONSE_TIMEOUT);
          },
          onTransportError: function onTransportError() {
            _this2._dialogTerminated(C.NOTIFY_TRANSPORT_ERROR);
          },
          onErrorResponse: function onErrorResponse(response) {
            if (response.status_code === 401 || response.status_code === 407) {
              _this2._dialogTerminated(C.NOTIFY_FAILED_AUTHENTICATION);
            } else {
              _this2._dialogTerminated(C.NOTIFY_NON_OK_RESPONSE);
            }
          },
          onDialogError: function onDialogError() {
            _this2._dialogTerminated(C.NOTIFY_NON_OK_RESPONSE);
          }
        }
      });
    }
    /**
     *  Terminate. (Send the final NOTIFY request).
     * 
     * @param {string} body - Notify message body.
     * @param {string} reason - Set Subscription-State reason parameter.
     * @param {number} retryAfter - Set Subscription-State retry-after parameter.
     */

  }, {
    key: "terminate",
    value: function terminate() {
      var body = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var reason = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var retryAfter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      logger.debug('terminate()');
      this._state = C.STATE_TERMINATED;
      this._terminated_reason = reason;
      this._terminated_retry_after = retryAfter;
      this.notify(body);

      this._dialogTerminated(C.SEND_FINAL_NOTIFY);
    }
    /**
     * Get dialog state. 
     */

  }, {
    key: "_dialogTerminated",

    /**
     * Private API
     */
    value: function _dialogTerminated(termination_code) {
      if (!this._dialog) {
        return;
      }

      this._state = C.STATE_TERMINATED;
      clearTimeout(this._expires_timer);

      if (this._dialog) {
        this._dialog.terminate();

        this._dialog = null;
      }

      var send_final_notify = termination_code === C.SUBSCRIPTION_EXPIRED;
      logger.debug("emit \"terminated\" code=".concat(termination_code, ", send final notify=").concat(send_final_notify));
      this.emit('terminated', termination_code, send_final_notify);
    }
  }, {
    key: "_setExpiresTimer",
    value: function _setExpiresTimer() {
      var _this3 = this;

      this._expires_timestamp = new Date().getTime() + this._expires * 1000;
      clearTimeout(this._expires_timer);
      this._expires_timer = setTimeout(function () {
        if (!_this3._dialog) {
          return;
        }

        _this3._terminated_reason = 'timeout';

        _this3.notify();

        _this3._dialogTerminated(C.SUBSCRIPTION_EXPIRED);
      }, this._expires * 1000);
    }
  }, {
    key: "_stateNumberToString",
    value: function _stateNumberToString(state) {
      switch (state) {
        case C.STATE_PENDING:
          return 'pending';

        case C.STATE_ACTIVE:
          return 'active';

        case C.STATE_TERMINATED:
          return 'terminated';

        default:
          throw new TypeError('wrong state value');
      }
    }
  }, {
    key: "state",
    get: function get() {
      return this._state;
    }
    /**
     * Get dialog id.
     */

  }, {
    key: "id",
    get: function get() {
      return this._dialog ? this._dialog.id : null;
    }
  }]);

  return Notifier;
}(EventEmitter);