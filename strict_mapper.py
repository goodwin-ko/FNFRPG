import urllib.request, urllib.parse, re, html, json, time, os
from datetime import datetime

def clean_wc3(t):
    if not t: return ''
    t = re.sub(r'\|[cC][0-9a-fA-F]{8}', '', t)
    t = re.sub(r'\|[rR]', '', t)
    return t.strip()

def parse_bracket_items(text):
    if not text or '(비어있음)' in text or '(비어 있음)' in text:
        return []
    items = []
    depth = 0
    start = -1
    for i, ch in enumerate(text):
        if ch == '[':
            if depth == 0: start = i + 1
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0 and start != -1:
                items.append(text[start:i])
                start = -1
    return [clean_wc3(item) for item in items]

def parse_save_date(date_str):
    if not date_str: return None
    m = re.search(r'(\d{2})/(\d{2})/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})', date_str.strip())
    if m:
        month, day, year, hour, minute, second = map(int, m.groups())
        return datetime(year, month, day, hour, minute, second)
    return None

def parse_log_date(date_str):
    if not date_str: return None
    try:
        return datetime.fromisoformat(date_str.split('.')[0].replace('Z', ''))
    except Exception:
        return None

def normalize_item_name(iname, count=0):
    if not iname: return ''
    # If iname is "강화의 룬 [60]"
    if '강화의 룬' in iname:
        return '강화의 룬'
    return iname

def get_all_ranking_players():
    all_users = []
    seen = set()
    for page in range(1, 4):
        timestamp = int(time.time())
        url = f"https://m16tool.xyz/Game/FNF%20RPG%20J/Rank/index?index={page}&board=DATA&_={timestamp}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                content = resp.read().decode('utf-8')
            table_match = re.search(r'<table class="table table-bordered table-hover">.*?<tbody>(.*?)</tbody>', content, re.DOTALL | re.IGNORECASE)
            if not table_match: continue
            rows = re.findall(r'<tr.*?>(.*?)</tr>', table_match.group(1), re.DOTALL | re.IGNORECASE)
            for r in rows:
                tds = re.findall(r'<td.*?>(.*?)</td>', r, re.DOTALL | re.IGNORECASE)
                if len(tds) >= 2:
                    name_html = tds[1]
                    match = re.search(r'nicName=([^&"]+)(?:&amp;|&)character=([^&"]+)', name_html)
                    if match:
                        nic = urllib.parse.unquote(match.group(1))
                        char = urllib.parse.unquote(match.group(2))
                        if (nic, char) not in seen:
                            seen.add((nic, char))
                            all_users.append((nic, char))
                    else:
                        match_nic = re.search(r'nicName=([^&"]+)', name_html)
                        if match_nic:
                            nic = urllib.parse.unquote(match_nic.group(1))
                            if (nic, '1') not in seen:
                                seen.add((nic, '1'))
                                all_users.append((nic, '1'))
        except Exception as e:
            print(f"Error page {page}: {e}")
    return all_users

def get_user_saves(nicName):
    url = f'https://m16tool.xyz/Game/FNF%20RPG%20J/UserLog/LogResult?nicName={urllib.parse.quote(nicName)}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            c = html.unescape(resp.read().decode('utf-8'))
        tbody = re.search(r'<tbody>(.*?)</tbody>', c, re.DOTALL | re.IGNORECASE)
        if not tbody: return []
        rows = re.findall(r'<tr>(.*?)</tr>', tbody.group(1), re.DOTALL | re.IGNORECASE)
        saves = []
        for r in rows:
            tds = re.findall(r'<td.*?>(.*?)</td>', r, re.DOTALL | re.IGNORECASE)
            if len(tds) >= 4:
                char = re.sub(r'<[^>]+>', '', tds[0]).strip()
                raw_json = tds[1].replace('<br>', '\n').replace('<br/>', '\n').strip()
                if not raw_json.startswith('{'): raw_json = '{' + raw_json + '}'
                dt = parse_save_date(tds[3])
                try:
                    saves.append({'char': char, 'date': dt, 'data': json.loads(raw_json)})
                except Exception:
                    pass
        return saves
    except Exception:
        return []

