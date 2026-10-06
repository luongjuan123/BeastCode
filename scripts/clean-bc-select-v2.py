#!/usr/bin/env python3
"""
Robust cleanup: finds <select> elements that have BOTH:
  1) className="bc-select" on the <select line itself
  2) Another className="..." / className='...' / className={...} within the tag

When both are found, removes className="bc-select" from line 1.
The global CSS handles all <select> elements; bc-select class is redundant
when another className is already present.
"""
import re
import glob

BASE = "/home/juan/Work Space/leetcode-clone-youtube/src"
tsx_files = glob.glob(f"{BASE}/**/*.tsx", recursive=True)

def process(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # Find every <select ... > tag (not self-closing)
    # Pattern: opening <select, then everything up to the closing >
    # We need to handle multiline tags
    
    def fix_select_tag(tag):
        
        # Count occurrences of className in the tag
        cn_positions = [x.start() for x in re.finditer(r'className', tag)]
        
        if len(cn_positions) < 2:
            return tag  # Only one className — keep as-is
        
        # Has 2+ className props — remove the first one: className="bc-select"
        # The first className should be className="bc-select"
        first_match = re.search(r'\s+className="bc-select"', tag)
        if first_match:
            tag = tag[:first_match.start()] + tag[first_match.end():]
        
        return tag
    
    # Match <select opening tags: from <select up to the first bare >
    # We need to handle JSX expressions like {() => ...} inside the tag
    # Simple approach: find <select, collect chars until unmatched >
    result = []
    i = 0
    while i < len(content):
        if content[i:i+7] == '<select':
            # Collect the opening tag
            j = i + 7
            brace_depth = 0
            tag_end = -1
            while j < len(content):
                c = content[j]
                if c == '{':
                    brace_depth += 1
                elif c == '}':
                    brace_depth -= 1
                elif c == '>' and brace_depth == 0:
                    tag_end = j + 1
                    break
                j += 1
            
            if tag_end == -1:
                result.append(content[i])
                i += 1
                continue
            
            tag = content[i:tag_end]
            fixed = fix_select_tag(tag)
            result.append(fixed)
            i = tag_end
        else:
            result.append(content[i])
            i += 1
    
    content = "".join(result)
    
    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  Fixed: {path}")
        return True
    return False

changed = 0
for path in tsx_files:
    if "node_modules" in path or ".next" in path:
        continue
    if process(path):
        changed += 1

print(f"\nDone. Fixed {changed} files.")
