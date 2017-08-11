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
        port = c.getPort()
        self.cnx = mysql.connector.connect(user = user, password = password, host = host, database = database, port = port)
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
    def get_var_arg_format_strings(self, count):
        return ','.join(['%s'] * count)

class ListDAO:
    def __init__(self, dao):
        self.dao = dao
    def get_list_contents(self, current_user, list_names):
        format_strings = self.dao.get_var_arg_format_strings(len(list_names))
        sql = ("SELECT DISTINCT image_list.name, image.mapillary_key FROM image_list_item, image_list, user, image WHERE user.user = %s AND image_list.user = user.id AND"
               " image_list.name in ({list_replacements}) AND image_list_item.list = image_list.id AND image_list_item.image = image.id").format(list_replacements=format_strings)
        return self.dao.select(sql, (current_user,)+tuple(list_names))

    def get_unified_list_contents(self, list_names):
        format_strings = self.dao.get_var_arg_format_strings(len(list_names))
        sql = ("SELECT DISTINCT image_list.name, image.mapillary_key, COUNT(*) AS count FROM image_list_item, image_list, image WHERE image_list.name in ({list_replacements})"
            " AND image_list.public = 1 AND image_list_item.list = image_list.id AND image_list_item.image = image.id GROUP BY image_list.name, image.mapillary_key ORDER BY count").format(list_replacements=format_strings)
        return self.dao.select(sql, tuple(list_names))
        
    def ensure_list(self, user_name, list_name):
        sql = "INSERT IGNORE INTO image_list (name, user, public, locked) VALUES (%s, (SELECT id FROM user WHERE user.user = %s), %s, %s)"
        self.dao.execute(sql, (list_name, user_name, 1, 0))
    def ensure_on_list(self, user_name, list_name, mapillary_keys):
        if len(mapillary_keys) == 0:
            return
        format_strings = self.dao.get_var_arg_format_strings(len(mapillary_keys))
        sql = ("INSERT IGNORE INTO image_list_item (image, list) "
                 "SELECT image.id, image_list.id FROM image, user, image_list WHERE "
                 "image.mapillary_key IN ({list_replacements}) AND image_list.name = %s AND image_list.user = user.id AND user.user = %s").format(list_replacements=format_strings)
        self.dao.execute(sql, tuple(mapillary_keys) + (list_name, user_name))
    def ensure_off_list(self, user_name, list_name, mapillary_keys):
        if len(mapillary_keys) == 0:
            return
        format_strings = self.dao.get_var_arg_format_strings(len(mapillary_keys))
        sql = ("DELETE image_list_item FROM image_list_item "
                      "INNER JOIN image      ON image_list_item.image = image.id "
                      "INNER JOIN image_list ON image_list_item.list = image_list.id "
                      "INNER JOIN user       ON image_list.user = user.id "
                      "WHERE image.mapillary_key in ({list_replacements}) AND image_list.name = %s AND user.user = %s").format(list_replacements=format_strings)
        self.dao.execute(sql, tuple(mapillary_keys) + (list_name, user_name))
        
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

class UserDAO:
    def __init__(self, dao):
        self.dao = dao
    def ensure_user(self, session_id, mapillary_username, mapillary_user_key, mapillary_avatar):
        sql = 'INSERT INTO user (user, mapillary_key, avatar, sessionid) VALUES (%s, %s, %s, %s) ON DUPLICATE KEY UPDATE user = %s, mapillary_key = %s, avatar = %s, sessionid = %s'
        data_half = (mapillary_username, mapillary_user_key, mapillary_avatar, session_id)
        data = data_half + data_half
        self.dao.execute(sql, data)
        self.dao.commit()
    def get_user_by_session_id(self, session_id):
        sql = 'SELECT * FROM user WHERE sessionid = %s'
        return self.dao.select(sql, (session_id, ))
    def invalidate_session(self, session_id):
        sql = "UPDATE user SET sessionid = %s WHERE sessionid = %s"
        self.dao.execute(sql, ("", session_id))
        self.dao.commit()
class TagDAO:
    def __init__(self, dao):
        self.dao = dao
    def get_tags_for_image_key(self, image_key):
        sql = 'SELECT tag.id, tag.image, tag.keytext, tag.value FROM tag, image WHERE tag.image = image.id AND image.mapillary_key = %s'
        data = (image_key,)
        return self.dao.select(sql, data)

    def get_tags_for_image_keys(self, keys):
        format_strings = self.dao.get_var_arg_format_strings(len(keys))
        sql = "SELECT image.mapillary_key, tag.keytext, tag.value FROM image, tag WHERE image.mapillary_key in (%s) AND tag.image = image.id" % format_strings
        data = tuple(keys)
        return self.dao.select(sql, data)
        
    def delete_tags_not_in(self, image_id, keys):
        """ Deletes all tags which key is not in the given list."""
        format_strings = self.dao.get_var_arg_format_strings(len(keys))
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
