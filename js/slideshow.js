"use strict";

$(function(){
    var pageWidth = $(document).width();
    var mapillaryImageWidth = 320;
    var widths = [320, 640, 1024, 2048];
    var i;
    for (i = 0; i < widths.length; i++) {
        if (widths[i] >= pageWidth) {
            mapillaryImageWidth = widths[i];
        }
    }
    
    var slideWidth = pageWidth - 20;
    var slideHeight = pageWidth * 2 / 3;
    
    $.getJSON( "api/v0/getUnifiedLists.py", {'list':'--favorites'}, function(images) {
        $.each(images, function(i, image){
            var mapillary_key = image[1];
            var favoriteCount = image[2];
            
            $('#slides').append($('<img>').attr('src', 'https://d1cuyjsrcm0gby.cloudfront.net/' + mapillary_key + '/thumb-' + mapillaryImageWidth + '.jpg').attr('data-mapillary-key', mapillary_key));
        });
        
        $("#slides").slidesjs({
            width: slideWidth,
            height: slideHeight,
            navigation: {
              effect: "fade"
            },
            pagination: {
              active: "false"
            },
            effect: {
              fade: {
                speed: 2000
              }
            },
            play: {
              effect: "fade",
              active: true,
              auto: true,
              interval: 20*1000,
              swap: true,
              pauseOnHover: true,
              restartDelay: 2500
            },
            callback: {
              loaded: function(number) {
                // Do something awesome!
                // Passes start slide number
              }, start: function(number) {
                  console.log($('[slidesjs-index="'+number+'"]').attr('data-mapillary-key'));
                // Do something awesome!
                // Passes slide number at start of animation
              },
              complete: function(number) {
                // Do something awesome!
                // Passes slide number at end of animation
              }
            }            
        });
    
    });

});
