"use strict";
$(document).ready(function() {
    var metadata = new MetaData();
    $('#showTagBox').click(function() {
        var show = $('#showTagBox').is(':checked');
        if (show) {
            metadata.populateTags();
            $('.metaDataBox').show();
        } else {
            $('.tagPair').remove();
            $('.metaDataBox').hide();
        }
    });
    
    $('#searchForm .addButton').click(function(){
        metadata.addSearchParameter();
    });
    metadata.addSearchParameter();
    
    window.seqViewer.addUnveilListener(function(image) {
        var imageBox = $(image).parents('.imageBox');
        var mapillary_key = imageBox.find('.imageKey').val();
        metadata.imageUnveiled(mapillary_key);
        
        // Toggle favorite.
        $(imageBox).find('.favorite').css('cursor', 'pointer').click(function(d){
                var target = $(d.target);
                if (target.hasClass('selected')) {
                    metadata.removeFromList(mapillary_key, '--favorites');
                    target.removeClass('selected');
                } else {
                    metadata.addToList(mapillary_key, '--favorites');
                    target.addClass('selected');
                }
        });
        // Upvote + remove downvote.
        $(imageBox).find('.up').css('cursor', 'pointer').click(function(d){
                var target = $(d.target);
                if (target.hasClass('selected')) {
                    metadata.removeFromList(mapillary_key, '--upvotes');
                    target.removeClass('selected');
                } else {
                    metadata.addToList(mapillary_key, '--upvotes');
                    metadata.removeFromList(mapillary_key, '--downvotes');
                    target.addClass('selected');
                    target.parent().find('.down').removeClass('selected');
                }
        });
        // Downvote + remove upvote.
        $(imageBox).find('.down').css('cursor', 'pointer').click(function(d){
                var target = $(d.target);
                if (target.hasClass('selected')) {
                    metadata.removeFromList(mapillary_key, '--downvotes');
                    target.removeClass('selected');
                } else {
                    metadata.addToList(mapillary_key, '--downvotes');
                    metadata.removeFromList(mapillary_key, '--upvotes');
                    target.addClass('selected');
                    target.parent().find('.up').removeClass('selected');
                }
        });
    });
    
    $('#searchForm .searchButton').click(function(){
        var searchParameters = [];
        $(this).parent().find('.searchParam').each(function(i, searchParam){
            var key = $(searchParam).find('.key').val();
            var operator = $(searchParam).find('.operator').val();
            var value = $(searchParam).find('.value').val();
            if (key === "" || value === "") {
                return;
            }
            searchParameters.push({'key':key, 'op':operator, 'value':value});
        });
        
        var searchJson = JSON.stringify(searchParameters);
        $.ajax({
            type: "POST",
            url: 'http://localhost:7788/browser/api/search.py',
            data: searchJson,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
        }).done(function(imageKeys) {
            $('.searchButton').parent().find('.spinner').show();
            $('.searchButton').hide();
            window.seqViewer.showImagesByKeys(imageKeys);
        }).fail(function (){
            // TODO: Make proper error handling.
            console.log('fail');
        }).always(function(){
            $('.searchButton').parent().find('.spinner').hide();
            $('.searchButton').show();
        });
    });
    
});

/**
 * @param triggerFunction the function that must be called on triggering. It must accept an array
 * of the data given to the add() function.
 * A trigger function could fetch the data it is given and perhaps.
 */
function BatchTrigger(triggerFunction) {
    // Let a request be at most this number of milliseconds in the queue before triggering.
    this.triggerMS = 200;
    
    // When the queue gets this size, trigger no matter the time. The whole queue is triggered.
    this.triggerQueueSize = 100;
    
    this.triggerFunction = triggerFunction;
    
    this.data = [];
    
    this.settimeoutRunning = false;
    this.oldestDataEntry = -1;
}

BatchTrigger.prototype.trigger = function() {
    this.oldestDataEntry = -1;
    this.triggerFunction(this.data);
    this.data = [];
}

BatchTrigger.prototype.add = function(dataUnit) {
    this.data.push(dataUnit);
    if (this.oldestDataEntry < 0) {
        this.oldestDataEntry = Date.now();
    }
    
    this.evaluateTrigger();
}

BatchTrigger.prototype.evaluateTrigger = function() {
    if (this.data.length >= this.triggerQueueSize) {
        this.trigger();
    } else {
        this.settimeoutRunning = true;
        self = this;
        window.setTimeout(function(){
                this.settimeoutRunning = false;
                // If triggered due to another reason while we waited, skip doing it now and try later.
                if (self.oldestDataEntry >= 0 && Date.now() - self.oldestDataEntry >= self.triggerMS) {
                    self.trigger();
                } else if (! self.settimeoutRunning) {
                    self.evaluateTrigger();
                }
                
        }, this.triggerMS);
    }
}

function MetaData() {
    this.up = [];
    this.down = [];
    this.fav = [];
    
    var self = this;
    this.batchTrigger = new BatchTrigger(function(data){
        self.triggerBatchUpdate(data);
    });
}

MetaData.prototype.removeFromList = function(mapillary_key, listName) {
    this.ensureListStatus([], [mapillary_key], listName)
}

MetaData.prototype.addToList = function(mapillary_key, listName) {
    this.ensureListStatus([mapillary_key], [], listName)
}

