
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
    