/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const EventEmitter = require('events').EventEmitter;
const log = require('../../lib/log.js');

class Connection {

  constructor() {
    this._lastCommandId = 0;
    /** @type {!Map<number, function(object)}*/
    this._callbacks = new Map();
    this._eventEmitter = new EventEmitter();
  }

  /**
   * @return {!Promise}
   */
  connect() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * @return {!Promise}
   */
  disconnect() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Call protocol methods
   * @param {!string} method
   * @param {!Object} params
   * @return {!Promise}
   */
  sendCommand(method, params) {
    log.formatProtocol('method => browser', {method: method, params: params}, 'verbose');
    var id = ++this._lastCommandId;
    var message = JSON.stringify({id: id, method: method, params: params || {}});
    this.sendRawMessage(message);
    return new Promise((resolve, reject) => {
      this._callbacks.set(id, {resolve: resolve, reject: reject, method: method});
    });
  }

  /**
   * Bind listeners for connection events
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  on(eventName, cb) {
    if (eventName !== 'message') {
      throw new Error('Only supports "message" events');
    }
    this._eventEmitter.on(eventName, cb);
  }

  /* eslint-disable no-unused-vars */

  /**
   * @param {string} message
   * @protected
   */
  sendRawMessage(message) {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * @param {string} message
   * @protected
   */
  dispatchRawMessage(message) {
    var object = JSON.parse(message);
    if (object.id) {
      var callback = this._callbacks.get(object.id);
      this._callbacks.delete(object.id);
      if (object.error) {
        callback.reject(object.result);
        log.formatProtocol('method <= browser ERR',
            {method: callback.method, params: object.result}, 'error');
        return;
      }
      callback.resolve(object.result);
      log.formatProtocol('method <= browser OK',
          {method: callback.method, params: object.result}, 'verbose');
      return;
    }
    log.formatProtocol('method <= browser EVENT',
        {method: object.method, params: object.result}, 'verbose');
    this.dispatchNotification(object.method, object.params);
  }

  /**
   * @param {!string} command
   * @param {!Object} params
   * @protected
   */
  dispatchNotification(method, params) {
    this._eventEmitter.emit('message', {method: method, params: params});
  }

  /**
   * @protected
   */
  dispose() {
    this._eventEmitter.removeAllListeners();
    this._eventEmitter = null;
  }
}

module.exports = Connection;
