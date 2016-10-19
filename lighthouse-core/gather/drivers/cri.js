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
const EventEmitter = require('events').EventEmitter;
const WebSocket = require('ws');
const http = require('http');
const port = process.env.PORT || 9222;

class CriDriver extends Driver {
  constructor() {
    super();
    this._lastCommandId = 0;
    /** @type {!Map<number, function(object)}*/
    this._callbacks = new Map();
    this._eventEmitter = new EventEmitter();
  }

  /**
   * @return {!Promise<undefined>}
   */
  connect() {
    return this._runJsonCommand('new').then(response => {
      var url = response.webSocketDebuggerUrl;
      return new Promise((resolve, reject) => {
        var ws = new WebSocket(url);
        ws.on('open', () => {
          this._ws = ws;
          resolve();
        });
        ws.on('message', data => this._dispatch(data));
        ws.on('error', reject);
      });
    });
  }

  /**
   * @return {!Promise<string>}
   */
  _runJsonCommand(command) {
    return new Promise((resolve, reject) => {
      http.get({
        hostname: 'localhost',
        port: port,
        path: '/json/' + command
      }, response => {
        var data = '';
        response.on('data', chunk => {
          data += chunk;
        });
        response.on('end', _ => {
          if (response.statusCode === 200) {
            resolve(JSON.parse(data));
            return;
          }
          reject('Unable to fetch, status: ' + response.statusCode);
        });
      });
    });
  }

  disconnect() {
    if (!this._ws) {
      return Promise.reject('connect() must be called before attempting to disconnect.');
    }
    this._ws.removeAllListeners();
    this._ws.close();
    this._ws = null;
    return Promise.resolve();
  }

  /**
   * Call protocol methods
   * @param {!string} method
   * @param {!Object} params
   * @return {!Promise}
   */
  sendCommand(method, params) {
    if (!this._ws) {
      return Promise.reject('connect() must be called before attempting to send a command.');
    }
    this.formattedLog('method => browser', {method: method, params: params}, 'verbose');
    var id = ++this._lastCommandId;
    var message = JSON.stringify({id: id, method: method, params: params || {}});
    this._ws.send(message);
    return new Promise((resolve, reject) => {
      this._callbacks.set(id, {resolve: resolve, reject: reject, method: method});
    });
  }

  /**
   * @param {string} message
   */
  _dispatch(message) {
    var object = JSON.parse(message);
    if ('id' in object) {
      var callback = this._callbacks.get(object.id);
      this._callbacks.delete(object.id);
      if (object.error) {
        callback.reject(object.result);
        this.formattedLog('method <= browser ERR',
            {method: callback.method, params: object.result}, 'error');
        return;
      }
      callback.resolve(object.result);
      this.formattedLog('method <= browser OK',
          {method: callback.method, params: object.result}, 'verbose');
      return;
    }
    this.formattedLog('method <= browser EVENT',
        {method: object.method, params: object.result}, 'verbose');
    this._eventEmitter.emit(object.method, object.params);
  }
}

module.exports = CriDriver;
