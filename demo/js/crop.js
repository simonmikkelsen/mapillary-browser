	// Forked from https://fiddle.jshell.net/filiperoberto/wLub3jau/

(function(global) {

 // 'use strict'; *//TODO: Reintroduce and fix errors.

var imageEditor = global.imageEditor|| (global.imageEditor = { });
var canvas = imageEditor.canvas;
var el;
var image, lastActive, object1, object2;
var cntObj = 0;
var selection_object_left = 0;
var selection_object_top = 0;

var doCrop = function(event) {
  var left = el.left - image.left;
  var top = el.top - image.top;
  left *= 1;
  top *= 1;
  var width = el.width * 1;
  var height = el.height * 1;
  image.clipTo = function(ctx) {
    ctx.rect(-(el.width / 2) + left, -(el.height / 2) + top, parseInt(width * el.scaleX), parseInt(el.scaleY * height));
  }

  for (var i = 0; i < $("#layers li").size(); i++) {
    canvas.item(i).selectable = true;
  }

  canvas.remove(canvas.getActiveObject());
  lastActive = image;
  canvas.renderAll();
  canvas.setActiveObject(image);
};

  var getSlope = function(x1, y1, x2, y2) {
    if (x1 == x2) {
      return NaN; // Cannot devide by 0.
    }
    return (y1 - y2) / (x1 - x2);
  };

  var xByYCoords = function(x1, y1, x2, y2, y) {
    var slope = getSlope(x1, y1, x2, y2);
    if (isNaN(slope)) {
      return NaN;
    }
    //y - y1 = b (x - x1) <=> ((y - y1) / b) + x1
    return ((y - y1) / slope) + x1;
  };

  var yByXCoords = function(x1, y1, x2, y2, x) {
    var slope = getSlope(x1, y1, x2, y2);
    if (isNaN(slope)) {
      return NaN;
    }
    //y - y1 = b (x - x1) <=> y = b (x - x1) + y1
    return slope * (x - x1) + y1;
  };

  var matchCropAndRotation = function() {
    image.setCoords();
    
    var i = image.aCoords;
    var r = el.aCoords;
    var blx = tlx = Math.max(i.tl.x, i.bl.x, r.tl.x);
    var tly = tr_y = Math.max(i.tl.y, i.tr.y, r.tl.y);
    var trx = brx = Math.min(i.tr.x, i.br.x, r.tr.x);
    var bly = bry = Math.min(i.bl.y, i.br.y, r.bl.y);

		var rectLeftX, rectTopY, rectRightX, rectBottomY;
    if (image.angle > 0) {
      // i: Image coordinates along the requested side
      // r: The corner on the requested side that is next when going clock wise. 
      rectLeftX = xByYCoords(i.tl.x, i.tl.y, i.bl.x, i.bl.y, r.tl.y);
      rectTopY = yByXCoords(i.tl.x, i.tl.y, i.tr.x, i.tr.y, r.tr.x);
      rectRightX = xByYCoords(i.tr.x, i.tr.y, i.br.x, i.br.y, r.br.y);
      rectBottomY = yByXCoords(i.bl.x, i.bl.y, i.br.x, i.br.y, r.bl.x);
    } else if (image.angle < 0) {
      // r: The corner on the requested side that is previous when going clock wise. 
      rectLeftX = xByYCoords(i.tl.x, i.tl.y, i.bl.x, i.bl.y, r.bl.y);
      rectTopY = yByXCoords(i.tl.x, i.tl.y, i.tr.x, i.tr.y, r.tl.x);
      rectRightX = xByYCoords(i.tr.x, i.tr.y, i.br.x, i.br.y, r.tr.y);
      rectBottomY = yByXCoords(i.bl.x, i.bl.y, i.br.x, i.br.y, r.br.x);
    } else { // image.angle === 0
      rectLeftX = i.tl.x;
      rectTopY = i.tl.y;
      rectRightX = i.tr.x;
      rectBottomY = i.bl.y;
    }

    el.setScaleY(1);
    el.setScaleX(1);
    
    var leftX = Math.max(r.tl.x, rectLeftX);
    var topY = Math.max(r.tl.y, rectTopY);
    var rightX = Math.min(r.tr.x, rectRightX);
    var bottomY = Math.min(r.bl.y, rectBottomY);

    if (! isNaN(leftX)) {
    	el.setLeft(leftX);
    }
    if (! isNaN(topY)) {
    	el.setTop(topY);
    }
    if (! isNaN(rightX) && ! isNaN(leftX)) {
    	el.setWidth(rightX - leftX);
    }
    
    if (! isNaN(bottomY) && ! isNaN(topY)) {
    	el.setHeight(bottomY - topY);
    }
    el.setCoords();
  };


var startCrop = function() {

  canvas.remove(el);
  image = imageEditor.image;

  if (lastActive && lastActive !== image) {
    lastActive.clipTo = null;
  }
  el = new fabric.Rect({
    fill: 'transparent',
    originX: 'left',
    originY: 'top',
    stroke: '#ccc',
    strokeDashArray: [2, 2],
    opacity: 1,
    width: 1,
    height: 1,
    borderColor: 'transparent',
    cornerColor: 'green',
    hasRotatingPoint: false,
    hasControls: true,
    selectable: true,
    lockScalingX: false,
    lockScalingY: false
  });

  el.left = image.left;
  selection_object_left = image.left;
  selection_object_top = image.top;
  el.top = image.top;
  el.width = image.width * image.scaleX;
  el.height = image.height * image.scaleY;


  canvas.add(el);
  canvas.setActiveObject(el);
  for (var i = 0; i < $("#layers li").size(); i++) {
    canvas.item(i).selectable = false;
  }

  canvas.on({
    'image:rotated': matchCropAndRotation
  });
  canvas.on({
    'object:modified': matchCropAndRotation
  });

};

$('#cropEnabled').on('click', function(e) {
  if (e.target.checked) {
    startCrop();
  } else {
    doCrop();
  }
  
});

})(typeof exports !== 'undefined' ? exports : this);