MetaData.prototype.ensureListStatus = function(keysOnList, keysOffList, listName) {
   var listJson = JSON.stringify({'list':listName, 'on':keysOnList, 'off':keysOffList});
   var self = this;
   $.ajax({
       type: "POST",
       url: 'http://localhost:7788/browser/api/toggleList.py',
       data: listJson,
       contentType: "application/json; charset=utf-8",
       dataType: "json",
   }).done(function(status) {
       console.log("Done", status);
    }).fail(function (){
        // TODO: Make proper error handling.
        console.log('fail');
    });
}

MetaData.prototype.imageUnveiled = function(mapillary_key) {
    this.batchTrigger.add(mapillary_key);
}

MetaData.prototype.triggerBatchUpdate = function(data) {
   var listJson = JSON.stringify({'lists' : ['--favorites', '--upvotes', '--downvotes'], 'images' : data});
   var self = this;
   $.ajax({
       type: "POST",
       url: 'http://localhost:7788/browser/api/getLists.py',
       data: listJson,
       contentType: "application/json; charset=utf-8",
       dataType: "json",
   }).done(function(lists) {
       $.each(lists, function(i, keyVal){
           var action = keyVal[0];
           var key = keyVal[1];
           if (action === "--upvotes") {
               self.addUp(key);
           } else if  (action === "--downvotes") {
               self.addDown(key);
           } else if  (action === "--favorites") {
               self.addFavorite(key);
           } else {
              console.log("Not on list", key); 
           }
        });
    }).fail(function (){
        // TODO: Make proper error handling.
        console.log('fail');
    });
}

MetaData.prototype.addFavorite = function(mapillary_key) {
    this.fav.push(mapillary_key);
    //.removeClass('glyphicon-heart-empty').addClass('glyphicon-heart')
    $('.imageKey[value='+mapillary_key+']').closest('.imageBox').find('.favorite').addClass('selected');
}

MetaData.prototype.addUp = function(mapillary_key) {
    this.up.push(mapillary_key);
    $('.imageKey[value='+mapillary_key+']').closest('.imageBox').find('.up').addClass('selected');
    console.log("Add up", mapillary_key);
}

MetaData.prototype.addDown = function(mapillary_key) {
    this.down.push(mapillary_key);
    $('.imageKey[value='+mapillary_key+']').closest('.imageBox').find('.down').addClass('selected');
}

MetaData.prototype.addSearchParameter = function() {
    var template = $('#searchParamTemplate');
    var searchParam = template.clone();
    searchParam.removeAttr('id');
    $('#searchForm .searchButton').before(searchParam);
}

MetaData.prototype.renderTagPair = function(key, value) {
    var keyTag = $('<input type="text" name="key" class="key">').attr('value', key);
    var valTag = $('<input type="text" name="value" class="value">').attr('value', value);
    var removeButton = $('<button type="button" class="btn btn-default glyphicon glyphicon-remove removeButton"></button>').click(function(){
        $(this).parent().remove();
    });
    return $('<div class="tagPair">').append(keyTag).append(valTag).append(removeButton);
}

MetaData.prototype.addTagPair = function(mapillary_key, tagPair) {
    $('[value="'+mapillary_key+'"]').parent().find('.saveButton').before(tagPair);
}

MetaData.prototype.populateTags = function() {
    // Get tags for all images.
    var keys = [];
    $.each($('.imageKey'), function(i, v) {
        keys[keys.length] = $(v).val();
    });
    
    var self = this;
    $.ajax({
        type: "POST",
        url: 'http://localhost:7788/browser/api/getTags.py',
        data: JSON.stringify(keys),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
    }).done(function(keys) {
        $.each(keys, function(i, entry){
            var mapillary_key = entry[0];
            var key = entry[1];
            var value = entry[2];
            var tagPair = self.renderTagPair(key, value);
            self.addTagPair(mapillary_key, tagPair);
        });
    }).fail(function (){
        console.log('fail');
    }).always(function(){
        // TODO: Remove spinner.
    });
    
}

MetaData.prototype.getTagData = function(button) {
    var tagPairs = button.parent().find('.tagPair');
    var data = {};

    $(tagPairs).each(function(i, pair){
        var key = $(pair).find('.key').val();
        var value = $(pair).find('.value').val();
        data[key] = value;
    });
    
    var imageKey = button.parent().find('.imageKey').val();
    
    return JSON.stringify({tags : data, imageKey : imageKey});
}

MetaData.prototype.buttonsAdded = function(prefix) {
    var self = this;
    $('.saveButton').click(function() {
        var button = $(this);
        var data = self.getTagData(button);
        $.ajax({
            type: "POST",
            url: 'http://localhost:7788/browser/api/saveTags.py',
            data: data,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
        }).done(function() {
            $('.saveButton').parent().find('.spinner').show()
            $('.saveButton').hide()
            console.log('ok');
        }).fail(function (){
            // TODO: Make proper error handling.
            console.log('fail');
        }).always(function(){
            $('.saveButton').parent().find('.spinner').hide()
            $('.saveButton').show()
        });
    });
    
    $('.addButton').click(function(){
        var button = $(this);
        button.parent().find('.saveButton').before(self.renderTagPair("", ""));
    });
}

