// Forked from https://fiddle.jshell.net/filiperoberto/wLub3jau/

//var canvas = new fabric.Canvas('c');
var el;
var image, lastActive, object1, object2;
var cntObj = 0;
var selection_object_left = 0;
var selection_object_top = 0;

/*fabric.Image.fromURL('http://serio.piiym.net/CVBla/txtboard/thumb/1260285874089s.jpg', function(oImg) {
  oImg.selectable = false;
  canvas.add(oImg);
});
*/
//canvas.renderAll();

$('#crop').on('click', function(event) {
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
  disabled = true;

  canvas.remove(canvas.getActiveObject());
  lastActive = object;
  canvas.renderAll();
});

$('#startCrop').on('click', function() {

  canvas.remove(el);
  image = canvas.item(0);

  if (lastActive && lastActive !== object) {
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
    borderColor: '#36fd00',
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
console.log(canvas.getActiveObject());
  for (var i = 0; i < $("#layers li").size(); i++) {
    canvas.item(i).selectable = false;
  }

});

