
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

function showImagesByKeys(keys) {
    $('.imageList').remove();
    var imageSize = $('#size').val();
    
      var items = [];
      $.each(keys , function(key, val) {
        // Image sizes are only given so the images are located where the probably will be.
        // The unveil plugin can then wait to load images untill they are about to be shown.
        items.push("<a href=\"https://www.mapillary.com/app/?pKey="+val+"&amp;focus=photo\"><img src=\"img/pixie.png\" width=\""+imageSize+"\" height=\""+(imageSize*3/4)+"\" data-src=\"https://d1cuyjsrcm0gby.cloudfront.net/"+val+"/thumb-"+imageSize+".jpg\" /></a>");
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
}

function showSequence(seqId) {
    if (seqId == "") {
        alert("You must specify a sequence ID.");
        return;
    }
    $.getJSON( "https://a.mapillary.com/v2/s/"+seqId+"?client_id="+clientId, function(seq) {
        showImagesByKeys(seq['keys']);
    });
}
$('#showSequence').click(function (){
    var seqId = $('#sequenceID').val();
    showSequence(seqId);
});


$(document).ready(function() {
    var mymap = L.map('mapid').setView([51.505, -0.09], 13);
    
    L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHJ5bCIsImEiOiJjaXVqb3gyY3owMDBrMnRwOXptb3NyZGRjIn0.xjtavWU7nPwvkBErlfrAZw", {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18
    }).addTo(mymap);
    
    $('#showMapImages').click(function () {
        var area = mymap.getBounds();
        var se = area.getSouthEast();
        var nw = area.getNorthWest();
        var min_lat = nw.lat;
        var max_lat = se.lat;
        var min_lon = nw.lon;
        var max_lon = se.lon;
        var url = "https://a.mapillary.com/v2/search/s?client_id="+clientId+"&max_lat="+max_lat+"&max_lon="+max_lon+"&min_lat="+min_lat+"&min_lon="+min_lon+"&limit=1&page=0"
        $.getJSON(url, function(data) {
          var items = [];
          $.each( data['ss'], function(key, seq) {
              showImagesByKeys(seq['keys']);
              //console.log(seq);
              // seq id seq['key'];
              // images seq['keys']
              // seq['coords']
              // seq['cas']
              
          });
        });
    });
});
