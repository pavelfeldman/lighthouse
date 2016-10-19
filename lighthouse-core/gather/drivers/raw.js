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

const Driver = require('./driver.js');
const log = require('../../lib/log.js');
const EventEmitter = require('events').EventEmitter;

/**
 * @interface
 */
class Port {
  /**
   * @param {!string} eventName 'message' or 'closed'
   * @param {function(string|undefined)} cb
   */
  on(eventName, cb) { }

  /**
   * @param {string} message
   */
  send(message) { }

  close() { }
}

class RawDriver extends Driver {
  /**
   * @param {!Port} port
   */
  constructor(port) {
    super();
    this._lastCommandId = 0;
    /** @type {!Map<number, function(object)}*/
    this._callbacks = new Map();
    this._port = port;
    this._port.on('message', this._dispatch.bind(this));
    this._port.on('closed', this._closed.bind(this));
    this._eventEmitter = new EventEmitter();
  }

  /**
   * @return {!Promise<undefined>}
   */
  connect() {
    return Promise.resolve();
  }

  disconnect() {
    return this._port.close();
  }

  /**
   * Call protocol methods
   * @param {!string} command
   * @param {!Object} params
   * @return {!Promise}
   */
  sendCommand(command, params) {
    this.formattedLog('method => browser', {method: command, params: params}, 'verbose');
    var id = ++this._lastCommandId;
    this._port.send(JSON.stringify({ id: id, method: command, params: params || {}}));
    return new Promise((fulfill, reject) => this._callbacks.set(id, {fulfill: fulfill, reject: reject, command: command}));
  }

  /**
   * @param {string} message
   */
  _dispatch(message)
  {
    var object = JSON.parse(message);
    if ('id' in object) {
      var callback = this._callbacks.get(object['id']);
      this._callbacks.delete(object['id']);
      if (object['error']) {
        callback.reject(object['result']);
        this.formattedLog('method <= browser ERR', {method: callback.command, params: object["result"]}, 'error');
        return;
      }
      callback.fulfill(object['result']);
      this.formattedLog('method <= browser OK', {method: callback.command, params: object["result"]}, 'verbose');
      return;
    }

    this._eventEmitter.emit(object['method'], object['params']);
  }

  _closed() {
  }
}

RawDriver.Port = Port;

module.exports = RawDriver;
