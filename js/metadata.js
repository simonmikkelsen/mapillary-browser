"use strict";
$(document).ready(function() {
    $('#showTagBox').click(function() {
        var show = $('#showTagBox').is(':checked');
        if (show) {
            var metadata = new MetaData();
            metadata.populateTags();
            $('.metaDataBox').show();
        } else {
            $('.tagPair').remove();
            $('.metaDataBox').hide();
        }
    });
    
});

function MetaData() {
    
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
            url: 'http://localhost:7788/browser/api/test2.py',
            data: data,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
        }).done(function() {
            $('.saveButton').parent().find('.spinner').show()
            $('.saveButton').hide()
            console.log('ok');
        }).fail(function (){
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

