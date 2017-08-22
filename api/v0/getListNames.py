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

try:
    import requests
except ImportError:
    print("requests not found - please run: pip install requests")
    sys.exit()

def get_list_names(mysql, current_user):
    list_dao = dao.ListDAO(mysql)
    list_list_names = list_dao.get_list_names(current_user)
    return [name[0] for name in list_list_names]

def application(environ, start_response):
    list_names = ['--favorites--global','--upvotes--global','--downvotes--global']

    mysql = dao.MySQLDAO()
    userService = services.UserSessionService(mysql, environ)
    if userService.is_logged_in():
        current_user = userService.get_username()
        list_names += get_list_names(mysql, current_user)
    return send_json_response(start_response, '200 OK', list_names)

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
    print str(get_list_names('tryl', ['--favorites', '--upvotes']))
