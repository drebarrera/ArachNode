import driver
import portal

class Gateway:
    def __init__(self, mode="Training", base_url=None, headless=True, browser_path=None, executable_path=None, timeout=10):
        self.mode = mode
        self.base_url = base_url
        self.timeout = timeout
        self.WebDriver = driver.Driver(self.base_url, headless, browser_path, executable_path, self.timeout)
        self.Portal = portal.Portal(self.WebDriver, 7)

    def run(self, query):
        self.WebDriver.new_driver()
        packet = self.WebDriver.query(query)
        if self.mode == "Training":
            self.Portal.ui()