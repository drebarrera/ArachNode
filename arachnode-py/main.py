from util import import_json
from model import model

# Load Config
config = import_json('config.json')
print(config['application'], 'v.' + config['version'])

# Generate the Model
ArachNode = model.Model(config)
ArachNode.load() # Load preexisting model

### If in training mode
if config['mode'] == 'Train':
  # Create new Training Module
  from trainer import trainingmodule
  trainer = trainingmodule.TrainingModule(config, ArachNode)

  # Train model
  training_results = trainer.train()
  print(training_results)
  if ArachNode.overflow > 0: print('Alert: Feature overflow of', ArachNode.overflow, 'features.')
  print('Trained on', len(list(ArachNode.features.keys())), 'features from', sum([sum([1 for y in training_results[x] if training_results[x][y] == True]) for x in training_results]), 'elements and', len([x for x in training_results if sum([1 for y in training_results[x] if training_results[x][y] == True]) > 1]),'searches.')

