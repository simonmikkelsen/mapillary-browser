
class DbConfig:
    def __init__(self):
        self.name = "mexplorer"
        self.host = "127.0.0.1"
        self.username = "root"
        self.password = "root"
    def getDatabase(self):
        return self.name
    def getHost(self):
        return self.host
    def getUsername(self):
        return self.username
    def getPassword(self):
        return self.password
class AppConfig:
    def __init__(self):
        self.base_uri = "http://localhost:7788/browser/"
    def getBaseUri(self):
        return self.base_uri
class MapillaryConfig:
    def __init__(self):
        self.client_id = "Y0NtM3R4Zm52cTBOSUlrTFAwWFFFQTplYTMzZTZiMmE0M2YxYTk0"
        self.redirect_uri = "http://localhost:7788/api"
    def getClientId(self):
        return self.client_id
    def getRedirectUri(self):
        return self.redirect_uri
