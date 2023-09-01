from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from time import sleep
from util import import_file, string_json

class SEARCH:
	def __init__(self, file, webdriver=None):
		self.file = file
		self.intention = None
		self.base_url = None
		self.actions = list()
		self.current = -1
		self.rollover = False
		self.generation = None
		self.Driver = webdriver
  
	def verify(self, arachnode_js):
		if self.actions == []: return None
		return self.actions[self.current]
		if self.actions[self.current]['type'] != 'SELECTION' and self.actions[self.current]['type'] != 'CLICK':
			print("Err:", self.actions[self.current]['type'], "!= CLICK || SELECTION")
			return None
		self.Driver.get(self.base_url)
		arachnode = import_file(arachnode_js)
		self.Driver.exec(
			f'''var script = document.createElement('script');
    		script.src = "https://code.jquery.com/jquery-3.1.1.min.js";
    		script.type = 'text/javascript';
   			document.getElementsByTagName('head')[0].appendChild(script);''')
		self.Driver.exec(
			f'''var script = document.createElement('script');
    		script.innerHTML = `{string_json(arachnode)[1:-1]}`;
    		script.type = 'text/javascript';
   			document.getElementsByTagName('head')[0].appendChild(script);''')
		sleep(1)
		string_json(self.actions[self.current])
		test = self.Driver.exec(f'''return verify_element(`{string_json(self.actions[self.current])}`, `{self.generation}`);''')
		print(test)
		sleep(60)

	def iterate(self):
		self.current += 1
		if self.current >= len(self.actions):
			self.rollover = True
			self.current = -1
			return
		if self.actions == []: return
		if self.actions[self.current]['type'] == 'URL_CHANGE':
			self.base_url = self.actions[self.current]['content']
			self.iterate()
		elif self.actions[self.current]['type'] == 'CLICK' or self.actions[self.current]['type'] == 'SELECTION':
			for x in self.actions[self.current]['content']:
				if x['entity'] == 'e':
					self.generation = x['data-generation']
		

class WebDriver:
	def __init__(self, base_url, headless=True, browser_path=None, executable_path=None, timeout=10):
		self.base = base_url
		self.headless = headless
		self.browser_path = browser_path
		self.executable_path = executable_path
		self.timeout = timeout
		self.webdriver = None
		self.url = ""

	def new_driver(self):
		chromeOptions = webdriver.chrome.options.Options()
		if self.headless: chromeOptions.headless = True
		if self.browser_path: chromeOptions.binary_location = self.browser_path
		if self.executable_path: self.webdriver = webdriver.Chrome(options=chromeOptions, executable_path=self.executable_path)
		else: self.webdriver = webdriver.Chrome(options=chromeOptions)
		return self.webdriver
		
	def query(self, query:str):
		self.url = self.base + query.replace(" ","+")
		self.get(self.url)
		src = self.src()
		packet = {"url": self.url, "source": src}
		return packet

	def get(self, url):
		self.webdriver.get(url)

	def exec(self, js):
		return self.webdriver.execute_script(js)
	
	def src(self):
		return self.webdriver.page_source

	def wait(self, xpath, timeout=None):
		if timeout == None: timeout = self.timeout
		try: return WebDriverWait(self.webdriver, timeout).until(EC.presence_of_element_located((By.XPATH, xpath)))
		except Exception as ex: return None

	def stop(self):
		if (self.webdriver): self.webdriver.quit()
		self.webdriver = None

	def __del__(self):
		self.stop()
