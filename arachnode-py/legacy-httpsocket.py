import http.server
import socketserver
import urllib.parse
import select

class HTTPSocket():
    def __init__(self, PORT):
        self.PORT = PORT
        self.Handler = Handler
        self.httpd = None

    def start(self):
        self.httpd = socketserver.TCPServer(("", self.PORT), self.Handler)
        self.Handler.socket = self
        print('Waiting for data at port', self.PORT)
        self.httpd.handle_request()
            #if self.Handler.data:
               # break

            #readable, _, _ = select.select([self.httpd.socket.fileno()], [], [], self.httpd.timeout)
            #if readable:
               # self.httpd.handle_request()

        self.httpd.server_close()
        return self.Handler.data

    def stop(self):
        if (self.Handler): del self.Handler
        if (self.httpd): self.httpd.shutdown()

    def __del__(self):
        self.stop()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, request, client_address, server):
        super().__init__(request, client_address, server)
        self.socket = None
        self.data = None

    def do_GET(self):
        if self.path.startswith("/result/"):
            data = urllib.parse.unquote(self.path[8:])

            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(bytes("Data received.", "utf-8"))

            self.data = data
            