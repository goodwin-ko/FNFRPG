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

import html as html_lib

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
            
        slot_html = html_lib.unescape(tds[0])
        slot_match = re.search(r'<a.*?>(.*?)</a>', slot_html, re.DOTALL | re.IGNORECASE)
        slot = slot_match.group(1).strip() if slot_match else re.sub(r'<[^>]+>', '', slot_html).strip()
        
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
    url = f"https://m16tool.xyz/Game/FNF%20RPG%20J/Rank/Index?board=DATA&_={timestamp}"
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
        
        name_html = html_lib.unescape(tds[1])
        match = re.search(r'nicName=([^&"]+)(?:&amp;|&)character=([^&"]+)', name_html)
        if match:
            nicname = urllib.parse.unquote(match.group(1)).strip()
            char = urllib.parse.unquote(match.group(2)).strip()
        else:
            text_clean = re.sub(r'<[^>]+>', '', name_html).strip()
            m_paren = re.search(r'^(.*?)\s*\((.*?)\)$', text_clean)
            if m_paren:
                nicname = m_paren.group(1).strip()
                char = m_paren.group(2).strip()
            else:
                match_nic = re.search(r'nicName=([^&"]+)', name_html)
                nicname = urllib.parse.unquote(match_nic.group(1)).strip() if match_nic else text_clean
                char = '1'
            
        score = tds[2].strip()
        
        rankings.append({
            'rank': rank,
            'nicname': nicname,
            'character': char,
            'score': score
        })
    return rankings

def fetch_maplog_page(page=1):
    import time
    import html as html_lib
    timestamp = int(time.time())
    url = f"https://m16tool.xyz/Game/FNF%20RPG%20J/MapLog/Index?page={page}&_={timestamp}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html_content = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching maplog page {page}: {e}")
        return []
        
    table_match = re.search(r'<table class="table table-striped logtable">(.*?)</table>', html_content, re.DOTALL | re.IGNORECASE)
    if not table_match:
        return []
        
    tbody_html = table_match.group(1)
    rows = re.findall(r'<tr>(.*?)</tr>', tbody_html, re.DOTALL | re.IGNORECASE)
    
    results = []
    for r in rows:
        tds = re.findall(r'<td>(.*?)</td>', r, re.DOTALL | re.IGNORECASE)
        if len(tds) >= 2:
            msg = html_lib.unescape(tds[0]).strip()
            msg = re.sub(r'<[^>]+>', '', msg)
            date = tds[1].strip()
            results.append({
                'msg': msg,
                'date': date
            })
    return results

def fetch_maplog():
    results = fetch_maplog_page(1)
    if len(results) < 30:
        results += fetch_maplog_page(2)
    return results[:30]

def parse_growth_log_entry(l):
    log_text = l.get('Loging', '').replace('<br>', '\n')
    date_str = l.get('CreateDate')
    dt = None
    if date_str:
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(date_str.split('.')[0].replace('Z', ''))
        except Exception:
            pass

    stats = {
        'imangang': 0,
        'suryeonchi': 0,
        'jeongsu_bank': 0,
        'jeongsinryeok': 0,
        'jeongryeok': 0,
        'vip': 0
    }
    m = re.search(r'이만강:\s*(\d+)', log_text)
    if m: stats['imangang'] = int(m.group(1))
    m = re.search(r'수련치:\s*(\d+)', log_text)
    if m: stats['suryeonchi'] = int(m.group(1))
    m = re.search(r'정수뱅크:\s*(\d+)', log_text)
    if m: stats['jeongsu_bank'] = int(m.group(1))
    m = re.search(r'정신력:\s*(\d+)', log_text)
    if m: stats['jeongsinryeok'] = int(m.group(1))
    m = re.search(r'정력:\s*(\d+)', log_text)
    if m: stats['jeongryeok'] = int(m.group(1))
    m = re.search(r'VIP:\s*(\d+)', log_text)
    if m: stats['vip'] = int(m.group(1))

    return {'date': dt, 'date_str': date_str, 'stats': stats}

