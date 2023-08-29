from trainer import trainingcenter
from webdriver import WebDriver
from util import with_aws
from webdriver import Search

##########################################################################
# Class: TrainingModule
# Responsible for training the Model by loading training files, verifying 
# elements with the web driver, and sending clean data and validation to 
# the Model.
#
# Driver: Web Driver responsible for making web requests.
# Training Center: Controls training state
# Model: The model being trained - stored in S3
###########################################################################
class TrainingModule:
  def __init__(self, config):
    driver_args = {x[7:]: config[x] for x in config if x.split('_')[0] == 'driver' and config[x] != None}
    self.Driver = WebDriver(config['default_url'], **driver_args)
    self.Driver.new_driver()
    self.TrainingCenter = trainingcenter.TrainingCenter(config['version'])
    self.arachnode_js = config['arachnode_js']

  # Function: train
  # 
  def train(self):
    #** with_aws(self.TrainingCenter.update_files()) # Update training files from S3
    self.TrainingCenter.mock_update_files(0) # Update training files from S3
    for file in self.TrainingCenter.files.difference(self.TrainingCenter.trained):
      print('Operating on file', file)
      search = Search(file, self.Driver)
      search = self.TrainingCenter.parse_search(search)
      while search.current < len(search.actions):
        search.verify(self.arachnode_js)
        search.iterate()

  def __del__(self):
    del self.Driver
      