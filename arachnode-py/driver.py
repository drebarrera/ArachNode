from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class Driver:
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
