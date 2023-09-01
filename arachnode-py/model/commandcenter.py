import re
import math

class DATA:
    def __init__(self, windowx=1366, windowy=784):
        self.category = None
        self.features = {}
        self.text = None
        self.text_tags = None
        self.windowx = windowx
        self.windowy = windowy
    
    def size_content(self, dim, x=False):
        if float(dim) == 0: return -3
        if x == True: return round(math.log10(float(dim) / self.windowx)) #round(float(dim) * 100/self.windowx, 1)
        else: return round(math.log10(float(dim) / self.windowy)) #round(float(dim) * 100/self.windowy, 1)
        
    def closest_standard_color(self, r, g, b):
        standard_colors = {
            'red': (255, 0, 0),
            'green': (0, 255, 0),
            'blue': (0, 0, 255),
            'yellow': (255, 255, 0),
            'magenta': (255, 0, 255),
            'cyan': (0, 255, 255),
            'darkred': (128, 0, 0),
            'darkgreen': (0, 128, 0),
            'darkblue': (0, 0, 128),
            'olive': (128, 128, 0),
            'purple': (128, 0, 128),
            'teal': (0, 128, 128),
            'silver': (192, 192, 192),
            'gray': (128, 128, 128),
            'black': (0, 0, 0),
            'white': (255, 255, 255),
            'orange': (255, 165, 0),
            'pink': (255, 192, 203),
            'violet': (128, 0, 128),
            'brown': (165, 42, 42),
            'gold': (255, 215, 0),
            'lavender': (230, 230, 250),
            'beige': (245, 245, 220),
            'mint': (173, 255, 47),
            'skyblue': (135, 206, 235),
            'peach': (255, 218, 185)
        }

        min_distance = float('inf')
        closest_color_name = None

        for color_name, color_rgb in standard_colors.items():
            distance = math.sqrt((int(r) - color_rgb[0]) ** 2 + (int(g) - color_rgb[1]) ** 2 + (int(b) - color_rgb[2]) ** 2)
            if distance < min_distance:
                min_distance = distance
                closest_color_name = color_name

        return closest_color_name

    def parse_entity(self, content):
        entity = content['entity']
        if entity == 'g':
            entity = entity + str(content['depth'])
        for attr in content:
            #add an attr for font family chains
            if attr == 'entity' or attr == 'text' or len(attr.split(' ')) > 1 or attr == 'class': continue
            quantifier = re.findall(r'\b(\d*\.*\d+)?(px)\b', str(content[attr]))
            if len(quantifier):
                size = dict()
                if "height" in attr or "top" in attr or "bottom" in attr or attr == "font-size" or "-y" in attr: size = {'null': float(quantifier[0][0])}
                elif "width" in attr or "left" in attr or "right" in attr or "-x" in attr: size = {'null': float(quantifier[0][0])}
                else:
                    if len(quantifier) == 1: size = {'top': float(quantifier[0][0]), 'bottom':float(quantifier[0][0]), 'left': float(quantifier[0][0]), 'right': float(quantifier[0][0])}
                    elif len(quantifier) == 2: size = {'top': float(quantifier[0][0]), 'bottom': float(quantifier[0][0]), 'left': float(quantifier[1][0]), 'right': float(quantifier[1][0])}
                    elif len(quantifier) == 3: size = {'top': float(quantifier[0][0]), 'right': float(quantifier[1][0]), 'bottom': float(quantifier[2][0]), 'left': float(quantifier[1][0])}
                    elif len(quantifier) == 4: size = {'top': float(quantifier[0][0]), 'right': float(quantifier[1][0]), 'bottom': float(quantifier[2][0]), 'left': float(quantifier[3][0])}
                for s in size:
                    if s == 'null': self.features[entity + '-' + attr] = size[s]
                    else: self.features[entity + '-' + attr + '-' + s] = size[s]
            elif re.match(r'((rgb|rgba)\(\d+, \d+, \d+\))', str(content[attr])):
                self.features[entity + '-' + attr] = self.closest_standard_color(*list(re.findall(r'(\d+)', re.match(r'((rgb|rgba)\(\d+, \d+, \d+\))', str(content[attr])).group())))
            elif attr == 'text-decoration':
                for prop_val in re.split('(?<=[a-zA-Z_])\s',str(content[attr])):
                    if prop_val in ['none', 'underline', 'overline', 'line-through']:
                        prop = entity + '-' + attr + '-' + 'line'
                    elif prop_val in ['solid', 'double', 'dotted', 'dashed', 'wavy']:
                        prop = entity + '-' + attr + '-' + 'style'
                    elif re.match(r'((rgb|rgba)\(\d+, \d+, \d+\))', prop_val):
                        prop_val = self.closest_standard_color(*(list(re.findall(r'(\d+)', prop_val)))[:3])
                        prop = entity + '-' + attr + '-' + 'color'
                    else:
                        prop = entity + '-' + attr + '-' + 'color'
                    self.features[prop] = prop_val
            elif len(str(content[attr]).split(' ')) > 1:
                print('Attribute not registered due to value proportions > 1', attr + ':', content[attr][:40] + '...')
                continue
            elif attr == 'href':
                self.features[entity + '-' + attr] = 1
            elif str(content[attr]) == "auto": 
                print('Attribute not registered due to "auto" value:', attr)
                continue
            elif len(str(content[attr])) > 20:
                print('Attribute not registered due to value length > 20', attr + ':', content[attr][:40] + '...')
                continue
            else:
                self.features[entity + '-' + attr] = content[attr]

    def parse_text(self, text):
        pass
        #print(text)

class CommandCenter:
    def __init__(self, classes):
        self.classes = classes

    def formatin(self, data):
        Data = DATA()
        for c in self.classes:
            if data['type'] == c:
                Data.category = self.classes[c]
        if Data.category == None: return None
        for c in data['content']:
            if c['entity'] == 'a': continue
            Data.parse_entity(c)
            if c['entity'] == 'e': Data.parse_text(c['text'])
        return Data
    
    def formatout(self, cmd):
        return cmd