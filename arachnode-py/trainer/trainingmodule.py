from trainer import trainingcenter
from webdriver import WebDriver
from util import with_aws
from webdriver import SEARCH

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
  def __init__(self, config, model):
    driver_args = {x[7:]: config[x] for x in config if x.split('_')[0] == 'driver' and config[x] != None}
    self.TrainingCenter = trainingcenter.TrainingCenter(config['version'])
    self.Driver = WebDriver(config['default_url'], **driver_args)
    self.Driver.new_driver()
    self.Model = model
    self.arachnode_js = config['arachnode_js']

  def update_trained(self, file, index, success):
    if file in self.TrainingCenter.trained:
      self.TrainingCenter.trained[file][index] = success
    else:
      self.TrainingCenter.trained[file] = {index: success}
    return

  # Function: train
  # 
  def train(self):
    with_aws(self.TrainingCenter.update_files) # Update training files from S3
    #** self.TrainingCenter.mock_update_files() # Update training files from S3
    for file in self.TrainingCenter.files.difference(self.TrainingCenter.trained):
      print('Operating on file', file)
      search = SEARCH(file, self.Driver)
      search = self.TrainingCenter.parse_search(search, file)
      while not search.rollover:
        search.iterate()
        if search.rollover: break
        Data = search.verify(self.arachnode_js)
        if Data == None: 
          print('Failed to train on', file + ":" + str(search.current), '- No Action Type')
          break
        success = self.Model.train(Data)
        if not success:
          print('Failed to train on', file + ":" + str(search.current), '-', search.actions[search.current]['type'])
        self.update_trained(file, search.current, success)
    return self.TrainingCenter.trained

  def __del__(self):
    del self.Driver
      