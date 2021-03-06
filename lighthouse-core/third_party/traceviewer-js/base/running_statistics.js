"use strict";
/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

require("./base.js");

'use strict';

global.tr.exportTo('tr.b', function () {
  /***
  * An object of this class computes basic statistics online in O(1).
  * Usage:
  * 1. Create an instance.
  * 2. Add numbers using the |add| method.
  * 3. Query statistics.
  * 4. Repeat from step 2.
  */
  class RunningStatistics {
    constructor() {
      this.mean_ = 0;
      this.count_ = 0;
      this.max_ = -Infinity;
      this.min_ = Infinity;
      this.sum_ = 0;
      this.variance_ = 0;

      // Mean of logarithms of absolute values of samples, or undefined if any
      // samples were <= 0.
      this.meanlogs_ = 0;
    }

    get count() {
      return this.count_;
    }

    get geometricMean() {
      if (this.meanlogs_ === undefined) return 0;
      return Math.exp(this.meanlogs_);
    }

    get mean() {
      if (this.count_ == 0) return undefined;
      return this.mean_;
    }

    get max() {
      return this.max_;
    }

    get min() {
      return this.min_;
    }

    get sum() {
      return this.sum_;
    }

    get variance() {
      if (this.count_ == 0) return undefined;
      if (this.count_ == 1) return 0;
      return this.variance_ / (this.count_ - 1);
    }

    get stddev() {
      if (this.count_ == 0) return undefined;
      return Math.sqrt(this.variance);
    }

    add(x) {
      this.count_++;
      this.max_ = Math.max(this.max_, x);
      this.min_ = Math.min(this.min_, x);
      this.sum_ += x;

      // The geometric mean is computed using the arithmetic mean of logarithms.
      if (x <= 0) this.meanlogs_ = undefined;else if (this.meanlogs_ !== undefined) this.meanlogs_ += (Math.log(Math.abs(x)) - this.meanlogs_) / this.count;

      // The following uses Welford's algorithm for computing running mean
      // and variance. See http://www.johndcook.com/blog/standard_deviation.
      if (this.count_ === 1) {
        this.mean_ = x;
        this.variance_ = 0;
      } else {
        var oldMean = this.mean_;
        var oldVariance = this.variance_;
        // Using the 2nd formula for updating the mean yields better precision
        // but it doesn't work for the case oldMean is Infinity. Hence we handle
        // that case separately.
        if (oldMean === Infinity || oldMean === -Infinity) {
          this.mean_ = this.sum_ / this.count_;
        } else {
          this.mean_ = oldMean + (x - oldMean) / this.count_;
        }
        this.variance_ = oldVariance + (x - oldMean) * (x - this.mean_);
      }
    }

    merge(other) {
      var result = new RunningStatistics();
      result.count_ = this.count_ + other.count_;
      result.sum_ = this.sum_ + other.sum_;
      result.min_ = Math.min(this.min_, other.min_);
      result.max_ = Math.max(this.max_, other.max_);
      if (result.count === 0) {
        result.mean_ = 0;
        result.variance_ = 0;
        result.meanlogs_ = 0;
      } else {
        // Combine the mean and the variance using the formulas from
        // https://goo.gl/ddcAep.
        result.mean_ = result.sum / result.count;
        var deltaMean = (this.mean || 0) - (other.mean || 0);
        result.variance_ = this.variance_ + other.variance_ + this.count * other.count * deltaMean * deltaMean / result.count;

        // Merge the arithmetic means of logarithms of absolute values of
        // samples, weighted by counts.
        if (this.meanlogs_ === undefined || other.meanlogs_ === undefined) {
          result.meanlogs_ = undefined;
        } else {
          result.meanlogs_ = (this.count * this.meanlogs_ + other.count * other.meanlogs_) / result.count;
        }
      }
      return result;
    }

    asDict() {
      if (!this.count) {
        return [];
      }
      // It's more efficient to serialize these fields in an array. If you
      // add any other fields, you should re-evaluate whether it would be more
      // efficient to serialize as a dict.
      return [this.count_, this.max_, this.meanlogs_, this.mean_, this.min_, this.sum_, this.variance_];
    }

    static fromDict(dict) {
      var result = new RunningStatistics();
      if (dict.length != 7) {
        return result;
      }

      var _dict = _slicedToArray(dict, 7);

      result.count_ = _dict[0];
      result.max_ = _dict[1];
      result.meanlogs_ = _dict[2];
      result.mean_ = _dict[3];
      result.min_ = _dict[4];
      result.sum_ = _dict[5];
      result.variance_ = _dict[6];

      return result;
    }
  }

  return {
    RunningStatistics: RunningStatistics
  };
});