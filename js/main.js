"use strict";

$('#size').click(function () {
    var imageSize = $('#size').val();
    var state = new StateManager();
    state.setValue('imageSize', imageSize);
});

$(document).ready(function() {
    var mymap = L.map('mapid').setView([51.505, -0.09], 3);
    
    L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/{z}/{x}/{y}?access_token="+mapboxPk, {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18
    }).addTo(mymap);
    
    /*L.tileLayer('https://d6a1v2w10ny40.cloudfront.net/v0.1/{z}/{x}/{y}.png', {
		maxZoom: 17,
		id: 'mapillary.sequences'
	}).addTo(mymap);*/
    
    $(".datepicker").datepicker({
      changeMonth: true,
      changeYear: true,
      dateFormat: 'yy-mm-dd',
      yearRange: '1900:nn'
    });
    
    var seqViewer = new SequenceViewer(mymap);
    window.seqViewer = seqViewer;
    
    $('#showMapSequences').click(function() {
        seqViewer.updateSequenceForMap();
    });
    
    $('#showMapImages').click(function() {
        seqViewer.updateImagesForMap();
    });
    
    $('#fitImagesToWindow').click(function() {
        seqViewer.fitImagesToWindow();
    });

    $('#showSequence').click(function (){
        var seqId = $('#sequenceID').val();
        seqViewer.showSequence(seqId);
    });
    
    // Invalidate map so it will not be grey when switching to the tab.
    $('#tabsSelectBy a').click(function() {
        setTimeout(function() {
            mymap.invalidateSize();
        }, 0);
    });
    
    var state = new StateManager();
    var method = state.getValue('method');
    if (method == 'imagesOnMap') {
        $('a[href="#tabSelectImagesOnMap"]').tab('show');
        seqViewer.updateFromMapState();
    } else if (method == 'sequencesOnMap') {
        $('a[href="#tabSelectSequencesOnMap"]').tab('show');
        seqViewer.updateFromMapState();
    } else if (state.isSequenceSelected()) {
        $('a[href="#tabSelectBySeqId"]').tab('show');
        seqViewer.updateFromSequenzeState();
    }
});

$(document).on('keydown', function (e) {
    if ((e.metaKey || e.altKey) && ( String.fromCharCode(e.which).toLowerCase() === 'n') ) {
        $('#nextButton').click();
    }
});

$(document).on('keydown', function (e) {
    if ((e.metaKey || e.altKey) && ( String.fromCharCode(e.which).toLowerCase() === 'p') ) {
        $('#prevButton').click();
    }
});

function StateManager() {
    this.parseHash();
}

StateManager.prototype.removePrefix = function(prefix) {
    var removeKeys = [];
    for (var key in this.arguments) {
        if (key.indexOf(prefix) == 0) {
            removeKeys[removeKeys.length] = key;
        }
    }
    
    for (var i = 0; i < removeKeys.length; i++) {
        delete this.arguments[removeKeys[i]];
    }
}

StateManager.prototype.clearNonSequenceState = function() {
    delete this.arguments['min_lat'];
    delete this.arguments['max_lat'];
    delete this.arguments['min_lon'];
    delete this.arguments['max_lon'];
    delete this.arguments['page'];
    delete this.arguments['user'];
    delete this.arguments['startDate'];
    delete this.arguments['endDate'];
    this.updateUrlHash();
}

StateManager.prototype.clearState = function() {
    this.arguments = {};
    this.updateUrlHash();
}
    
StateManager.prototype.clearNonMapState = function() {
    delete this.arguments['seqId'];
    this.updateUrlHash();
}

StateManager.prototype.isSequenceSelected = function() {
    return this.arguments['seqId'] !== undefined;
}

StateManager.prototype.parseHash = function() {
    this.arguments = {};
    if (window.location.hash.length <= 1) {
        return;
    }
    var parts = window.location.hash.substr(1).split('&');
    
    for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].split('=');
        this.arguments[kv[0]] = kv[1];
    }
}

StateManager.prototype.getValue = function(key) {
    return this.arguments[key];
}

StateManager.prototype.removeValue = function(key, value) {
    delete this.arguments[key];
    this.updateUrlHash();
}

StateManager.prototype.setValue = function(key, value) {
    this.parseHash();
    this.arguments[key] = value;
    this.updateUrlHash();
}

