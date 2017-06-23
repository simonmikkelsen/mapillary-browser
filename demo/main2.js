(function(global) {

  'use strict';

  var fabric  = global.fabric || (global.fabric = { }),
      extend = fabric.util.object.extend,
      filters = fabric.Image.filters,
      createClass = fabric.util.createClass;

  /**
   * Adapted from <a href="http://www.html5rocks.com/en/tutorials/canvas/imagefilters/">html5rocks article</a>
   * @class fabric.Image.filters.AdjustSimple
   * @memberOf fabric.Image.filters
   * @extends fabric.Image.filters.BaseFilter
   * @see {@link fabric.Image.filters.AdjustSimple#initialize} for constructor definition
   * object.filters.push(filter);
   * object.applyFilters(canvas.renderAll.bind(canvas));
   */
  filters.AdjustSimple = createClass(filters.BaseFilter, /** @lends fabric.Image.filters.AdjustSimple.prototype */ {

    /**
     * Filter type
     * @param {String} type
     * @default
     */
    type: 'AdjustSimple',

    /**
     * Constructor
     * @memberOf fabric.Image.filters.AdjustSimple.prototype
     * @param {Object} [options] Options object
     * @param {Array}  [adjustments] Adjustments.
     */
    initialize: function(options) {
      options = options || { };

      this.adjustments = options.adjustments;
    },
    
    ensureValue: function(value) {
        if (value < 0) {
            return 0;
        } else if (value > 255) {
            return 255;
        } else if (isNaN(value)) {
            return 255;
        } else {
            return value;
        }
    },
    
    linear_interpolation : function(a, b, fraction) {
      return (a * (1.0 - fraction)) + (b * fraction);
    },

    /**
     * Applies filter to canvas element
     * @param {Object} canvasEl Canvas element to apply filter to
     */
    applyTo: function(canvasEl) {

      var context = canvasEl.getContext('2d'),
          imageData = context.getImageData(0, 0, canvasEl.width, canvasEl.height),
          data = imageData.data,
          iLen = data.length, i;

      var adjustmentCount = this.adjustments.length - 1;
      var adjustPoints = [];
      for (i = 0; i <= adjustmentCount; i++) {
          adjustPoints[i] = i * 255 / adjustmentCount;
      }
      
      var valueLUT = [];
      var n = 0;
      var curve;
      // Make a Look Up Table.
      var prevX = 0, prevY = 0, wantedX = 0;
      valueloop:
      for (var n = 0; n < adjustPoints.length; n++) {
          var lut;
          curve = new Bezier(
          adjustPoints[n],this.adjustments[n],
          adjustPoints[n] + 20,this.adjustments[n],
          adjustPoints[n+1] - 20,this.adjustments[n+1],
          adjustPoints[n+1],this.adjustments[n+1]);
          lut = curve.getLUT(adjustPoints[n], adjustPoints[n + 1], 256 / adjustmentCount);
            
          for (var i = 0; i < lut.length; i++) {
              var nextX = lut[i].x;
              var nextY = lut[i].y;
              if (wantedX == 0) {
                  valueLUT[0] = nextY;
                  wantedX++;
              } else if (nextX >= wantedX) {
                  // Linear interpolation between the two points to get an integer X.
                  var xDiff = nextX - prevX;
                  var fraction = (wantedX - prevX) / xDiff;
                  var wantedY = this.linear_interpolation(prevY, nextY, fraction);
                  valueLUT[wantedX] = wantedY;
                  wantedX++;
              }
              prevX = nextX;
              prevY = nextY;
          }
      }
      
      for (i = 0; i < iLen; i += 4) {
        var r = data[i];
        var g = data[i + 1];
        var b = data[i + 2];
        //var a = data[i + 3]; // we currently don't use the alpha channel.
          
        var value = Math.round((r + g + b) / 3);
        var adjustBy = valueLUT[value];
        
        data[i] = this.ensureValue(r + adjustBy);
        data[i + 1] = this.ensureValue(g + adjustBy);
        data[i + 2] = this.ensureValue(b + adjustBy);
        //data[i + 3] = a; // no change to alpha channel.
      }

      context.putImageData(imageData, 0, 0);
    },

    /**
     * Returns object representation of an instance
     * @return {Object} Object representation of an instance
     */
    toObject: function() {
      return extend(this.callSuper('toObject'), {
        factors: this.factors
      });
    }
  });
  
  /**
   * Returns filter instance from an object representation
   * @static
   * @param {Object} object Object to create an instance from
   * @param {function} [callback] to be invoked after filter creation
   * @return {fabric.Image.filters.AdjustSimple} Instance of fabric.Image.filters.AdjustSimple
   */
  fabric.Image.filters.AdjustSimple.fromObject = fabric.Image.filters.BaseFilter.fromObject;
  
  //*********************************************************************************************//
  
  /**
   * @class fabric.Image.filters.AutoExposure
   * @memberOf fabric.Image.filters
   * @extends fabric.Image.filters.BaseFilter
   * @see {@link fabric.Image.filters.AutoExposure#initialize} for constructor definition
   * object.filters.push(filter);
   * object.applyFilters(canvas.renderAll.bind(canvas));
   */
  filters.AutoExposure = createClass(filters.BaseFilter, /** @lends fabric.Image.filters.AutoExposure.prototype */ {

    /**
     * Filter type
     * @param {String} type
     * @default
     */
    type: 'AutoExposure',

    /**
     * Constructor
     * @memberOf fabric.Image.filters.AutoExposure.prototype
     * @param {Object} [options] Options object
     * @param {Array}  [exposureCompensation] Exposure compensation.
     @param   {boolean} [countOverexposed] Count overexposed pixels.
     */
    initialize: function(options) {
      options = options || { };

      this.exposureCompensation = options.exposureCompensation;
      this.countOverexposed = options.countOverexposed;
    },
    
    ensureValue: function(value) {
        if (value < 0) {
            return 0;
        } else if (value > 255) {
            return 255;
        } else if (isNaN(value)) {
            return 255;
        } else {
            return value;
        }
    },

    /**
     * Applies filter to canvas element
     * @param {Object} canvasEl Canvas element to apply filter to
     */
    applyTo: function(canvasEl) {

      var context = canvasEl.getContext('2d'),
          imageData = context.getImageData(0, 0, canvasEl.width, canvasEl.height),
          data = imageData.data,
          iLen = data.length, i;

      // Calculate average value.
      var countOverexposed = true;
      var valueSumMaxCount = Math.floor(Number.MAX_SAFE_INTEGER / 255);
      var currentValueSum = 0;
      var currentValueSumPixelCount = 0;
      var valueAverages = [];
      var valueAverageIndex = 0;
      for (i = 0; i < iLen; i += 4) {
        var r = data[i];
        var g = data[i + 1];
        var b = data[i + 2];
        //var a = data[i + 3]; // we currently don't use the alpha channel.
        if (countOverexposed || r < 254) {
            currentValueSum += r;
            currentValueSumPixelCount++;
        }
        if (countOverexposed || g < 254) {
            currentValueSum += g;
            currentValueSumPixelCount++;
        }
        if (countOverexposed || b < 254) {
            currentValueSum += b;
            currentValueSumPixelCount++;
        }
        if (currentValueSumPixelCount >= valueSumMaxCount - 3 || i + 4 >= iLen) {
            valueAverages[valueAverageIndex] = currentValueSum / currentValueSumPixelCount;
            valueAverageIndex++;
        }
      }
      
      var valueSums = 0;
      for (i = 0; i < valueAverages.length; i++) {
          // TODO: Should this be done before calculation?
          valueSums += valueAverages[i]; // Assume that the sum of the averages can be held in an integer.
      }
      var valueAverage = Math.round(valueSums / valueAverages.length);
      var target = 118; // 18% grey in Adobe RGB.
      var correction = target - valueAverage + this.exposureCompensation;
      
      for (i = 0; i < iLen; i += 4) {
        var r = data[i];
        var g = data[i + 1];
        var b = data[i + 2];
        //var a = data[i + 3]; // we currently don't use the alpha channel.
        
        data[i] = this.ensureValue(r + correction);
        data[i + 1] = this.ensureValue(g + correction);
        data[i + 2] = this.ensureValue(b + correction);
        //data[i + 3] = a; // no change to alpha channel.
      }

      context.putImageData(imageData, 0, 0);
    },

    /**
     * Returns object representation of an instance
     * @return {Object} Object representation of an instance
     */
    toObject: function() {
      return extend(this.callSuper('toObject'), {
        factors: this.factors
      });
    }
  });
  
  /**
   * Returns filter instance from an object representation
   * @static
   * @param {Object} object Object to create an instance from
   * @param {function} [callback] to be invoked after filter creation
   * @return {fabric.Image.filters.AutoExposure} Instance of fabric.Image.filters.AutoExposure
   */
  fabric.Image.filters.AutoExposure.fromObject = fabric.Image.filters.BaseFilter.fromObject;

})(typeof exports !== 'undefined' ? exports : this);