def fetch_single_player_growth(player):
    nic = player['nicname']
    char = str(player.get('character', '1'))
    rank = player.get('rank', '0')
    
    url = 'https://logs2.m16tool.xyz/Game/FNF%20RPG%20J/UserLog/GetLog2'
    data = {'nicName': nic, 'character': char, 'index': '0', 'search': '', 'Month': '2026-08'}
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode('utf-8'), headers={
        'User-Agent': 'Mozilla/5.0',
        'Referer': f'https://m16tool.xyz/Game/FNF%20RPG%20J/UserLog/RPGDetail?nicName={urllib.parse.quote(nic)}&character={urllib.parse.quote(char)}',
        'Origin': 'https://m16tool.xyz',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    })
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            res = json.loads(resp.read().decode('utf-8'))
        raw_list = res.get('data', [])
        logs = [parse_growth_log_entry(json.loads(x)) for x in raw_list]
        logs_sorted = sorted([l for l in logs if l['date']], key=lambda x: x['date'])
        
        if not logs_sorted:
            return {
                'rank': rank, 'nicname': nic, 'character': char,
                'status': 'no_logs', 'snapshots_count': 0, 'latest_stats': {}, 'hourly_step': {}, 'hourly_avg': {}, 'history': []
            }
            
        latest_entry = logs_sorted[-1]
        latest_stats = latest_entry['stats']
        
        # 1. Step Growth (between last 2 saves)
        step_growth = {}
        step_interval_min = 0
        if len(logs_sorted) >= 2:
            prev_entry = logs_sorted[-2]
            dt_step_h = (latest_entry['date'] - prev_entry['date']).total_seconds() / 3600.0
            step_interval_min = round(dt_step_h * 60, 1)
            for k in ['imangang', 'suryeonchi', 'jeongsu_bank', 'jeongsinryeok', 'jeongryeok']:
                delta = latest_stats[k] - prev_entry['stats'][k]
                rate = round(delta / dt_step_h, 1) if dt_step_h > 0 else 0
                step_growth[k] = {'current': latest_stats[k], 'delta': delta, 'rate_per_hour': rate}
        else:
            for k in ['imangang', 'suryeonchi', 'jeongsu_bank', 'jeongsinryeok', 'jeongryeok']:
                step_growth[k] = {'current': latest_stats[k], 'delta': 0, 'rate_per_hour': 0}

        # 2. Total Avg Growth (across all available logs)
        avg_growth = {}
        total_span_h = 0
        if len(logs_sorted) >= 2:
            oldest_entry = logs_sorted[0]
            dt_total_h = (latest_entry['date'] - oldest_entry['date']).total_seconds() / 3600.0
            total_span_h = round(dt_total_h, 2)
            for k in ['imangang', 'suryeonchi', 'jeongsu_bank', 'jeongsinryeok', 'jeongryeok']:
                delta_total = latest_stats[k] - oldest_entry['stats'][k]
                rate_total = round(delta_total / dt_total_h, 1) if dt_total_h > 0 else 0
                avg_growth[k] = {'total_delta': delta_total, 'rate_per_hour': rate_total}
        else:
            for k in ['imangang', 'suryeonchi', 'jeongsu_bank', 'jeongsinryeok', 'jeongryeok']:
                avg_growth[k] = {'total_delta': 0, 'rate_per_hour': 0}

        history_list = []
        for l in logs_sorted:
            history_list.append({
                'date_str': l['date'].strftime('%Y-%m-%d %H:%M:%S') if l['date'] else '',
                'stats': l['stats']
            })

        return {
            'rank': rank,
            'nicname': nic,
            'character': char,
            'status': 'ok',
            'latest_save_date': latest_entry['date'].strftime('%Y-%m-%d %H:%M:%S') if latest_entry['date'] else '',
            'step_interval_min': step_interval_min,
            'total_span_h': total_span_h,
            'snapshots_count': len(logs_sorted),
            'latest_stats': latest_stats,
            'hourly_step': step_growth,
            'hourly_avg': avg_growth,
            'history': history_list
        }
    except Exception as e:
        return {
            'rank': rank, 'nicname': nic, 'character': char,
            'status': f'error: {str(e)}', 'snapshots_count': 0, 'latest_stats': {}, 'hourly_step': {}, 'hourly_avg': {}, 'history': []
        }

def fetch_top30_growth():
    from concurrent.futures import ThreadPoolExecutor
    import time
    timestamp = int(time.time())
    url = f"https://m16tool.xyz/Game/FNF%20RPG%20J/Rank/Index?board=DATA&_={timestamp}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            c = response.read().decode('utf-8')
    except Exception:
        return []

    table_match = re.search(r'<table class="table table-bordered table-hover">.*?<tbody>(.*?)</tbody>', c, re.DOTALL | re.IGNORECASE)
    if not table_match:
        return []
    rows = re.findall(r'<tr.*?>(.*?)</tr>', table_match.group(1), re.DOTALL | re.IGNORECASE)
    
    players = []
    for r in rows:
        tds = re.findall(r'<td.*?>(.*?)</td>', r, re.DOTALL | re.IGNORECASE)
        if len(tds) >= 2:
            rank = tds[0].strip()
            name_html = html_lib.unescape(tds[1])
            match = re.search(r'nicName=([^&"]+)(?:&amp;|&)character=([^&"]+)', name_html)
            if match:
                nic = urllib.parse.unquote(match.group(1)).strip()
                char = urllib.parse.unquote(match.group(2)).strip()
                players.append({'rank': rank, 'nicname': nic, 'character': char})
            else:
                text_clean = re.sub(r'<[^>]+>', '', name_html).strip()
                m_paren = re.search(r'^(.*?)\s*\((.*?)\)$', text_clean)
                if m_paren:
                    nic = m_paren.group(1).strip()
                    char = m_paren.group(2).strip()
                    players.append({'rank': rank, 'nicname': nic, 'character': char})
                else:
                    match_nic = re.search(r'nicName=([^&"]+)', name_html)
                    nic = urllib.parse.unquote(match_nic.group(1)).strip() if match_nic else text_clean
                    players.append({'rank': rank, 'nicname': nic, 'character': '1'})

    with ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(fetch_single_player_growth, players[:30]))
    return results

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

        # API Route: /api/eventlog
        if parsed_url.path == '/api/eventlog':
            results = fetch_maplog()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(json.dumps(results, ensure_ascii=False).encode('utf-8'))
            return

        # API Route: /api/growth
        if parsed_url.path == '/api/growth':
            results = fetch_top30_growth()
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
    
    # Run multi-threaded server
    socketserver.TCPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("", PORT), CustomHandler) as httpd:
        print(f"FNF RPG J Web server running on http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            sys.exit(0)
