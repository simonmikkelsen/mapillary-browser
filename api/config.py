
class DbConfig:
    def __init__(self):
        self.name = "mexplorer"
        self.host = "127.0.0.1"
        self.username = "root"
        self.password = "root"
        # Set port to None for MySQL default.
        self.port = 3302
    def getDatabase(self):
        return self.name
    def getHost(self):
        return self.host
    def getUsername(self):
        return self.username
    def getPassword(self):
        return self.password
    def getPort(self):
        return self.port
class AppConfig:
    def __init__(self):
        self.base_uri = "http://devel:7788/browser/"
    def getBaseUri(self):
        return self.base_uri
class MapillaryConfig:
    def __init__(self):
        self.client_id = "Y0NtM3R4Zm52cTBOSUlrTFAwWFFFQTo5ZWMxNmYwNGYxNjY2YjA0"
        self.redirect_uri = "http://devel:7788/api"
    def getClientId(self):
        return self.client_id
    def getRedirectUri(self):
        return self.redirect_uri
