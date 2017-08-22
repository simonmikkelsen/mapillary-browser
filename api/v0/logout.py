#!/usr/bin/env python

from wsgiref.simple_server import make_server
from cgi import parse_qs, escape

import os
import os.path
import sys
import json
from Cookie import SimpleCookie

EXTRA_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__)))
if EXTRA_DIR not in sys.path:
    sys.path.append(EXTRA_DIR)

import dao
import config
import services

def application(environ, start_response):
    mysql = dao.MySQLDAO()
    userService = services.UserSessionService(mysql, environ)
    if userService.is_logged_in():
        user_dao = dao.UserDAO(mysql)
        user = user_dao.invalidate_session(userService.get_session_id())

    cookie = SimpleCookie()
    cookie['session'] = None
    cookie['session']['path'] = '/'
    
    a = config.AppConfig();
    url = a.getBaseUri()
    response_headers = [
        ('Location', url),
        ('Set-Cookie', cookie['session'].OutputString())
    ]
    status = '302 Moved Temporary'
    start_response(status, response_headers)
    response_body = ''
    return [response_body]
