/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const log = require('./lib/log.js');

class Progress {
  /**
   * @param {function(string, string)} callback
   */
  constructor(callback) {
    this._callback = callback;
    this._isCanceled = false;
  }

  cancel() {
    this._isCanceled = true;
  }

  /**
   * @param {string} title
   * @param {string=} subtitle
   * @param {boolean=} verbose
   */
  updateStatus(title, subtitle, verbose) {
    log[verbose ? 'verbose' : 'log']('status', title, subtitle || '');
    if (!verbose && this._callback) {
      this._callback(title, subtitle || '');
    }
  }

  /**
   * @return {boolean}
   */
  isCanceled() {
    return this._isCanceled;
  }

  checkCanceled() {
    return passThrough => {
      if (this.isCanceled()) {
        throw new Error('Progress interrupted');
      }
      return passThrough;
    };
  }
}

module.exports = Progress;
