from util import import_json
import sys

# Load Config
config = import_json('config.json')
print(config['application'], 'v.' + config['version'])

### If in training mode
if config['mode'] == 'Train':
  # Create new Training Module
  from trainer import trainingmodule
  trainer = trainingmodule.TrainingModule(config)

  # Train model
  trainer.train()
