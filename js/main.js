
// Log into mapillary.com, go to settings, applications, create an application and use the public ID here:
var clientId = "Y0NtM3R4Zm52cTBOSUlrTFAwWFFFQTo5OWYyZGMzYjY4ZGU3ZGZh";

function fitImagesToWindow() {
    var fit = $('#fitImagesToWindow').is(':checked');
    $(".imageList").each(function(){
        var $img = jQuery(this).find("img");
        if (fit) {
            $img.css({"width": "100%", "height": "auto"});
        } else {
            $img.css({"width": "auto", "height": "auto"});
        }
    });
};

$('#fitImagesToWindow').click(fitImagesToWindow);

$('#showSequence').click(function (){
    $('.imageList').remove();
    var seqId = $('#sequenceID').val();
    var imageSize = $('#size').val();
    if (seqId == "") {
        alert("You must specify a sequence ID.");
        return;
    }
    $.getJSON( "https://a.mapillary.com/v2/s/"+seqId+"?client_id="+clientId, function( data ) {
      var items = [];
      $.each( data['keys'], function( key, val ) {
        // Image sizes are only given so the images are located where the probably will be.
        // The unveil plugin can then wait to load images untill they are about to be shown.
        items.push( "<a href=\"https://www.mapillary.com/app/?pKey="+val+"&amp;focus=photo\"><img src=\"img/pixie.png\" width=\""+imageSize+"\" height=\""+(imageSize*3/4)+"\" data-src=\"https://d1cuyjsrcm0gby.cloudfront.net/"+val+"/thumb-"+imageSize+".jpg\" /></a>" );
      });
     
      $( "<div/>", {
        "class": "imageList",
        html: items.join("")
      }).appendTo("body");
      
        $(document).ready(function() {
          $("img").unveil(500, function () {
              // When an image is unveiled (loaded when almost visible) the approzimate size will be changed to auto again.
              $(this).css({"width": "auto", "height": "auto"});
          });
        });
    });
});
