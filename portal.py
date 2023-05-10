import driver
from util import import_js
import os
import webbrowser
import time

class Portal:
    def __init__(self, driver:driver.Driver):
        self.driver = driver
    
    def ui(self):
        if not self.stage('stage_1'): return 0
        if not self.stage('stage_2'): return 0
        if not self.stage('stage_3'): return 0
        print('Portal UI generation success with on webpage "' + self.driver.url + '".')
        with open('temp/arachnode_web.html', 'w') as f:
            url = 'file://' + os.getcwd() + '/temp/arachnode_web.html'
            f.write(self.driver.src())
        webbrowser.open(url)
        return 1

    def stage(self, stage):
        arg = "" if stage != "stage_3" else "'" + self.driver.url + "'"
        if not self.driver.exec(import_js('arachnode_js/portal.js') + "\nreturn " + stage + "(" + arg + ");"): print('Error building arachnode on webpage "' + self.driver.url + '". Execution Failue: ' + stage); return 0
        if not self.driver.wait("//html[@data-arachnode-" + stage.replace('_', '-') + "='true']"): print('Error building arachnode on webpage "' + self.driver.url + '". Installation Failure: ' + stage); return 0
        return 1