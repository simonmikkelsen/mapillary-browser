(function(global) {

 // 'use strict'; *//TODO: Reintroduce and fix errors.

  var imageEditor = global.imageEditor|| (global.imageEditor = { });

  fabric.Object.prototype.transparentCorners = false;
  fabric.Object.prototype.padding = 5;
  fabric.Object.prototype.hasControls  = false;
  fabric.Object.prototype.hasRotatingPoint = false;
  fabric.Object.prototype.lockMovementX = true;
  fabric.Object.prototype.lockMovementY = true;
  fabric.Object.prototype.lockRotation = true;
  fabric.Object.prototype.lockScalingFlip = true;
  fabric.Object.prototype.lockScalingX = true;
  fabric.Object.prototype.lockScalingY = true;
  fabric.Object.prototype.lockSkewingX = true;
  fabric.Object.prototype.lockSkewingY = true;
  fabric.Object.prototype.selectable = false;

  var canvas = this.__canvas = new fabric.Canvas('c'),
      f = fabric.Image.filters;

  imageEditor.canvas = canvas;

  function applyFilter(index, filter) {
    var obj = canvas.getActiveObject();
    obj.filters[index] = filter;
    obj.applyFilters(canvas.renderAll.bind(canvas));
  }

  function initFilter(index, filter) {
    var obj = canvas.getActiveObject();
    obj.filters[index] = filter;
  }

  function applyFilterValue(index, prop, value) {
    var obj = canvas.getActiveObject();
    if (obj.filters[index]) {
      obj.filters[index][prop] = value;
      obj.applyFilters(canvas.renderAll.bind(canvas));
    }
  }
  
  function getSharpenMatrix(val) {
    return [0,         -val,    0,
         -val,  1 + val * 4, -val,
            0,         -val,     0];
  }

  canvas.on({
    'object:selected': function() {
      fabric.util.toArray(document.getElementsByTagName('input'))
                          .forEach(function(el){ el.disabled = false; })

      var filters = ['brightness', 'contrast', 'saturate', 'sharpen', 'autoexposure'];
    },
    'selection:cleared': function() {
      fabric.util.toArray(document.getElementsByTagName('input'))
                          .forEach(function(el){ el.disabled = true; })
    }
});
  
  initFilters = function() {
    initFilter(0, new f.Brightness({
      brightness: parseInt($('#brightness-value').val(), 10)
    }));
    
    initFilter(1, new f.Contrast({
      contrast: parseInt($('#contrast-value').val(), 10)
    }));
    
    initFilter(2, new f.Saturate({
      saturate: parseInt($('#saturate-value').val(), 10)
    }));
    
    initFilter(3, new f.Convolute({
      matrix: getSharpenMatrix(parseFloat($('#sharpen-value').val()))
    }));
    
    //initFilter(5, new f.AutoExposure({
    //  exposureCompensation: parseInt($('#autoexposure-value').val(), 11)
    //}));
  }
  
  fabric.Image.fromURL('tryl-er9RWwCe1cH0xcgsHEj6ZQ.jpg', function(img) {
    var oImg = img.set({ left: 30, top: 30, angle: 0 });
    imageEditor.image = oImg;
    oImg.selectable = false;
    canvas.add(oImg).renderAll();
    canvas.setActiveObject(oImg);
    initFilters();
  });
  $('#brightness-value').change(function() {
    applyFilterValue(0, 'brightness', parseInt(this.value, 10));
  });
  $('#contrast-value').change(function() {
    applyFilterValue(1, 'contrast', parseInt(this.value, 10));
  });
  $('#saturate-value').change(function() {
    applyFilterValue(2, 'saturate', parseInt(this.value, 10));
  });
  $('#sharpen-value').change(function() {
    var val = parseFloat(this.value, 0);
    applyFilterValue(3, 'matrix', getSharpenMatrix(val));
  });
  var adjustFunction = function() {
    applyFilter(4, new f.AdjustSimple({
        adjustments : [
            parseInt($('#adjust-dark-point').val(), 10),
            parseInt($('#adjust-shadows').val(), 10),
            parseInt($('#adjust-midtones').val(), 10),
            parseInt($('#adjust-highlightes').val(), 10),
            parseInt($('#adjust-bright-point').val(), 10)
            ]
    }));
  };
  $('#adjust-dark-point').change(adjustFunction);
  $('#adjust-shadows').change(adjustFunction);
  $('#adjust-midtones').change(adjustFunction);
  $('#adjust-highlightes').change(adjustFunction);
  $('#adjust-bright-point').change(adjustFunction);
  
  //$('#autoexposure-value').change(function() {
  //  applyFilterValue(5, 'exposureCompensation', parseInt(this.value, 10));
  //});
  
  var rotateControl = $('#rotate');
  rotateControl.change(function() {
    var obj = imageEditor.image;
    obj.setAngle(parseInt(this.value, 10));
    canvas.trigger('image:rotated', { target: obj });
    canvas.renderAll();
  });

  var scaleControl = $('#scale-control');
  scaleControl.change(function() {
    var obj = imageEditor.image;
    obj.scale(parseFloat(this.value)).setCoords();
    canvas.renderAll();
  });
  
})(typeof exports !== 'undefined' ? exports : this);
