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
    
    $('#showInList').click(function() {
        seqViewer.updateImagesForList();
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
    
    // TODO: Restore state of showing a list.
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
    } else if (state.isListSelected()) {
        $('a[href="#tabSelectImagesInList"]').tab('show');
        seqViewer.updateFromSequenzeState();
    }

    seqViewer.populateListNames();
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
    this.pageNo = 0;
    this.arguments = {};
    this.updateUrlHash();
}
    
StateManager.prototype.clearNonMapState = function() {
    delete this.arguments['seqId'];
    this.updateUrlHash();
}

StateManager.prototype.isListSelected = function() {
    return this.arguments['list'] !== undefined;
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
    this.imgInfobyValue = [];

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

SequenceViewer.prototype.showImagesByKeys = function(keys) {
    var self = this;
    var imageSize = $('#size').val();

    var items = [];
    $.each(keys , function(key, val) {
        items.push(self.getImageLink(val, undefined, undefined, imageSize, loggedIn));
    });

    self.addItemsToImageContainer(items);
 }

SequenceViewer.prototype.getImageLink = function(imageKey, user, captured_at, imageSize, loggedIn) {
    // Image sizes are only given so the images are located where the probably will be.
    // The unveil plugin can then wait to load images untill they are about to be shown.
    
    var res = "<div class=\"imageBox\">"
        + "<div class=\"image\"><a href=\"https://www.mapillary.com/app/?pKey="+imageKey+"&amp;focus=photo\"><img src=\"img/pixie.png\" width=\""
        + imageSize+"\" height=\""+(imageSize*3/4)+"\" data-src=\"https://d1cuyjsrcm0gby.cloudfront.net/"+imageKey+"/thumb-"+imageSize+".jpg\" /></a></div>";
        res += "<div class=\"list-icons\">"
    if (loggedIn) {
        res += " <span class=\"glyphicon glyphicon-heart-empty favorite\" ></span>"
        + " <span class=\"glyphicon glyphicon-thumbs-up up\" ></span>"
        + " <span class=\"glyphicon glyphicon-thumbs-down down\" ></span>"
    }
    if (user != undefined) {
        res += '<span class="imageUser pull-right"><a href="https://www.mapillary.com/app/user/' + user + '?focus=photo&pKey=' + imageKey + '">' + user + '</a></span>';
    }
    res += "</div>";

    if (loggedIn) {
        res += "<div class=\"metaDataBox\">"
        + "<form>"
        + "     <input type=\"hidden\" name=\"imageKey\" class=\"imageKey\" value=\""+imageKey+"\">"
        + "     <button type=\"button\" class=\"btn btn-default saveButton\">Save</button>"
        + "     <button type=\"button\" class=\"btn btn-default addButton\">Add</button>"
        + "     <span class=\"fa fa-spinner fa-spin spinner\" style=\"font-size:24px; display: none\"></span>"
        + "</form>"
        + "</div>";
    }
    res += "</div>";
    return res;
}

SequenceViewer.prototype.showImages = function(images) {
    var self = this;
    window.login.whenLoggedIn(function(loggedIn) {
        var imageSize = $('#size').val();

        var items = [];
        $.each(images , function(i, img) {
            items.push(self.getImageLink(img['key'], img['user'], img['captured_at'], imageSize, loggedIn));
        });
        
        self.addItemsToImageContainer(items);
        self.activateUnveil();
    });
}

SequenceViewer.prototype.showImagesGeojson = function(geojson) {
    if (geojson['type'] === 'FeatureCollection') {
        this.showImagesGeojsonFeatureCollection(geojson);
    } else if (geojson['type'] === 'Feature') {
        this.showImagesGeojsonFeature(geojson);
    } else {
       console.log('Got no FeatureCollection type i GeoJson: ' + geojson['type']);
    }

}

SequenceViewer.prototype.showImagesGeojsonFeature = function(geojson) {
    var self = this;
    window.login.whenLoggedIn(function(loggedIn) {
        var imageSize = $('#size').val();

        var items = [];
        $.each(geojson['properties']['coordinateProperties']['image_keys'], function(i, imagekey) {
            items.push(self.getImageLink(imagekey, undefined, undefined, imageSize, loggedIn));
        });
        
        self.addItemsToImageContainer(items);
        self.activateUnveil();
    });
}

SequenceViewer.prototype.showImagesGeojsonFeatureCollection = function(geojson) {
    var self = this;
    window.login.whenLoggedIn(function(loggedIn) {
        var imageSize = $('#size').val();

        var items = [];
        $.each(geojson['features'], function(i, feature) {
            var properties = feature['properties'];
            var geometryType = feature['geometry']['type'];
            if (geometryType === "LineString") {
                $.each(properties['coordinateProperties']['image_keys'], function(i, imagekey) {
                    items.push(self.getImageLink(imagekey, undefined, undefined, imageSize, loggedIn));
                });
            } else if (geometryType === "Point") {
                items.push(self.getImageLink(properties['key'], properties['username'], properties['captured_at'], imageSize, loggedIn));
            } else {
                console.log("Unknown geometry type: " + geometryType);
            }
        });
        
        self.addItemsToImageContainer(items);
        self.activateUnveil();
    });
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
    $.getJSON( "https://a.mapillary.com/v3/sequences/"+seqId+"?client_id="+clientId, function(geojson) {
        self.showImagesGeojson(geojson);

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
        extraArgs += "&start_time="+startDate.toISOString();
    }
    if (endDate !== null) {
        extraArgs += "&end_time="+endDate.toISOString();
    }
    var user = $(containerID+" .userField").val();
    if (user !== undefined && user.trim().length > 0) {
        extraArgs += "&usernames="+encodeURIComponent(user);
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

SequenceViewer.prototype.updateImagesForList = function() {
    var list_name = $('#listNames').val();
    var listJson = JSON.stringify({'lists' : [list_name], 'images' : null});
    var self = this;
    $.ajax({
        type: "POST",
        url: 'api/v0/getLists.py',
        data: listJson,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
    }).done(function(lists) {
        var images = [];
        $.each(lists, function(i, keyVal){
            var listName = keyVal[0];
            images.push({key: keyVal[1], user: keyVal[2], captured_at: keyVal[3]});
        });

        self.state.clearState();
        self.state.setValue('list', list_name);

        self.showImages(images);
        self.clearNextPrev(); //TODO: Next/prev not supported by lists yet.
        self.imagesLoaded();
     }).fail(function (){
        // TODO: Make proper error handling.
        console.log('fail');
    });
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
    
    var url = "https://a.mapillary.com/v3/images?client_id=" + clientId + "&bbox=" + max_lat + "," + max_lon + "," + min_lat + "," + min_lon + "&per_page=500&page=" + this.pageNo + extraArgs;
    
    this.state.clearState();
    this.setUrlArgsInState();
    this.state.setValue('page', this.pageNo);
    this.state.setValue('min_lat', min_lat);
    this.state.setValue('max_lat', max_lat);
    this.state.setValue('min_lon', min_lon);
    this.state.setValue('max_lon', max_lon);
    this.state.setValue('method', 'imagesOnMap');
    
    var self = this;
    $.getJSON(url, function(geojson, status, xhr) {
        self.showImagesGeojson(geojson);
        self.updateNextPrevFromHeaders(xhr);
        self.imagesLoaded();
    });
}

SequenceViewer.prototype.clearNextPrev = function() {
    $(".nextPrevBar").html('');
}

SequenceViewer.prototype.updateNextPrevFromHeaders = function(xhr) {
    var link = this.parseLinkHeader(xhr.getResponseHeader("Link"));
    //TODO: Use https://github.com/thlorenz/parse-link-header to parse instead.
    var self = this;
    var first = $("<button type=\"button\" class=\"btn btn-link\">First</button>").click(function () {
        self.pageNo = 0;
        self.updateSequenceFromMapillaryLink(link['first']);
        self.updateSequenceForMap();
    });
    $(".nextPrevBar").html(first);
    
    if (link['prev'] !== undefined) {
        var prev = $("<button type=\"button\" class=\"btn btn-link\">Previous</button>").click(function () {
            self.pageNo--;
            self.updateSequenceFromMapillaryLink(link['prev']);
            self.updateSequenceForMap();
        });
        $(".nextPrevBar").append(" - ").append(prev);
    } else {
        $(".nextPrevBar").append(" -&nbsp;&nbsp;Previous");
    }

    if (link['next'] !== undefined) {
        var next = $("<button type=\"button\" class=\"btn btn-link\">Next</button>").click(function () {
            self.pageNo++;
            self.updateSequenceFromMapillaryLink(link['next']);
            self.updateSequenceForMap();
        });
        $(".nextPrevBar").append(" - ").append(next);
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

// Thanks https://gist.github.com/niallo/3109252
SequenceViewer.prototype.parseLinkHeader = function(header) {
    if (header.length === 0) {
        throw new Error("input must not be of zero length");
    }

    // Split parts by comma
    var parts = header.split(',');
    var links = {};
    // Parse each part into a named link
    for(var i=0; i<parts.length; i++) {
        var section = parts[i].split(';');
        if (section.length !== 2) {
            throw new Error("section could not be split on ';'");
        }
        var url = section[0].replace(/<(.*)>/, '$1').trim();
        var name = section[1].replace(/rel="(.*)"/, '$1').trim();
        links[name] = url;
    }
    return links;
}

SequenceViewer.prototype.updateFromListState = function() {
    var list_name = this.state.getValue('list');
    
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

SequenceViewer.prototype.updateSequenceFromMapillaryLink = function(mapillary_url) {
    var self = this;
    $.getJSON(mapillary_url, function(geojson, status, xhr) {
        self.showImagesGeojson(geojson);
        self.updateNextPrevFromHeaders(xhr);
        self.imagesLoaded();
    });
}

SequenceViewer.prototype.updateSequence = function(min_lat, max_lat, min_lon, max_lon) {
    var extraArgs = this.getUrlArgsForOptions();
    var url = "https://a.mapillary.com/v3/sequences?client_id=" + clientId + "&bbox=" + max_lat + "," + max_lon + "," + min_lat + "," + min_lon + "&per_page=1&page=" + this.pageNo + extraArgs;
    
    this.state.clearState();
    this.setUrlArgsInState();
    this.state.setValue('page', this.pageNo);
    this.state.setValue('min_lat', min_lat);
    this.state.setValue('max_lat', max_lat);
    this.state.setValue('min_lon', min_lon);
    this.state.setValue('max_lon', max_lon);
    this.state.setValue('method', 'sequencesOnMap');
    
    var self = this;
    $.getJSON(url, function(geojson, status, xhr) {
        self.showImagesGeojson(geojson);
        self.updateNextPrevFromHeaders(xhr);
        self.imagesLoaded();
    });
}

SequenceViewer.prototype.populateListNames = function() {

    var getDisplayName = function(list_name) {
        if (list_name == '--favorites--global') {
            return 'Favorites (global)';
        } else if (list_name == '--upvotes--global') {
            return 'Upvotes (global)';
        } else if (list_name == '--downvotes--global') {
            return 'Downvotes (global)';
        } else if (list_name == '--favorites') {
            return 'Favorites';
        } else if (list_name == '--upvotes') {
            return 'Upvotes';
        } else if (list_name == '--downvotes') {
            return 'Downvotes';
        } else {
            return list_name;
        }
    }
    var self = this;
    window.login.whenLoggedIn(function(loggedIn) {
        var url = "api/v0/getListNames.py";
        $.getJSON(url, function(data) {
            $.each(data, function(index, list_name) {
                $("#listNames").append($('<option>', {
                    value: list_name,
                    text: getDisplayName(list_name)
                }));
            });
        });
    });
}
