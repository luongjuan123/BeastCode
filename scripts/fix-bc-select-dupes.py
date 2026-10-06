#!/usr/bin/env python3
"""
Fix duplicate className props on <select> elements introduced by add-bc-select.py.
Merges the two className attributes into one bc-select combined class.
"""
import re
import os
import glob

BASE = "/home/juan/Work Space/leetcode-clone-youtube/src"
tsx_files = glob.glob(f"{BASE}/**/*.tsx", recursive=True)

def fix_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # Pattern: <select className="bc-select"\n...\tclassName="..."
    # We need to find consecutive className attrs on same <select> tag.
    # Strategy: find the JSX open-tag for select elements that have two className props.
    
    # Match select open tags from < to >
    # We'll scan token by token
    
    i = 0
    result = []
    
    while i < len(content):
        # Look for <select  
        m = re.search(r'<select\b', content[i:])
        if not m:
            result.append(content[i:])
            break
        
        # Append content before the <select
        result.append(content[i: i + m.start()])
        i += m.start()
        
        # Now find the end of this opening tag (not self-closing)
        # We need to find the closing > that is NOT />
        tag_start = i
        depth = 0
        j = i + 1
        tag_end = -1
        while j < len(content):
            if content[j] == '{':
                depth += 1
            elif content[j] == '}':
                depth -= 1
            elif content[j] == '>' and depth == 0:
                tag_end = j + 1
                break
            j += 1
        
        if tag_end == -1:
            result.append(content[i:])
            break
        
        tag_str = content[i:tag_end]
        
        # Check if there are 2 className= props in this tag
        cn_matches = list(re.finditer(r'className=', tag_str))
        
        if len(cn_matches) >= 2:
            # Extract both className values
            # First className (the one we added: "bc-select")
            first_m = re.search(r'className=(?:{`([^`]*)`}|{\'([^\']*)\'}|"([^"]*)")', tag_str)
            # Find the second one
            second_m = re.search(r'className=(?:{`([^`]*)`}|{\'([^\']*)\'}|"([^"]*)")', tag_str[cn_matches[1].start():])
            
            if first_m and second_m:
                first_val = first_m.group(1) or first_m.group(2) or first_m.group(3) or ""
                second_val = second_m.group(1) or second_m.group(2) or second_m.group(3) or ""
                
                # Merge: bc-select + second classes (deduplicating bc-select)
                all_classes = set(first_val.split()) | set(second_val.split())
                merged = "bc-select " + " ".join(c for c in second_val.split() if c != "bc-select")
                merged = merged.strip()
                
                # Replace the FIRST className with the merged value
                new_tag = tag_str[:first_m.start()] + f'className="{merged}"' + tag_str[first_m.end():]
                
                # Remove the SECOND className prop entirely
                # Recalculate position of second className in new_tag
                second_in_new = list(re.finditer(r'\n?\t*className=(?:{`[^`]*`}|{\'[^\']*\'}|"[^"]*")', new_tag))
                if len(second_in_new) >= 2:
                    s2 = second_in_new[1]
                    new_tag = new_tag[:s2.start()] + new_tag[s2.end():]
                
                result.append(new_tag)
                i = tag_end
                continue
        
        result.append(tag_str)
        i = tag_end
    
    content = "".join(result)
    
    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  Fixed: {path}")
        return True
    return False

changed = 0
for path in tsx_files:
    if fix_file(path):
        changed += 1

print(f"\nDone. Fixed {changed} files.")
