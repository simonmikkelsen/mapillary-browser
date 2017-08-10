#!/usr/bin/env python

from wsgiref.simple_server import make_server
from cgi import parse_qs, escape

import os
import os.path
import sys
import json

EXTRA_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__)))
if EXTRA_DIR not in sys.path:
    sys.path.append(EXTRA_DIR)

import config
import dao
import services

try:
    import requests
except ImportError:
    print("requests not found - please run: pip install requests")
    sys.exit()

def application(environ, start_response):
    response = {}
    response['loggedin'] = False
    mysql = dao.MySQLDAO()

    userService = services.UserSessionService(mysql, environ)
    if userService.is_logged_in():
        response['loggedin'] = True
        response['username'] = userService.get_username()
        response['avatar'] = userService.get_avatar()
        
    response_body = json.dumps(response)
    
    status = '200 OK'
    
    response_headers = [
        ('Content-Type', 'text/json'),
        ('Content-Length', str(len(response_body)))
    ]

    start_response(status, response_headers)
    return [response_body]
