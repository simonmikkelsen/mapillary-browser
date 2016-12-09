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

try:
    import requests
except ImportError:
    print("requests not found - please run: pip install requests")
    sys.exit()

def add_tags(image_key, tags_user):
    # Get Mapillary details
    m = mapillary.MapillaryRequest()
    image = m.get_image(image_key)
    #image = json.loads('{"ca": 0, "lon": 9.48598333333333, "location": "", "key": "%s", "lat": 55.2427611111111, "captured_at": 1469725910000, "user": "hjart"}' % image_key)
    
    mysql = dao.MySQLDAO(user='root', password='root', host='127.0.0.1', database='mexplorer')
    image_dao = dao.ImageDAO(mysql)
    tag_dao = dao.TagDAO(mysql)
    
    # Ensure image
    if 'code' in image and image['code'] == 'not_found':
        #TODO: Handle image not found correctly.
        raise BaseException("Image not found: "+str(image_key))
    
    image_dao.ensure_image(image_key, image['ca'], image['lat'], image['lon'], image['user'], image['captured_at'])
    
    image_id = image_dao.get_image_id_by_key(image_key)
    
    # Delete missing tags from database
    tag_keys_from_user = set([t[0].decode("utf-8") for t in tags_user if len(t) > 0 and len(t[0]) > 0])
    tag_dao.delete_tags_not_in(image_id, tag_keys_from_user)
    
    # Add or update the rest.
    tag_dao.ensure_tags(image_id, tags_user)
    
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
    image_key = req_json['imageKey']
    response_body = str(req_json['tags']).encode('latin-1')
    add_tags(image_key, req_json['tags'])
    
    """
    If image not exists: Fetch data from Mapillary, create row. Fetch image for future quality analysis.
    Foreach tag:
        Create tag_rev entry.
        Create or update tag.
    """
    
    status = '200 OK'
    
    # Now content type is text/html
    response_headers = [
        ('Content-Type', 'text/json'),
        ('Content-Length', str(len(response_body)))
    ]

    start_response(status, response_headers)
    return [response_body]

if __name__ == '__main__':
    image_key = 'FRr1POpPYI6hsaclTBaVDQ'
    add_tags(image_key, {u'a1': u'v1', u'a2': u'v2'})
