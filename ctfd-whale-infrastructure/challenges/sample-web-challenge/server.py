#!/usr/bin/env python3
"""
XploitX 2026 - Sample Dynamic Web Challenge Server
A vulnerable demo challenge demonstrating dynamic flag retrieval.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import os

PORT = 80

class ChallengeHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        flag_path = '/flag'
        flag_content = "XploitXβ{flag_missing}"
        if os.path.exists(flag_path):
            with open(flag_path, 'r') as f:
                flag_content = f.read().strip()

        if self.path == '/hint':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"hint": "Inspect the secret endpoint: /api/v1/debug-env"}')
            return

        if self.path == '/api/v1/debug-env':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = f'{{"status": "authorized", "flag": "{flag_content}"}}'
            self.wfile.write(response.encode())
            return

        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>XploitX 2026 - Target Node</title>
    <style>
        body {{ background: #0b0f19; color: #00ffcc; font-family: monospace; padding: 40px; }}
        .card {{ border: 1px solid #00ffcc; padding: 25px; border-radius: 8px; max-width: 600px; margin: auto; }}
        h1 {{ color: #ff0055; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>[!] XPLOITX TARGET ACCESS GRANTED</h1>
        <p>Container Status: ONLINE</p>
        <p>Challenge Objective: Discover the developer debugging interface to extract the flag.</p>
        <p>Format required: <code>XploitXβ{{flag}}</code></p>
    </div>
</body>
</html>"""
        self.wfile.write(html.encode('utf-8'))

if __name__ == '__main__':
    print(f"Starting server on port {PORT}...")
    server = HTTPServer(('0.0.0.0', PORT), ChallengeHandler)
    server.serve_forever()
