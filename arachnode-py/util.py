import json
import os

def import_file(filename):
    data = ""
    with open(filename, "r") as f:
        data = f.read()
    return data

def import_json(filename):
    data = {}
    with open(filename) as f:
        data = json.load(f)
    return data

def parse_json(data):
    return json.loads(data)

def with_aws(func, *kargs):
    try:
      return func(*kargs)
    except Exception as err:
        try: 
            errname = err.response['Error']['Code']
        except Exception as e:
            print(e, err)
            return
        if errname == 'ExpiredToken':
          print('[-1] Error encountered. No resources deployed.')
          cwd = os.getcwd()
          os.chdir('/Users/drebarrera/Documents/aws_token')
          print('Generating new Token')
          os.system("python3 aws_token.py")
          os.chdir(cwd)
          print("Retry process after successful token generation.")
          return with_aws(func)