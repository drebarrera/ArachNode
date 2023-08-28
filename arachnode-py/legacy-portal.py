import driver
from util import import_js
import os
import webbrowser
import httpsocket
import socket

class Portal:
    def __init__(self, driver:driver.Driver, relevance_depth):
        self.driver = driver
        self.relevance_depth = relevance_depth
    
    def ui(self):
        if not self.stage('stage_1'): return 0
        if not self.stage('stage_2'): return 0
        if not self.stage('stage_3'): return 0
        print('Portal UI generation success with on webpage "' + self.driver.url + '".')
        with open('temp/arachnode_web.html', 'w') as f:
            url = 'file://' + os.getcwd() + '/temp/arachnode_web.html'
            f.write(self.driver.src())
        self.driver.stop()
        webbrowser.open(url)
        data = None
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', 8000))
            s.listen(1)
            conn, addr = s.accept()
            with conn:
                print('Connected by', addr)
                data = conn.recv(4096)
                print(data)
                if data: conn.sendall(b'Data received.')
        
        #socket = httpsocket.HTTPSocket(8000)
        #data = socket.start()
        #del socket
        #print(socket)
        return 1

    def stage(self, stage):
        arg = "" if stage != "stage_3" else "'" + self.driver.url + "', '" + str(self.relevance_depth) + "'"
        if not self.driver.exec(import_js('arachnode_js/portal.js') + "\nreturn " + stage + "(" + arg + ");"): print('Error building arachnode on webpage "' + self.driver.url + '". Execution Failue: ' + stage); return 0
        if not self.driver.wait("//html[@data-arachnode-" + stage.replace('_', '-') + "='true']"): print('Error building arachnode on webpage "' + self.driver.url + '". Installation Failure: ' + stage); return 0
        return 1