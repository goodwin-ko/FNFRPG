import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import re
import os
import mimetypes
import sys

PORT = int(os.environ.get('PORT', 8000))

def fetch_and_parse(nicname):
    encoded_name = urllib.parse.quote(nicname)
    url = f"https://m16tool.xyz/Game/FNF%20RPG%20J/UserLog/LogResult?nicName={encoded_name}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching url for {nicname}: {e}")
        return None
        
    tbody_match = re.search(r'<tbody>(.*?)</tbody>', html, re.DOTALL | re.IGNORECASE)
    if not tbody_match:
        return []
        
    tbody_html = tbody_match.group(1)
    rows = re.findall(r'<tr>(.*?)</tr>', tbody_html, re.DOTALL | re.IGNORECASE)
    
    results = []
    for row in rows:
        tds = re.findall(r'<td.*?>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
        if len(tds) < 3:
            continue
            
        slot_html = tds[0]
        slot_match = re.search(r'<a.*?>(.*?)</a>', slot_html, re.DOTALL | re.IGNORECASE)
        slot = slot_match.group(1).strip() if slot_match else slot_html.strip()
        
        raw_data_html = tds[1]
        data_str = raw_data_html.replace('<br>', '\n').replace('<br/>', '\n').replace('<br />', '\n')
        data_str = data_str.strip()
        if not data_str.startswith('{'):
            data_str = "{" + data_str + "}"
            
        parsed_data = {}
        try:
            parsed_data = json.loads(data_str)
        except Exception as e:
            # Fallback regex parser for dirty JSON
            kv_pairs = re.findall(r'"([^"]+)":\s*(?:"([^"]*)"|(-?\d+))', data_str)
            for k, val_str, val_num in kv_pairs:
                if val_str:
                    parsed_data[k] = val_str
                else:
                    parsed_data[k] = int(val_num)
                    
        date_str = tds[-1].strip()
        
        results.append({
            'slot': slot,
            'data': parsed_data,
            'date': date_str
        })
        
    return results

def fetch_rankings():
    import time
    timestamp = int(time.time())
    url = f"https://m16tool.xyz/Game/FNF%20RPG%20J/Rank/Index?board=RK&_={timestamp}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching rankings: {e}")
        return []
        
    table_match = re.search(r'<table class="table table-bordered table-hover">.*?<tbody>(.*?)</tbody>', html, re.DOTALL | re.IGNORECASE)
    if not table_match:
        return []
        
    tbody_html = table_match.group(1)
    rows = re.findall(r'<tr.*?>(.*?)</tr>', tbody_html, re.DOTALL | re.IGNORECASE)
    
    rankings = []
    for row in rows:
        tds = re.findall(r'<td.*?>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
        if len(tds) < 3:
            continue
            
        rank = tds[0].strip()
        
        name_html = tds[1]
        name_match = re.search(r'nicName=([^&"]+)', name_html)
        if name_match:
            nicname = urllib.parse.unquote(name_match.group(1))
        else:
            nicname_clean = re.sub(r'<[^>]+>', '', name_html).strip()
            nicname = nicname_clean.split('(')[0].strip()
            
        score = tds[2].strip()
        
        rankings.append({
            'rank': rank,
            'nicname': nicname,
            'score': score
        })
    return rankings

class CustomHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Prevent spamming the console with static file requests
        pass

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        
        # API Route: /api/search
        if parsed_url.path == '/api/search':
            query = urllib.parse.parse_qs(parsed_url.query)
            nicname = query.get('nicName', [''])[0]
            
            if not nicname:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'nicName is required'}).encode('utf-8'))
                return
                
            results = fetch_and_parse(nicname)
            if results is None:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Failed to fetch data from m16tool'}).encode('utf-8'))
                return
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(json.dumps(results, ensure_ascii=False).encode('utf-8'))
            return
            
        # API Route: /api/rankings
        if parsed_url.path == '/api/rankings':
            results = fetch_rankings()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(json.dumps(results, ensure_ascii=False).encode('utf-8'))
            return

        # Serve static files
        filename = parsed_url.path.lstrip('/')
        if not filename:
            filename = 'index.html'
            
        # Security: restrict file access to workspace directory only
        filename = os.path.basename(filename)
        filepath = os.path.join(os.getcwd(), filename)
        
        if os.path.exists(filepath) and os.path.isfile(filepath):
            mime_type, _ = mimetypes.guess_type(filepath)
            if not mime_type:
                mime_type = 'application/octet-stream'
                
            self.send_response(200)
            self.send_header('Content-Type', f"{mime_type}; charset=utf-8" if "text" in mime_type or "json" in mime_type else mime_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open(filepath, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"404 Not Found")

if __name__ == "__main__":
    # Ensure working directory is the folder of this script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Run server
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"FNF RPG J Web server running on http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            sys.exit(0)
