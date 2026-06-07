import os
import shutil
import re
import json

downloads_dir = r"C:\Users\JS\Downloads"
workspace_dir = r"d:\code\ff"

def copy_and_parse():
    files = os.listdir(downloads_dir)
    target_file = None
    for f in files:
        if "fnf" in f.lower() and f.endswith(".txt"):
            target_file = f
            break
            
    if not target_file:
        print("Error: Could not find FNF text file in Downloads")
        return False
        
    src_path = os.path.join(downloads_dir, target_file)
    dst_path = os.path.join(workspace_dir, "fnf-업데이트.txt")
    
    print(f"Copying {src_path} to {dst_path}...")
    shutil.copy2(src_path, dst_path)
    
    # Read and parse
    with open(dst_path, "rb") as f:
        raw_bytes = f.read()
        
    # Try decoding with UTF-8
    try:
        content = raw_bytes.decode('utf-8')
    except UnicodeDecodeError:
        content = raw_bytes.decode('cp949', errors='ignore')
        
    # Find all "key": "value" or 'key': 'value' patterns
    pattern = r'[\'"]?(\d+)[\'"]?\s*:\s*[\'"]([^\'"]+)[\'"]'
    matches = re.findall(pattern, content)
    
    item_dict = {}
    for k, v in matches:
        item_dict[k] = v
        
    print(f"Parsed {len(item_dict)} items from file.")
    
    # Save as JSON
    json_path = os.path.join(workspace_dir, "items.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(item_dict, f, ensure_ascii=False, indent=2)
        
    print(f"Saved parsed items to {json_path}")
    return True

if __name__ == "__main__":
    copy_and_parse()
