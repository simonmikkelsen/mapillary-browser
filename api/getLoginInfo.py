 #!/usr/bin/env python

from wsgiref.simple_server import make_server
from cgi import parse_qs, escape

import sys
import json
import urllib
import httplib

EXTRA_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__)))
if EXTRA_DIR not in sys.path:
    sys.path.append(EXTRA_DIR)

try:
    import requests
except ImportError:
    print("requests not found - please run: pip install requests")
    sys.exit()

def application (environ, start_response):