StateManager.prototype.updateUrlHash = function() {
    var hash = '';
    for (var key in this.arguments) {
        hash += key + '=' + encodeURIComponent(this.arguments[key]) + '&';
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
    this.state = new StateManager();
    this.imageLoadedListeners = [];
    this.unveilListeners = [];
    
    this.metadata = null;
    if (typeof MetaData != 'undefined') {
        this.metadata = new MetaData();
    }
}

SequenceViewer.prototype.fitImagesToWindow = function() {
    var fit = $('#fitImagesToWindow').is(':checked');
    
    this.state.setValue('fitImages', (fit ? "true" : "false" ));
    
    $(".imageList").each(function(){
        var $img = jQuery(this).find("img");
        if (fit) {
            $img.css({"width": "100%", "height": "auto"});
        } else {
            $img.css({"width": "auto", "height": "auto"});
        }
    });
}

SequenceViewer.prototype.activateUnveil = function(keys) {
    var self = this;
    $(document).ready(function() {
        $("img").unveil(500, function () {
            // When an image is unveiled (loaded when almost visible) the approzimate size will be changed to auto again.
            $(this).css({"width": "auto", "height": "auto"});
            self.imageUnveiled(this);
        });
    });
}

SequenceViewer.prototype.getImageLink = function(imageKey, imageSize) {
    // Image sizes are only given so the images are located where the probably will be.
    // The unveil plugin can then wait to load images untill they are about to be shown.
    
    return "<div class=\"imageBox\">"
        + "<div class=\"image\"><a href=\"https://www.mapillary.com/app/?pKey="+imageKey+"&amp;focus=photo\"><img src=\"img/pixie.png\" width=\""
        + imageSize+"\" height=\""+(imageSize*3/4)+"\" data-src=\"https://d1cuyjsrcm0gby.cloudfront.net/"+imageKey+"/thumb-"+imageSize+".jpg\" /></a></div>"
        + "<div class=\"list-icons\">"
        + " <span class=\"glyphicon glyphicon-heart-empty favorite\" ></span>"
        + " <span class=\"glyphicon glyphicon-thumbs-up up\" ></span>"
        + " <span class=\"glyphicon glyphicon-thumbs-down down\" ></span>"
        + "</div>"
        + "<div class=\"metaDataBox\">"
        + "<form>"
        + "     <input type=\"hidden\" name=\"imageKey\" class=\"imageKey\" value=\""+imageKey+"\">"
        + "     <button type=\"button\" class=\"btn btn-default saveButton\">Save</button>"
        + "     <button type=\"button\" class=\"btn btn-default addButton\">Add</button>"
        + "     <span class=\"fa fa-spinner fa-spin spinner\" style=\"font-size:24px; display: none\"></span>"
        + "</form>"
        + "</div>"
        + "</div>";
}

SequenceViewer.prototype.showImagesByKeys = function(keys) {
    var imageSize = $('#size').val();

    var items = [];
    var self = this;
    $.each(keys , function(key, val) {
        items.push(self.getImageLink(val, imageSize));
    });
    
    this.addItemsToImageContainer(items);
    this.activateUnveil();
}

SequenceViewer.prototype.showImages = function(images) {
    var imageSize = $('#size').val();

    var items = [];
    var self = this;
    $.each(images , function(i, img) {
        items.push(self.getImageLink(img['key'], imageSize));
    });
     
    this.addItemsToImageContainer(items);
    this.activateUnveil();
}

SequenceViewer.prototype.addItemsToImageContainer = function(items) {
    $('.imageList').remove();
    $( "<div/>", {
        "class": "imageList",
        html: items.join("")
    }).appendTo("#imageContainer");
    if (this.metadata !== null) {
        this.metadata.buttonsAdded();
    }
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
        self.state.clearNonSequenceState();
        self.state.setValue('seqId', seqId);
        self.imagesLoaded();
    });
}

SequenceViewer.prototype.getSelectedTabID = function() {
    return $("#tabsSelectBy li.active a").attr('href');
}

SequenceViewer.prototype.getUrlArgsForOptions = function() {
    var containerID = this.getSelectedTabID();
    var startDate = $(containerID+" .startDate").datepicker("getDate");
    var endDate = $(containerID+" .endDate").datepicker("getDate");
    var extraArgs = "";
    if (startDate !== null) {
        extraArgs += "&start_time="+startDate.getTime();
    }
    if (endDate !== null) {
        extraArgs += "&end_time="+endDate.getTime();
    }
    var user = $(containerID+" .userField").val();
    if (user !== undefined && user.trim().length > 0) {
        extraArgs += "&user="+encodeURIComponent(user);
    }
    return extraArgs;
}

SequenceViewer.prototype.setUrlArgsInState = function() {
    var containerID = this.getSelectedTabID();
    
    var startDate = $(containerID+" .startDate").datepicker("getDate");
    var endDate = $(containerID+" .endDate").datepicker("getDate");
    var user = $(containerID+" .userField").val();
    
    if (startDate !== null) {
        this.state.setValue('startDate', startDate.getTime());
    } else {
        this.state.removeValue('startDate');
    }
    
    if (endDate !== null) {
        this.state.setValue('endDate', endDate.getTime());
    } else {
        this.state.removeValue('endDate');
    }
    
    if (user !== undefined && user.trim().length > 0) {
        this.state.setValue('user', user);
    } else {
        this.state.removeValue('user');
    }
}

