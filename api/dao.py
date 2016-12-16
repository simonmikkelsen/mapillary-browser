#!/usr/bin/env python

import os.path
import sys
import mysql.connector

EXTRA_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__)))
if EXTRA_DIR not in sys.path:
    sys.path.append(EXTRA_DIR)

import config

class MySQLDAO:
    def __init__(self):
        c = config.DbConfig()
        user = c.getUsername()
        password = c.getPassword()
        host = c.getHost()
        database = c.getDatabase()
        self.cnx = mysql.connector.connect(user = user, password = password, host = host, database = database)
        self.cursor = self.cnx.cursor()
    def close(self):
        self.cursor.close()
        self.cursor = None
        self.cnx.close()
        self.cnx = None
    def __del__(self):
        self.close()
    def select(self, query, data):
        self.cursor.execute(query, data)
        as_bytearrays = self.cursor.fetchall()
        as_utf8 = []
        # MySQL returns strings as bytearrays: Decode them as utf-8.
        for b in as_bytearrays:
            t = tuple()
            for entry in b:
                if type(entry) is bytearray:
                    t = t + (entry.decode('utf-8'),)
                else:
                    t = t + (entry,)
            as_utf8.append(t)
        return as_utf8
    def commit(self):
        self.cnx.commit()
    def execute(self, query, data):
        self.cursor.execute(query, data)
        return self.cursor.lastrowid

class SearchDAO:
    def __init__(self, dao):
        self.dao = dao
    def search(self, params):
        # Example of params: [{key: "somekey", op: "equals", value: "somevalue"}]
        sql = "SELECT DISTINCT image.mapillary_key FROM tag, image WHERE tag.image = image.id"
        data = []
        sql_params = ""
        for p in params:
            key = p['key']
            operator = self.get_operator_by_string(p['op'])
            value = p['value']
            if not self.is_search_param_useable(key, operator, value):
                continue
            if operator.endswith('like'):
                value = '%' + value + '%'
            data += [key, value]
            sql_params = " AND tag.keytext = %s AND tag.value " + operator + " %s"
        sql += sql_params
        return self.dao.select(sql, tuple(data))
        
            
    def is_search_param_useable(self, key, operator, value):
        return len(key.strip()) > 0 and operator != None and len(value.strip()) > 0
    def get_operator_by_string(self, operator):
        if operator == "equals":
            return "="
        elif operator == "contains":
            return "like"
        elif operator == "<":
            return "<"
        elif operator == ">":
            return ">"
        elif operator == "not equals":
            return "!="
        elif operator == "not contains":
            return "not like"
        else:
            return None
        
        
class ImageDAO:
    def __init__(self, dao):
        self.dao = dao
    def ensure_image(self, imageKey, ca, lat, lon, username, captured_at):
        sql = 'INSERT INTO image (mapillary_key, ca, lat, lon, username, captured_at) VALUES (%s, %s, %s, %s, %s, FROM_UNIXTIME(%s)) ON DUPLICATE KEY UPDATE mapillary_key = %s, ca = %s, lat = %s, lon = %s, username = %s, captured_at = FROM_UNIXTIME(%s)'
        data_half = (imageKey, ca, lat, lon, username, (captured_at / 1000))
        data = data_half + data_half
        self.dao.execute(sql, data)
    def get_image_id_by_key(self, image_key):
        sql = "SELECT id FROM image WHERE mapillary_key = %s"
        data = (image_key,)
        id = self.dao.select(sql, data)
        if len(id) > 0:
            return id[0][0]
        else:
            return None

class TagDAO:
    def __init__(self, dao):
        self.dao = dao
    def get_tags_for_image_key(self, image_key):
        sql = 'SELECT tag.id, tag.image, tag.keytext, tag.value FROM tag, image WHERE tag.image = image.id AND image.mapillary_key = %s'
        data = (image_key,)
        return self.dao.select(sql, data)

    def get_tags_for_image_keys(self, keys):
        format_strings = ','.join(['%s'] * len(keys))
        sql = "SELECT image.mapillary_key, tag.keytext, tag.value FROM image, tag WHERE image.mapillary_key in (%s) AND tag.image = image.id" % format_strings
        data = tuple(keys)
        return self.dao.select(sql, data)
        
    def delete_tags_not_in(self, image_id, keys):
        """ Deletes all tags which key is not in the given list."""
        format_strings = ','.join(['%s'] * len(keys))
        #                                    This %s is inserted litterally to be replaced by image_id by the MySQL driver.
        #                                                                 This %s will be replaced by format_strings which are the keys. These are also replaced by data in MySQL.
        sql = "DELETE from tag WHERE image = %s" + (" AND keytext NOT IN (%s)" % format_strings)
        data = (image_id,) + tuple(keys)
        self.dao.execute(sql, data)
    def ensure_tags(self, image_id, tags):
        """Makes sure the given tags exists for the given image. They are created or updated depending on their existence."""
        # Create a (%s,%s,%s) for each tag to be inserted into the SQL. This is PYTHON string manipulation and data must NEVER EVER be added to SQL in this way.
        # The %s in this string are used by MySQL as placeholders.
        format_strings = ','.join(['(%s, %s, %s)'] * len(tags))
        
        # The %s in this string is used to insert the format_strings variable which contains e.g. (%s,%s,%s),(%s,%s,%s) if there are 2 tags.
        sql = "INSERT INTO tag (tag.image, tag.keytext, tag.value) VALUES %s ON DUPLICATE KEY UPDATE tag.value = VALUES(tag.value)" % format_strings
        
        # Add the image ID as the first argument to each touple and make the list flat.
        flat_tag_list = ()
        for key in tags:
            flat_tag_list += (image_id, key, tags[key])
        
        #Execute and let MySQL join SQL and data properly.
        self.dao.execute(sql, flat_tag_list)
