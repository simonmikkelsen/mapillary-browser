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

def get_list_contents(current_user, list_name):
    mysql = dao.MySQLDAO()
    list_dao = dao.ListDAO(mysql)
    return list_dao.get_list_contents(current_user, list_name)
    
        
def application(environ, start_response):
    # the environment variable CONTENT_LENGTH may be empty or missing
    try:
        request_body_size = int(environ.get('CONTENT_LENGTH', 0))
    except (ValueError):
        request_body_size = 0

    response_body = ""
    
    # TODO: Replace by a logged in user.
    current_user = "tryl"
    
    request_body = environ['wsgi.input'].read(request_body_size)
    args = json.loads(request_body)
    list_names = args['lists']
    
    list_contents = get_list_contents(current_user, list_names)
    response_body = json.dumps(list_contents)
    
    status = '200 OK'
    
    response_headers = [
        ('Content-Type', 'text/json'),
        ('Content-Length', str(len(response_body)))
    ]

    start_response(status, response_headers)
    return [response_body]

if __name__ == '__main__':
    print str(get_list_contents('tryl', ['--favorites', '--upvotes']))
    