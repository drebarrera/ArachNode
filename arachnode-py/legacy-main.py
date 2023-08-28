from util import import_json
import gateway

config = import_json('config.json')
print(config['application'], 'v.' + str(config['version']))
print('Loading...')
gate = gateway.Gateway(mode=config['mode'], base_url=config['base_url'], headless=config['driver_headless'], browser_path=config['driver_browser_path'], executable_path=config['driver_executable_path'], timeout=config['gateway_timeout'])
print('Enter a query, command, or type "help" for more options.')
while (query:=input('>> ')) != 'exit':
    if query == 'exit': print(2); break
    elif query == 'help':
        print('Help:')
    else:
        gate.run(query)