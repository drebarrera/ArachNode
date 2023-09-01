import tensorflow as tf

class PredictionGenerator:
    def __init__(self, model, epochs, batch_size):
        self.Model = model
        self.epochs = epochs
        self.batch_size = batch_size

    def evaluate(self, test_x, test_y):
        return self.Model.model.evaluate(test_x, test_y)

    def train(self, train_x, train_y):
        self.Model.model.fit(train_x, train_y, epochs=5, batch_size=1)