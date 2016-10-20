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
    const id = ++this._lastCommandId;
    params = params || {};
    const message = JSON.stringify({id, method, params});
    this.sendRawMessage(message);
    return new Promise((resolve, reject) => {
      this._callbacks.set(id, {resolve, reject, method});
    });
  }

  /**
   * Bind listeners for connection events
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  on(eventName, cb) {
    if (eventName !== 'notification') {
      throw new Error('Only supports "notification" events');
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

  /* eslint-enable no-unused-vars */

  /**
   * @param {string} message
   * @protected
   */
  handleRawMessage(message) {
    const object = JSON.parse(message);
    if (object.id) {
      const callback = this._callbacks.get(object.id);
      this._callbacks.delete(object.id);
      if (object.error) {
        log.formatProtocol('method <= browser ERR',
            {method: callback.method, params: object.result}, 'error');
        callback.reject(object.result);
        return;
      }
      log.formatProtocol('method <= browser OK',
          {method: callback.method, params: object.result}, 'verbose');
      callback.resolve(object.result);
      return;
    }
    log.formatProtocol('method <= browser EVENT',
        {method: object.method, params: object.result}, 'verbose');
    this.emitNotification(object.method, object.params);
  }

  /**
   * @param {!string} command
   * @param {!Object} params
   * @protected
   */
  emitNotification(method, params) {
    this._eventEmitter.emit('notification', {method: method, params: params});
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
