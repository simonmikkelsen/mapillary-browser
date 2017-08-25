#!/usr/bin/env python

from wsgiref.simple_server import make_server
from cgi import parse_qs, escape

import os
import os.path
import sys
import json
import urllib
import httplib
from Cookie import SimpleCookie
import string
import random

EXTRA_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__), ".."))
if EXTRA_DIR not in sys.path:
    sys.path.append(EXTRA_DIR)

import config
import dao

try:
    import requests
except ImportError:
    print("requests not found - please run: pip install requests")
    sys.exit()

def application(environ, start_response):
    # Returns a dictionary in which the values are lists
    query_params = parse_qs(environ['QUERY_STRING'])
    
    m = config.MapillaryConfig()
    client_id = m.getClientId()
    redirect_uri = m.getRedirectUri()
    
    # If this is the first call to the script: Redirect the user to log in.
    if len(environ['QUERY_STRING']) == 0:
        url = 'http://www.mapillary.com/connect?'+urllib.urlencode({'client_id':client_id, 'response_type':'token', 'scope':'user:read', 'state':'return', 'redirect_uri':redirect_uri})
        response_headers = [
            ('Location', url)
        ]
        status = '302 Moved Temporary'
        start_response(status, response_headers)
        response_body = ''
        return [response_body]
    
    # We should have gotten an access token from Mapillary. Now get user info.
    access_token = query_params['access_token'][0]
    url = "/v3/me?client_id=" + client_id + "&token=" + access_token
    h = httplib.HTTPSConnection('a.mapillary.com')
    h.request('GET', url)
    r = h.getresponse()
    resp = r.read()
    userinfo = json.loads(resp)
    
    mysql = dao.MySQLDAO()
    user_dao = dao.UserDAO(mysql)
    
    # TODO: Handle we dont get a user.
    sessionid = ''.join(random.SystemRandom().choice(string.ascii_letters + string.digits) for _ in range(32))
    user_dao.ensure_user(sessionid, userinfo['username'], userinfo['key'], userinfo['avatar'])

    cookie = SimpleCookie()
    cookie['session'] = sessionid
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
