#!/usr/bin/python

import json
import datetime
import sys

try:
    import requests
except ImportError:
    print("requests not found - please run: pip install requests")
    sys.exit()

class MapillaryRequest:
    """Makes requests to the Mapillary service."""
    # TODO: Put the client ID in a generic spot.
    def __init__(self, client_id = 'Y0NtM3R4Zm52cTBOSUlrTFAwWFFFQTo5OWYyZGMzYjY4ZGU3ZGZh'):
        self.client_id = client_id
    def get_sequence(self, key):
        return self.request('/s/%s' % key)
    def get_image(self, key):
        return self.request('/im/%s' % key)
    def request(self, request):
        if self.client_id == None or len(self.client_id) == 0:
            print "No client ID given."
            sys.exit(1)
        sepChar = '?'
        if request.find("?") != -1:
            sepChar = '&'
        r = requests.get('https://a.mapillary.com/v2%s%sclient_id=%s' % (request, sepChar, self.client_id))
        return r.json()
