"use strict";

$(document).ready(function() {
    $.getJSON("api/getLoginInfo.py", function(user) {
        console.log("user: ", user);
        if (user.loggedin) {
            $('#loginbar').html("<a href=\"api/logout.py\">Log out</a>");
            $('#loginicon').html("<a href=\"https://www.mapillary.com/app/user/"+user.username+"\" target=\"_blank\">"+user.username+" <img src=\""+user.avatar+"\" width=\"20\"></a>");
            window.login.setUsername(user.username);
            window.login.setLoggedIn(true);
        } else {
            window.login.setLoggedIn(false);
        }
        $('#loginbar').show();
    });
});



function Login() {
    this.loggedIn = false;
    this.loginStatusSet = false;
    this.username = undefined;
    this.onLoginStatusList = []
    this.onNextLoginAttemptList = []
}

Login.prototype.setLoggedIn = function(loggedIn) {
    this.loggedIn = loggedIn;
    this.loginStatusSet = true;
    
    var i;
    for (i = 0; i < this.onLoginStatusList.length; i++) {
        this.onLoginStatusList[i](loggedIn);
    }
    
    for (i = 0; i < this.onNextLoginAttemptList.length; i++) {
        this.onNextLoginAttemptList[i](loggedIn);
    }
    this.onNextLoginAttemptList = [];
}

Login.prototype.isLoggedIn = function() {
    return this.loggedIn;
}

Login.prototype.isLoginStatusSet = function(isSet) {
    return this.loginStatusSet;
}

Login.prototype.setUsername = function(name) {
    this.username = name;
}

Login.prototype.getUsername = function() {
    return this.username;
}

Login.prototype.onLoginStatus = function(func) {
    this.onLoginStatusList.push(func);
}

Login.prototype.onNextLoginAttempt = function(func) {
    this.onNextLoginAttemptList.push(func);
}

Login.prototype.whenLoggedIn = function(func) {
    if (this.isLoginStatusSet()) {
        func(this.isLoggedIn());
    } else {
        this.onNextLoginAttempt(func);
    }
}

window.login = new Login();
