import os
import os.path
import sys

from Cookie import SimpleCookie

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

class UserSessionService:
    def __init__(self, mysql, environ):
        self.mysql = mysql
        self.environ = environ

        self.logged_in = False
        self.username = None
        self.avatar = None
        self.session_id = None
        
        if not 'HTTP_COOKIE' in environ:
            return
            
        cookie = SimpleCookie(environ['HTTP_COOKIE'])
        if not 'session' in cookie:
            return
            
        session_id = cookie['session'].value
        user_dao = dao.UserDAO(self.mysql)
        user = user_dao.get_user_by_session_id(session_id)
        if len(user) == 0:
            return
            
        self.logged_in = True
        self.username = user[0][1]
        self.avatar = user[0][2]
        # Use the session ID from the database and not the browser - just in case.
        self.session_id = user[0][3]

    def is_logged_in(self):
        return self.logged_in
    def get_username(self):
        return self.username
    def get_avatar(self):
        return self.avatar
    def get_session_id(self):
        return self.session_id
    
