"use strict";

$(document).ready(function() {
    $.getJSON("api/getLoginInfo.py", function(user) {
        console.log("user: ", user);
        if (user.loggedin) {
            $('#loginbar').html("<a href=\"https://www.mapillary.com/app/user/"+user.username+"\" target=\"_blank\">"+user.username+" <img src=\""+user.avatar+"\" width=\"20\"></a><br><a href=\"api/logout.py\">Log out</a>");
        }
        $('#loginbar').show();
    });
});
