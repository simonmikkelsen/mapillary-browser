"use strict";

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
    
    var state = new StateManager();
    if (state.isMapSelected()) {
        seqViewer.updateFromMapState();
        $('a[href="#tabSelectOnMap"]').tab('show');
    } else if (state.isSequenceSelected()) {
        seqViewer.updateFromSequenzeState();
        $('a[href="#tabSelectBySeqId"]').tab('show');
    }
});

$(document).on('keydown', function (e) {
    if ((e.metaKey || e.altKey) && ( String.fromCharCode(e.which).toLowerCase() === 'n') ) {
        $('#nextButton').click();
        console.log('next');
    }
});

$(document).on('keydown', function (e) {
    if ((e.metaKey || e.altKey) && ( String.fromCharCode(e.which).toLowerCase() === 'p') ) {
        $('#prevButton').click();
    }
});

function StateManager() {
    this.knownKeys = ['page', 'seqId', 'min_lat', 'max_lat', 'min_lon', 'max_lon'];
    this.arguments = {};
    this.parseHash();
}

StateManager.prototype.isMapSelected = function() {
    return this.arguments['min_lat'] !== undefined
        && this.arguments['max_lat'] !== undefined
        && this.arguments['min_lon'] !== undefined
        && this.arguments['max_lon'] !== undefined;
}

StateManager.prototype.isSequenceSelected = function() {
    return this.arguments['seqId'] !== undefined;
}

StateManager.prototype.parseHash = function() {
    if (window.location.hash.length <= 1) {
        return;
    }
    var parts = window.location.hash.substr(1).split('&');
    for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].split('=');
        if (this.knownKeys.indexOf(kv[0]) >= 0) {
            this.arguments[kv[0]] = kv[1];
        } else {
            console.log('Unknown key/value pair in hash: '+parts[i]);
        }
    }
}

StateManager.prototype.getValue = function(key) {
    return this.arguments[key];
}

StateManager.prototype.setValue = function(key, value) {
    this.arguments[key] = value;
    this.updateUrlHash();
}

StateManager.prototype.updateUrlHash = function(key, value) {
    var hash = '';
    for (var key in this.arguments) {
        hash += key + '=' + this.arguments[key] + '&';
    }
    hash = hash.substr(0, hash.length - 1);
    window.location.hash = hash;
}

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
        var key = seq['keys'];
        self.showImagesByKeys(key);
        var state = new StateManager();
        state.setValue('seqId', seqId);
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
    this.updateSequence(min_lat, max_lat, min_lon, max_lon);
}

SequenceViewer.prototype.updateFromMapState = function() {
    var state = new StateManager();
    var pageNoLocal = state.getValue('page');
    this.pageNo = 0;
    if (pageNoLocal !== undefined) {
        this.pageNo = pageNoLocal;
    }
    
    var min_lat = state.getValue('min_lat');
    var max_lat = state.getValue('max_lat');
    var min_lon = state.getValue('min_lon');
    var max_lon = state.getValue('max_lon');
    
    var southWest = L.latLng(min_lat, min_lon);
    var northEast = L.latLng(max_lat, max_lon);
    var bounds = L.latLngBounds(southWest, northEast);
    this.map.fitBounds(bounds);
}

SequenceViewer.prototype.updateFromSequenzeState = function() {
    var state = new StateManager();
    var seqId = state.getValue('seqId');
    this.showSequence(seqId);
}

SequenceViewer.prototype.updateSequence = function(min_lat, max_lat, min_lon, max_lon) {
    var url = "https://a.mapillary.com/v2/search/s?client_id="+clientId+"&max_lat="+max_lat+"&max_lon="+max_lon+"&min_lat="+min_lat+"&min_lon="+min_lon+"&limit=1&page="+this.pageNo
    
    var state = new StateManager();
    state.setValue('page', this.pageNo);
    state.setValue('min_lat', min_lat);
    state.setValue('max_lat', max_lat);
    state.setValue('min_lon', min_lon);
    state.setValue('max_lon', max_lon);
    
    var self = this;
    $.getJSON(url, function(data) {
        $.each(data['ss'], function(key, seq) {
           self.showImagesByKeys(seq['keys']);
        });
        $(".nextPrevBar").empty();
        if (self.pageNo > 0) {
            var prev = $("<button type=\"button\" class=\"btn btn-link\">Previous</button>").click(function () {
                self.pageNo--;
                self.updateSequenceForMap();
            });
          $(".nextPrevBar").append(prev).append(" - ");
        }
      
        if (data['more'] === true) {
            var next = $("<button type=\"button\" class=\"btn btn-link\">Next</button>").click(function () {
                self.pageNo++;
                self.updateSequenceForMap();
            });
            $(".nextPrevBar").append(next);;
        }
    });
}
