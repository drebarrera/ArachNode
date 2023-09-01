import re
import numpy as np

class Interpreter:
    def __init__(self, model):
        self.Model = model

    def process_type(self, q):
        if type(q) == float or type(q) == int or (type(q) == str and bool(re.fullmatch(r'\d+\.*\d*', q))):
            if type(q) == str: fq = float(re.fullmatch(r'\d+\.*\d*', q).group())
            else: fq = float(q)
            ftype = 'quantity'
        else:
            ftype = 'quality'
            fq = q
        return (ftype, fq)
        
    def clean_data(self, data):
        train = [0 for x in range(self.Model.num_inputs)]
        # Add new features to feature set
        for feature in data.features:
            fnum = -1
            if len(self.Model.features) >= self.Model.num_inputs and not self.Model.capacity_exceeded:
                self.Model.capacity_exceeded = True
                print('Alert: Capacity exceeded. All new features will be lost.')
            if feature in self.Model.features:
                fnum = self.Model.features[feature]['fnum']
                ftype = self.Model.features[feature]['ftype']
                (dftype, dfq) = self.process_type(data.features[feature])
                if dftype != ftype: 
                    print('Alert: Feature', feature, 'rejected. Feature types do not match:', ftype, '!=', dftype, 'for', dfq)
                    continue
                if ftype == 'quality' and dfq not in self.Model.features[feature]['fq']:
                    fq = len(list(self.Model.features.keys()))
                    self.Model.features[feature]['fq'][dfq] = fq
                elif ftype == 'quality':
                    fq = self.Model.features[feature]['fq'][dfq]
                else:
                    fq = dfq
            elif not self.Model.capacity_exceeded:
                fnum = len(list(self.Model.features.keys()))
                (dftype, dfq) = self.process_type(data.features[feature])
                if dftype == 'quantity':
                    self.Model.features[feature] = {'fnum': fnum, 'ftype':dftype, 'fq': None}
                    fq = dfq
                else:
                    self.Model.features[feature] = {'fnum': fnum, 'ftype':dftype, 'fq': {dfq: 1.0}}
                    fq = 1.0
            else:
                self.Model.overflow += 1
            if fnum != -1 or fnum != None: 
                train[fnum] = fq

        return train

    def interpret(self, data, predictor):
        train = self.clean_data(data)
        print('Training on', len([x for x in train if type(x) == float]), 'features.')
        train_x = np.array([train])
        train_y = np.array([[data.category]])
        predictor.train(train_x, train_y)
        return True
    
    def evaluate(self, dataset, predictor):
        test = []
        features = set()
        for data in dataset:
            test_item = self.clean_data(data)
            [features.add(x) for x in test_item if type(x) == float]
            test.append(test_item)
        print('Testing on', len(features), 'features.')
        test_x = np.array([test])
        test_y = np.array([[data.category] for data in dataset])
        return predictor.evaluate(test_x, test_y)