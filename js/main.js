
$('#fitImagesToWindow').click(function() {
    var seqViewer = new SequenceViewer();
    seqViewer.fitImagesToWindow();
});

$('#showSequence').click(function (){
    var seqViewer = new SequenceViewer();
    var seqId = $('#sequenceID').val();
    seqViewer.showSequence(seqId);
});

$(document).ready(function() {
    var mymap = L.map('mapid').setView([51.505, -0.09], 3);
    
    L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/{z}/{x}/{y}?access_token="+mapboxPk, {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18
    }).addTo(mymap);
    
    var seqViewer = new SequenceViewer(mymap);
    
    $('#showMapImages').click(function() {
        seqViewer.updateSequenceForMap();
    });
    
    // Invalidate map so it will not be grey when switching to the tab.
    $('#tabsSelectBy a').click(function() {
        setTimeout(function() {
            mymap.invalidateSize();
        }, 0);
    });
});

function SequenceViewer(map) {
    this.map = map;
    this.pageNo = 0;
    this.min_lat = -1;
    this.max_lat = -1;
    this.min_lon = -1;
    this.max_lon = -1;
}

SequenceViewer.prototype.fitImagesToWindow = function() {
    var fit = $('#fitImagesToWindow').is(':checked');
    $(".imageList").each(function(){
        var $img = jQuery(this).find("img");
        if (fit) {
            $img.css({"width": "100%", "height": "auto"});
        } else {
            $img.css({"width": "auto", "height": "auto"});
        }
    });
}

SequenceViewer.prototype.showImagesByKeys = function(keys) {
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
    }).appendTo("#imageContainer");
      
    $(document).ready(function() {
      $("img").unveil(500, function () {
          // When an image is unveiled (loaded when almost visible) the approzimate size will be changed to auto again.
          $(this).css({"width": "auto", "height": "auto"});
      });
    });
}

SequenceViewer.prototype.showSequence = function(seqId) {
    if (seqId == "") {
        alert("You must specify a sequence ID.");
        return;
    }
    var self = this;
    $.getJSON( "https://a.mapillary.com/v2/s/"+seqId+"?client_id="+clientId, function(seq) {
        self.showImagesByKeys(seq['keys']);
    });
}

SequenceViewer.prototype.updateSequenceForMap = function() {
    var area = this.map.getBounds();
    var sw = area.getSouthWest();
    var ne = area.getNorthEast();
    
    var min_lat = sw.lat;
    var max_lat = ne.lat;
    var min_lon = sw.lng;
    var max_lon = ne.lng;
    var url = "https://a.mapillary.com/v2/search/s?client_id="+clientId+"&max_lat="+max_lat+"&max_lon="+max_lon+"&min_lat="+min_lat+"&min_lon="+min_lon+"&limit=1&page="+this.pageNo
    console.log(url);
    var self = this;
    $.getJSON(url, function(data) {
      $.each(data['ss'], function(key, seq) {
          self.showImagesByKeys(seq['keys']);
          //console.log(seq);
          // seq id seq['key'];
          // images seq['keys']
          // seq['coords']
          // seq['cas']
      });
      $(".nextPrevBar").empty();
      if (self.pageNo > 0) {
        var prev = $("<a href=\"#\">Previous</a>").click(function () {
            self.pageNo--;
            self.updateSequenceForMap();
        });
        $(".nextPrevBar").append(prev).append(" - ");
      }
      
      if (data['more'] === true) {
        var next = $("<a href=\"#\">Next</a>").click(function () {
            self.pageNo++;
            self.updateSequenceForMap();
        });
        $(".nextPrevBar").append(next);;
      }
    });
}