def get_user_logs(nicName, char, month="2026-08"):
    url = 'https://logs2.m16tool.xyz/Game/FNF%20RPG%20J/UserLog/GetLog2'
    data = {'nicName': nicName, 'character': char, 'index': '0', 'search': '', 'Month': month}
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode('utf-8'), headers={
        'User-Agent': 'Mozilla/5.0',
        'Referer': f'https://m16tool.xyz/Game/FNF%20RPG%20J/UserLog/RPGDetail?nicName={urllib.parse.quote(nicName)}&character={urllib.parse.quote(char)}',
        'Origin': 'https://m16tool.xyz',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            res = json.loads(resp.read().decode('utf-8'))
        logs = []
        for item in res.get('data', []):
            try:
                l = json.loads(item)
                dt = parse_log_date(l.get('CreateDate'))
                logs.append({'date': dt, 'loging': l.get('Loging', '')})
            except Exception:
                pass
        return logs
    except Exception:
        return []

def parse_log_text(loging_text):
    lines = loging_text.replace('<br>', '\n').splitlines()
    parsed = {}
    for line in lines:
        line = line.strip()
        if not line: continue
        if line.startswith('영웅:'):
            m = re.search(r'영웅:\s*(.*?)\s*/', line)
            if m: parsed['hero'] = clean_wc3(m.group(1))
        elif line.startswith('펫:'):
            m = re.search(r'펫:\s*(.*?)\s*/', line)
            if m: parsed['pet'] = clean_wc3(m.group(1))
        elif line.startswith('가방 외형:'):
            parsed['bag_look'] = clean_wc3(line.split(':', 1)[1].strip())
        elif line.startswith('영웅 인벤:'):
            parsed['hero_inv'] = parse_bracket_items(line.split(':', 1)[1].strip())
        elif line.startswith('가방 인벤:'):
            parsed['bag_inv'] = parse_bracket_items(line.split(':', 1)[1].strip())
        elif line.startswith('스킬등록 NPC:'):
            parsed['skill_npc'] = parse_bracket_items(line.split(':', 1)[1].strip())
        elif line.startswith('외형등록 NPC:'):
            parsed['look_npc'] = parse_bracket_items(line.split(':', 1)[1].strip())
        elif line.startswith('저장창고:'):
            parsed['storage'] = parse_bracket_items(line.split(':', 1)[1].strip())
    return parsed

def match_items(save_data, parsed_log, item_map):
    # 1. Hero
    if 'hero' in parsed_log and save_data.get('hero'):
        hid = str(save_data['hero'])
        hname = parsed_log['hero']
        if hname and hname != '(비어있음)' and not hname.startswith('비어'):
            item_map[hid] = normalize_item_name(hname)
            
    # 2. Pet
    if 'pet' in parsed_log and save_data.get('pet'):
        pid = str(save_data['pet'])
        pname = parsed_log['pet']
        if pname and pname != '(비어있음)' and not pname.startswith('비어'):
            item_map[pid] = normalize_item_name(pname)

    # 3. Equipped Bag look
    if save_data.get('b6i1') and 'bag_look' in parsed_log:
        bname = parsed_log['bag_look']
        if bname and bname != '(비어있음)' and not bname.startswith('비어'):
            item_map[str(save_data['b6i1'])] = normalize_item_name(bname)

    # 4. Hero inventory (hi1..hi6)
    hero_slots = [save_data.get(f'hi{i}', 0) for i in range(1, 7)]
    hero_counts = [save_data.get(f'h{i}c', 0) for i in range(1, 7)]
    non_zero_hero = [(sid, cnt) for sid, cnt in zip(hero_slots, hero_counts) if sid != 0]
    log_hero_items = parsed_log.get('hero_inv', [])
    if len(non_zero_hero) == len(log_hero_items):
        for (sid, cnt), iname in zip(non_zero_hero, log_hero_items):
            if iname and not iname.startswith('비어'):
                item_map[str(sid)] = normalize_item_name(iname, cnt)

    # 5. Bag inventory (bi1..bi6)
    bag_slots = [save_data.get(f'bi{i}', 0) for i in range(1, 7)]
    bag_counts = [save_data.get(f'b1{i}c', 0) for i in range(1, 7)]
    non_zero_bag = [(sid, cnt) for sid, cnt in zip(bag_slots, bag_counts) if sid != 0]
    log_bag_items = parsed_log.get('bag_inv', [])
    if len(non_zero_bag) == len(log_bag_items):
        for (sid, cnt), iname in zip(non_zero_bag, log_bag_items):
            if iname and not iname.startswith('비어'):
                item_map[str(sid)] = normalize_item_name(iname, cnt)

    # 6. Skill NPC (b2i1..b2i6)
    skill_slots = [save_data.get(f'b2i{i}', 0) for i in range(1, 7)]
    skill_counts = [save_data.get(f'b2{i}c', 0) for i in range(1, 7)]
    non_zero_skill = [(sid, cnt) for sid, cnt in zip(skill_slots, skill_counts) if sid != 0]
    log_skill_items = parsed_log.get('skill_npc', [])
    if len(non_zero_skill) == len(log_skill_items):
        for (sid, cnt), iname in zip(non_zero_skill, log_skill_items):
            if iname and not iname.startswith('비어'):
                item_map[str(sid)] = normalize_item_name(iname, cnt)

    # 7. Look NPC (b3i1..b3i6)
    look_slots = [save_data.get(f'b3i{i}', 0) for i in range(1, 7)]
    look_counts = [save_data.get(f'b3{i}c', 0) for i in range(1, 7)]
    non_zero_look = [(sid, cnt) for sid, cnt in zip(look_slots, look_counts) if sid != 0]
    log_look_items = parsed_log.get('look_npc', [])
    if len(non_zero_look) == len(log_look_items):
        for (sid, cnt), iname in zip(non_zero_look, log_look_items):
            if iname and not iname.startswith('비어'):
                item_map[str(sid)] = normalize_item_name(iname, cnt)

    # 8. Storage (b4i1..b4i6)
    storage_slots = [save_data.get(f'b4i{i}', 0) for i in range(1, 7)]
    storage_counts = [save_data.get(f'b4{i}c', 0) for i in range(1, 7)]
    non_zero_storage = [(sid, cnt) for sid, cnt in zip(storage_slots, storage_counts) if sid != 0]
    log_storage_items = parsed_log.get('storage', [])
    if len(non_zero_storage) == len(log_storage_items):
        for (sid, cnt), iname in zip(non_zero_storage, log_storage_items):
            if iname and not iname.startswith('비어'):
                item_map[str(sid)] = normalize_item_name(iname, cnt)

def run():
    # Load base items.json
    item_map = {}
    if os.path.exists('items.json'):
        with open('items.json', 'r', encoding='utf-8') as f:
            item_map = json.load(f)

    # Explicit known items from current patch
    known_overrides = {
        "1227905349": "인피니티[1]",
        "1227904074": "심장[Lv.10]",
        "1227904560": "악세[Lv.1]",
        "1227904561": "악세[Lv.2]",
        "1227904562": "악세[Lv.3]",
        "1227904563": "악세[Lv.4]",
        "1227904564": "악세[Lv.5]",
        "1227904565": "악세[Lv.6]",
        "1227904566": "악세[Lv.7]",
        "1227904567": "악세[Lv.8]",
        "1227904568": "악세[Lv.9]",
        "1227904569": "악세[Lv.10]",
        "1227905333": "날만강[HP:3]",
        "1227905330": "강화의 룬",
        "1227905348": "풀백",
        "1227905347": "○제1장 스킬북",
        "1227901488": "날만강[11]",
        "1227901519": "강화의 룬",
        "1227895602": "이만강",
        "776548403": "수련치",
        "1227896147": "정수뱅크",
        "1227903799": "DP[대륙]",
        "1227903800": "동상",
        "1227902280": "VIP",
        "1227901528": "정신력",
        "1227903310": "별성",
        "1227903062": "정력",
        "1227905074": "후포",
        "1227904307": "루미+5",
        "1227904312": "오리진[1]",
        "1227904330": "오리진[1]",
        "1227904313": "오리진[2]",
        "1227904331": "오리진[3]",
        "1227904332": "오리진[4]",
        "1227904333": "오리진[5]",
        "1227904334": "오리진[6]",
        "1227904335": "오리진[7]",
        "1227904336": "오리진[8]",
        "1227904337": "오리진[9]",
        "1227904338": "오리진[10]",
        "1328558387": "루루무",
        "1328558661": "☆펫[굳윈]"
    }
    for k, v in known_overrides.items():
        item_map[k] = v

    players = get_all_ranking_players()
    print(f"Total players to scan: {len(players)}")

    matched_total = 0
    for idx, (nic, char) in enumerate(players):
        saves = get_user_saves(nic)
        logs = get_user_logs(nic, char, "2026-08")
        if not saves or not logs:
            continue

        # STRICT TIMESTAMP MATCHING:
        for s in saves:
            s_dt = s['date']
            if not s_dt: continue
            for l in logs:
                l_dt = l['date']
                if not l_dt: continue
                # Match within 60 seconds
                if abs((s_dt - l_dt).total_seconds()) <= 60:
                    matched_total += 1
                    parsed = parse_log_text(l['loging'])
                    match_items(s['data'], parsed, item_map)
                    break

        if (idx + 1) % 10 == 0 or idx + 1 == len(players):
            print(f"Processed {idx+1}/{len(players)} players. Matched saves: {matched_total}, Total items in map: {len(item_map)}")
        time.sleep(0.2)

    # Save to items.json
    with open('items.json', 'w', encoding='utf-8') as f:
        json.dump(item_map, f, ensure_ascii=False, indent=2)
    print(f"\nDone! Successfully updated items.json with {len(item_map)} accurately mapped items.")

if __name__ == '__main__':
    run()
