import os
import os.path
import sys

EXTRA_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__)))
if EXTRA_DIR not in sys.path:
    sys.path.append(EXTRA_DIR)

import mapillary
import dao

class ListService:
    def __init__(self, mysql_dao):
        self.mysql_dao = mysql_dao
    def ensure_list(self, user, list_name):
        pass

class ImageService:
    def __init__(self, mysql_dao):
        self.mysql_dao = mysql_dao
        self.image_dao = dao.ImageDAO(mysql_dao)
    def ensure_image(self, mapillary_key):
        # Get Mapillary details
        m = mapillary.MapillaryRequest()
        image = m.get_image(mapillary_key)
        
        # Ensure image
        if 'code' in image and image['code'] == 'not_found':
            raise ImageNotFoundException("Image not found: "+str(mapillary_key))
    
        self.image_dao.ensure_image(mapillary_key, image['ca'], image['lat'], image['lon'], image['user'], image['captured_at'])
