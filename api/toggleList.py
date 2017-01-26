#!/usr/bin/env python

from wsgiref.simple_server import make_server

import sys
import os
import json
import urllib
import json

EXTRA_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__)))
if EXTRA_DIR not in sys.path:
    sys.path.append(EXTRA_DIR)

import mapillary
import dao
import services

try:
    import requests
except ImportError:
    print("requests not found - please run: pip install requests")
    sys.exit()

class ImageNotFoundException(Exception):
    pass
    
def toggle_on_list(user, listdata):
    mysql = dao.MySQLDAO()
    tag_dao = dao.TagDAO(mysql)
    list_dao = dao.ListDAO(mysql)
    
    image_service = services.ImageService(mysql)
    list_dao.ensure_list(user, listdata['list'])
    
    # Todo: If nessesary, make this method handle multiple images in one run.
    for image_key in listdata['on']:
        image_service.ensure_image(image_key)
    
    list_dao.ensure_on_list(user, listdata['list'], listdata['on'])
    list_dao.ensure_off_list(user, listdata['list'], listdata['off'])
    
    # Create rev table Remember rev.
    mysql.commit()

def application (environ, start_response):
    # the environment variable CONTENT_LENGTH may be empty or missing
    try:
        request_body_size = int(environ.get('CONTENT_LENGTH', 0))
    except (ValueError):
        request_body_size = 0

    response_body = ""
    
    request_body = environ['wsgi.input'].read(request_body_size)
    req_json = json.loads(request_body)
    
    response_body = json.dumps({'status':'ok'})
    try:
        toggle_on_list('tryl', req_json)
    except ImageNotFoundException as infe:
        response_body = json.dumps({'status':'error', 'cause':'image_not_found'})
    
    status = '200 OK'
    
    # Now content type is text/html
    response_headers = [
        ('Content-Type', 'text/json'),
        ('Content-Length', str(len(response_body)))
    ]

    start_response(status, response_headers)
    return [response_body]

if __name__ == '__main__':
    list_name = 'mylist2'
    image_key = 'FRr1POpPYI6hsaclTBaVDQ'
    user = 'tryl'
    toggle_on_list(user, {'list':list_name, 'on':[image_key], 'off':[image_key]})
