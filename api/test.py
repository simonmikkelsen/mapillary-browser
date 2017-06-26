#!/usr/bin/env python

from wsgiref.simple_server import make_server
from cgi import parse_qs, escape

import sys
import json
import urllib

try:
    import requests
except ImportError:
    print("requests not found - please run: pip install requests")
    sys.exit()

def application (environ, start_response):
    # Returns a dictionary in which the values are lists
    d = parse_qs(environ['QUERY_STRING'])
    
    #http://www.mapillary.com/connect?client_id=Y0NtM3R4Zm52cTBOSUlrTFAwWFFFQTo5OWYyZGMzYjY4ZGU3ZGZh&response_type=token&scope=user:email&redirect_uri=http:%2F%2Fzip.dk%2Fmapillary
    client_id = 'Y0NtM3R4Zm52cTBOSUlrTFAwWFFFQTo5OWYyZGMzYjY4ZGU3ZGZh'
    url = 'http://www.mapillary.com/connect?'+urllib.urlencode({'client_id':client_id, 'response_type':'token', 'scope':'user:email', 'state':'return', 'redirect_uri':'http://localhost:7788/browser'})
    #http://www.mapillary.com/connect?scope=user%3Aread&state=return&redirect_uri=http%3A%2F%2Flocalhost%3A7788%2Ftest.py&response_type=token&client_id=Y0NtM3R4Zm52cTBOSUlrTFAwWFFFQTo5ODcxYTgzMTgzNzVhMTNi
    if len(environ['QUERY_STRING']) == 0:
        response_headers = [
            ('Location', url)
        ]
        status = '302 Moved Temporary'
        start_response(status, response_headers)
        response_body = ''
        return [response_body]
    
    #r = requests.get('https://a.mapillary.com/v2%s%sclient_id=%s' % (request, sepChar, self.client_id))
    #r.json()
    
    status = '200 OK'
    response_body = "hello world: "+environ['QUERY_STRING']
    response_body = str(d)
    
    # Now content type is text/html
    response_headers = [
        ('Content-Type', 'text/plain'),
        ('Content-Length', str(len(response_body)))
    ]

    start_response(status, response_headers)
    return [response_body]
 