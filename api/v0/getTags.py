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

def get_tags(image_keys):
    mysql = dao.MySQLDAO()
    tag_dao = dao.TagDAO(mysql)
    return tag_dao.get_tags_for_image_keys(image_keys)
    
        
def application(environ, start_response):
    # the environment variable CONTENT_LENGTH may be empty or missing
    try:
        request_body_size = int(environ.get('CONTENT_LENGTH', 0))
    except (ValueError):
        request_body_size = 0

    response_body = ""
    
    request_body = environ['wsgi.input'].read(request_body_size)
    keys = json.loads(request_body)
    tags = get_tags(keys)
    response_body = json.dumps(tags)
    
    status = '200 OK'
    
    response_headers = [
        ('Content-Type', 'text/json'),
        ('Content-Length', str(len(response_body)))
    ]

    start_response(status, response_headers)
    return [response_body]

if __name__ == '__main__':
    image_key = 'YqfCPKsmgXh40NPmI_wuEQ'
    print str(get_tags([image_key]))
    