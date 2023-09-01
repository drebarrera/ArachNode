from model import commandcenter
from model import predict
from model import interpret
from util import with_aws
import os
import boto3
import tensorflow as tf

session = boto3.Session(profile_name='mfa')
s3 = session.client('s3')
bucket_name = 'arachnode-model'


class Model:
    def __init__(self, config):
        self.version = config['model-version']
        self.CommandCenter = commandcenter.CommandCenter(config['model-classifications'])
        self.PredictionGenerator = predict.PredictionGenerator(self, config['model-epochs'], config['model-batch-size'])
        self.Interpreter = interpret.Interpreter(self)
        self.model = None
        self.num_inputs = config['model-num-inputs']
        self.classes = config['model-classifications']
        self.optimizer = config['model-optimizer']
        self.lossf = config['model-lossf']
        self.metrics = config['model-metrics']
        self.file = f'''am-{self.version}-{self.optimizer}-{self.lossf}-{str(self.num_inputs)}-{str(len(self.classes))}'''
        self.features = {}
        self.overflow = 0
        self.capacity_exceeded = False

    def mock_load_model_from_s3(self):
        res = os.listdir('storage/model')
        if self.file in res:
            self.model = tf.keras.models.load_model('storage/model/' + self.file)
        else:
            self.model = None
        return

    def load_model_from_s3(self):
        res = s3.list_objects_v2(Bucket=bucket_name, Prefix='v' + self.version + '/')
        if self.file in res['Contents']:
            self.model = None
            #download and save model
            #self.model = tf.keras.models.load_model(model-src)
        else:
            self.model = None
        return

    def load(self):
        print('Loading ArachNode Model v' + self.version)
        #** with_aws(self.load_model_from_s3) # Load model from S3
        if self.model == None:
            self.model = tf.keras.Sequential([
                tf.keras.layers.Dense(128, activation='relu', input_shape=(self.num_inputs,)),
                tf.keras.layers.Dense(64, activation='relu'),
                tf.keras.layers.Dense(len(self.classes) - 1, activation='softmax')
            ])
        metrics = [exec(x.split('-')[1]) if len(x.split('-')) > 1 else x for x in self.metrics]
        self.model.compile(optimizer=self.optimizer, loss=self.lossf, metrics=metrics)
        self.PredictionGenerator.model = self.model
        return

    def train(self, data):
        data = self.CommandCenter.formatin(data)
        if data == None: return False
        return self.Interpreter.interpret(data, self.PredictionGenerator)

    def evaluate(self, data):
        data = self.CommandCenter.formatin(data)
        if data == None: return False
        return self.Interpreter.evaluate(self.metrics, self.PredictionGenerator)
        #return self.CommandCenter.formatout(result)