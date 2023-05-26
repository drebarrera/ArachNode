import json

def import_js(filename):
    data = ""
    with open(filename, "r") as f:
        data = f.read()
    return data

def import_json(filename):
    data = {}
    with open(filename) as f:
        data = json.load(f)
    return data