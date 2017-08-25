#!/usr/bin/python

import json
import datetime
import sys
import os

try:
    import requests
except ImportError:
    print("requests not found - please run: pip install requests")
    sys.exit()

EXTRA_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__)))
if EXTRA_DIR not in sys.path:
    sys.path.append(EXTRA_DIR)

import config

class MapillaryRequest:
    """Makes requests to the Mapillary service."""
    def __init__(self, client_id = None):
        mc = config.MapillaryConfig()
        self.client_id = mc.getClientId()
    def get_sequence(self, key):
        return self.request('/sequences/%s' % key)
    def get_image(self, key):
        return self.request('/images/%s' % key)
    def request(self, request):
        if self.client_id == None or len(self.client_id) == 0:
            print "No client ID given."
            sys.exit(1)
        sepChar = '?'
        if request.find("?") != -1:
            sepChar = '&'
        url = 'https://a.mapillary.com/v3%s%sclient_id=%s' % (request, sepChar, self.client_id)
        r = requests.get(url)
        return r.json()
