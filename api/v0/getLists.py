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
import services
import config

try:
    import requests
except ImportError:
    print("requests not found - please run: pip install requests")
    sys.exit()

def get_list_contents(mysql, current_user, list_name):
    list_dao = dao.ListDAO(mysql)
    return list_dao.get_list_contents(current_user, list_name)
        
def strip_right(text, suffix):
    if not text.endswith(suffix):
        return text
    
    return text[:len(text)-len(suffix)]

def get_public_list_contents(mysql, list_names):
    list_names = [strip_right(name, "--global") for name in list_names]

    list_dao = dao.ListDAO(mysql)
    return list_dao.get_unified_list_contents(list_names)

def application(environ, start_response):
    # the environment variable CONTENT_LENGTH may be empty or missing
    try:
        request_body_size = int(environ.get('CONTENT_LENGTH', 0))
    except (ValueError):
        request_body_size = 0

    mysql = dao.MySQLDAO()
    userService = services.UserSessionService(mysql, environ)
    if userService.is_logged_in():
        current_user = userService.get_username()
    
    request_body = environ['wsgi.input'].read(request_body_size)
    args = json.loads(request_body)
    list_names = args['lists']

    c = config.AppConfig()
    if not userService.is_logged_in():
        # If not logged in: Only return the requested public lists.
        list_names = list(set().intersection(list_names, c.getPublicReadableLists()))

    # list_names - c.getPublicReadableLists()
    private_lists = list(set(list_names).difference(c.getPublicReadableLists()))
    public_lists = list(set(list_names).intersection(c.getPublicReadableLists()))
    #sys.stderr.write(";".join(c.getPublicReadableLists()) + "<---------------\n")
    
    list_contents = []
    if len(private_lists) > 0:
        list_contents += get_list_contents(mysql, current_user, private_lists)
    if len(public_lists) > 0:
        list_contents += get_public_list_contents(mysql, public_lists)

    return send_json_response(start_response, '200 OK', list_contents)
    
def send_json_response(start_response, status, response_data):
    response_body = json.dumps(response_data)
    response_headers = [
        ('Content-Type', 'text/json'),
        ('Content-Length', str(len(response_body)))
    ]

    start_response(status, response_headers)
    return [response_body]

if __name__ == '__main__':
    mysql = dao.MySQLDAO()
    print str(get_list_contents('tryl', ['--favorites', '--upvotes']))
    
