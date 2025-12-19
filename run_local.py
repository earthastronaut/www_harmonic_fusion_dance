#!/usr/bin/env python3
"""
Local development server with auto-refresh on file changes.
Uses only Python 3 standard library.
"""

import http.server
import socketserver
import os
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

# Configuration
PORT = 8747
WATCH_EXTENSIONS = {'.html', '.css', '.js'}
POLL_INTERVAL = 0.5  # seconds
REFRESH_ENDPOINT = '/__refresh_check__'

# Global state for file modification times
file_mtimes: dict[str, float] = {}
last_change_time: float = time.time()


class AutoRefreshHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler that injects auto-refresh script into HTML."""
    
    def end_headers(self):
        """Add CORS headers for refresh endpoint."""
        if self.path == REFRESH_ENDPOINT:
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
        super().end_headers()
    
    def do_GET(self):
        """Handle GET requests, including refresh check endpoint."""
        if self.path == REFRESH_ENDPOINT:
            # Return the last change time
            self.send_response(200)
            self.end_headers()
            response = f'{{"lastChange": {last_change_time}}}'
            self.wfile.write(response.encode())
            return
        
        # Handle normal file requests
        parsed_path = urlparse(self.path)
        file_path = parsed_path.path.lstrip('/')
        
        if not file_path:
            file_path = 'index.html'
        
        # Check if it's an HTML file
        if file_path.endswith('.html'):
            self.serve_html_with_refresh(file_path)
        else:
            # Serve other files normally
            super().do_GET()
    
    def serve_html_with_refresh(self, file_path):
        """Serve HTML file with injected auto-refresh script."""
        try:
            full_path = Path(file_path)
            if not full_path.exists():
                self.send_error(404, "File not found")
                return
            
            with open(full_path, 'rb') as f:
                content = f.read()
            
            # Inject auto-refresh script before closing </body> tag
            refresh_script = b'''
    <script>
        (function() {
            let lastCheck = Date.now() / 1000;
            let checkInterval = setInterval(function() {
                fetch('/__refresh_check__')
                    .then(response => response.json())
                    .then(data => {
                        if (data.lastChange > lastCheck) {
                            console.log('File changed, reloading...');
                            clearInterval(checkInterval);
                            window.location.reload();
                        }
                    })
                    .catch(err => console.error('Refresh check failed:', err));
            }, 500);
        })();
    </script>
'''
            
            # Find </body> tag and inject script before it
            body_end = content.rfind(b'</body>')
            if body_end != -1:
                content = content[:body_end] + refresh_script + content[body_end:]
            else:
                # If no </body> tag, append to end
                content = content + refresh_script
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            self.send_error(500, f"Error serving file: {str(e)}")


def watch_files():
    """Monitor files for changes and update global state."""
    global file_mtimes, last_change_time
    
    base_path = Path('.')
    
    while True:
        try:
            changed = False
            
            # Check all watched files
            for ext in WATCH_EXTENSIONS:
                for file_path in base_path.rglob(f'*{ext}'):
                    if file_path.is_file():
                        try:
                            current_mtime = file_path.stat().st_mtime
                            file_str = str(file_path)
                            
                            if file_str in file_mtimes:
                                if current_mtime > file_mtimes[file_str]:
                                    print(f"File changed: {file_path}")
                                    changed = True
                                    file_mtimes[file_str] = current_mtime
                            else:
                                file_mtimes[file_str] = current_mtime
                        except (OSError, PermissionError):
                            # File might have been deleted or is inaccessible
                            pass
            
            if changed:
                last_change_time = time.time()
            
            time.sleep(POLL_INTERVAL)
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error in file watcher: {e}")
            time.sleep(POLL_INTERVAL)


def main():
    """Start the development server."""
    # Initialize file modification times
    base_path = Path('.')
    for ext in WATCH_EXTENSIONS:
        for file_path in base_path.rglob(f'*{ext}'):
            if file_path.is_file():
                try:
                    file_mtimes[str(file_path)] = file_path.stat().st_mtime
                except (OSError, PermissionError):
                    pass
    
    # Start file watcher in background thread
    watcher_thread = threading.Thread(target=watch_files, daemon=True)
    watcher_thread.start()
    
    # Start HTTP server
    with socketserver.TCPServer(("", PORT), AutoRefreshHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print("Watching for changes in .html, .css, and .js files...")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")


if __name__ == '__main__':
    main()

