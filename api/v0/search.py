#!/usr/bin/env python

from wsgiref.simple_server import make_server

import sys
import os
import json
import urlparse
import json

EXTRA_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__)))
if EXTRA_DIR not in sys.path:
    sys.path.append(EXTRA_DIR)

import dao

try:
    import requests
except ImportError:
    print("requests not found - please run: pip install requests")
    sys.exit()

def search(searchParams):
    mysql = dao.MySQLDAO()
    search_dao = dao.SearchDAO(mysql)
    return search_dao.search(searchParams)
    
        
def application (environ, start_response):
    # the environment variable CONTENT_LENGTH may be empty or missing
    try:
        request_body_size = int(environ.get('CONTENT_LENGTH', 0))
    except (ValueError):
        request_body_size = 0

    response_body = ""
    
    request_body = environ['wsgi.input'].read(request_body_size)
    searchParams = json.loads(request_body)
    result = search(searchParams)
    response_body = json.dumps(result)
    
    status = '200 OK'
    
    response_headers = [
        ('Content-Type', 'text/json'),
        ('Content-Length', str(len(response_body)))
    ]

    start_response(status, response_headers)
    return [response_body]

if __name__ == '__main__':
    print search([{'key': "t11", 'op': "equals", 'value': "v11"}])
