#!/usr/bin/env python

from wsgiref.simple_server import make_server
from cgi import parse_qs, escape

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

def get_list_contents(list_name):
    mysql = dao.MySQLDAO()
    list_dao = dao.ListDAO(mysql)
    return list_dao.get_unified_list_contents(list_name)
    
        
def application(environ, start_response):
    query_params = parse_qs(environ['QUERY_STRING'])
    # Add support for multiple lists if needed. Just add more than 1 to the list, then it works.
    list_name = query_params['list']
    
    list_contents = get_list_contents(list_name)
    response_body = json.dumps(list_contents)
    
    status = '200 OK'
    
    response_headers = [
        ('Content-Type', 'text/json'),
        ('Content-Length', str(len(response_body)))
    ]

    start_response(status, response_headers)
    return [response_body]

if __name__ == '__main__':
    print str(get_list_contents(['--favorites', '--upvotes']))
    