SequenceViewer.prototype.updateImagesForMap = function() {
    var area = this.map.getBounds();
    var sw = area.getSouthWest();
    var ne = area.getNorthEast();
    
    var min_lat = sw.lat;
    var max_lat = ne.lat;
    var min_lon = sw.lng;
    var max_lon = ne.lng;
    
    var extraArgs = this.getUrlArgsForOptions();
    
    var url = "https://a.mapillary.com/v2/search/im?client_id="+clientId+"&max_lat="+max_lat+"&max_lon="+max_lon+"&min_lat="+min_lat+"&min_lon="+min_lon+"&limit=500&page="+this.pageNo+""+extraArgs;
    
    this.state.clearState();
    this.setUrlArgsInState();
    this.state.setValue('page', this.pageNo);
    this.state.setValue('min_lat', min_lat);
    this.state.setValue('max_lat', max_lat);
    this.state.setValue('min_lon', min_lon);
    this.state.setValue('max_lon', max_lon);
    this.state.setValue('method', 'imagesOnMap');
    
    var self = this;
    $.getJSON(url, function(data) {
        self.showImages(data['ims']);
        self.updateNextPrev(data['more']);
        self.imagesLoaded();
    });
}

SequenceViewer.prototype.updateNextPrev = function(isMoreData) {
    $(".nextPrevBar").empty();
    var self = this;
    if (this.pageNo > 0) {
        var prev = $("<button type=\"button\" class=\"btn btn-link\">Previous</button>").click(function () {
            self.pageNo--;
            self.updateSequenceForMap();
        });
      $(".nextPrevBar").append(prev).append(" - ");
    }
  
    if (isMoreData === true) {
        var next = $("<button type=\"button\" class=\"btn btn-link\">Next</button>").click(function () {
            self.pageNo++;
            self.updateSequenceForMap();
        });
        $(".nextPrevBar").append(next);;
    }
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
    var pageNoLocal = this.state.getValue('page');
    this.pageNo = 0;
    if (pageNoLocal !== undefined) {
        this.pageNo = pageNoLocal;
    }
    
    var min_lat = this.state.getValue('min_lat');
    var max_lat = this.state.getValue('max_lat');
    var min_lon = this.state.getValue('min_lon');
    var max_lon = this.state.getValue('max_lon');
    
    var southWest = L.latLng(min_lat, min_lon);
    var northEast = L.latLng(max_lat, max_lon);
    var bounds = L.latLngBounds(southWest, northEast);
    this.map.fitBounds(bounds);
   
    var user = this.state.getValue('user');
    var startDate = this.state.getValue('startDate');
    var endDate = this.state.getValue('endDate');

    var containerID = this.getSelectedTabID();
    if (startDate !== undefined && startDate > 0) {
        $(containerID+" .startDate").datepicker("setDate", new Date(startDate));
    }
    if (endDate !== undefined && endDate > 0) {
        $(containerID+" .endDate").datepicker("setDate", new Date(endDate));
    }
    if (user !== undefined && user.trim().length > 0) {
        $(containerID+" .userField").val(user);
    }
}

SequenceViewer.prototype.updateFromSequenzeState = function() {
    var seqId = this.state.getValue('seqId');
    this.showSequence(seqId);
}

SequenceViewer.prototype.addImagesLoadedListener = function(toAdd) {
    this.imageLoadedListeners.push(toAdd);
}
// TODO: Remove images loaded listener
SequenceViewer.prototype.imagesLoaded = function() {
    var i;
    for (i = 0; i < this.imageLoadedListeners.length; i++) {
        this.imageLoadedListeners[i]();
    }
}

SequenceViewer.prototype.addUnveilListener = function(toAdd) {
    this.unveilListeners.push(toAdd);
}

SequenceViewer.prototype.imageUnveiled = function(image) {
    var i;
    for (i = 0; i < this.unveilListeners.length; i++) {
        this.unveilListeners[i](image);
    }
}

SequenceViewer.prototype.updateSequence = function(min_lat, max_lat, min_lon, max_lon) {
    var extraArgs = this.getUrlArgsForOptions();
    var url = "https://a.mapillary.com/v2/search/s?client_id="+clientId+"&max_lat="+max_lat+"&max_lon="+max_lon+"&min_lat="+min_lat+"&min_lon="+min_lon+"&limit=1&page="+this.pageNo+extraArgs
    
    this.state.clearState();
    this.setUrlArgsInState();
    this.state.setValue('page', this.pageNo);
    this.state.setValue('min_lat', min_lat);
    this.state.setValue('max_lat', max_lat);
    this.state.setValue('min_lon', min_lon);
    this.state.setValue('max_lon', max_lon);
    this.state.setValue('method', 'sequencesOnMap');
    
    var self = this;
    $.getJSON(url, function(data) {
        $.each(data['ss'], function(key, seq) {
           self.showImagesByKeys(seq['keys']);
        });
        self.updateNextPrev(data['more']);
        self.imagesLoaded();
    });
}
