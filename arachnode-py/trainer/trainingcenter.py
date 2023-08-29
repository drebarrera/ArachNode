import boto3
from util import with_aws
from util import parse_json
from util import import_file
import os

session = boto3.Session(profile_name='mfa')
s3 = session.client('s3')
bucket_name = 'arachnode-corpus'

class TrainingCenter:
  def __init__(self, version):
    self.version = version
    self.files = set()
    self.trained = set()
    self.data = list()

  def mock_update_files(self, filenum=-1):
    res = os.listdir('mock-data')
    if filenum == -1:
      for obj in res:
        self.files.add(obj)
    else: self.files.add(res[filenum])

  def mock_get_training_data(self, filename):
    return import_file('mock-data/' + filename)

  def update_files(self):
    # update self.trained
    res = s3.list_objects_v2(Bucket=bucket_name, Prefix='v' + self.version + '/')
    for obj in res['Contents']:
      self.files.add(obj['Key'])

  def update_trained(self):
    pass

  def get_training_data(self, filename):
    res = s3.get_object(Bucket=bucket_name, Key=filename)
    data = res['Body'].read().decode('utf-8')
    return data

  # Function: parse_search
  # Retrieves data from a training data file and returns a Search object.
  def parse_search(self, search):
    #** data = parse_json(with_aws(self.get_training_data, file)) # Parse JSON file from S3
    data = parse_json(self.mock_get_training_data(search.file)) # Parse JSON file from S3
    e_assert = False
    # Iterate over data object and populate Search object
    for d in data:
      separator = d.find(': ') + 2
      event = d[:separator].replace(': ', '')
      details = d[separator:]
      if event == "Search intention changed to": search.intention = details
      elif event == "URL changed" and not e_assert: search.base_url = details
      elif event == "URL changed": search.actions.append({"type": "URL_CHANGE", "content": details})
      elif event == "Element asserted" and details != 'null':
        e_assert = True
        details = parse_json(details)
        search.actions.append({"type": details[0]['type'], "content": details[1:]}) # Extract assertion type and element
      else: pass #s.actions.append(details)
    return search