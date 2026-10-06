#!/usr/bin/env python3
"""
Clean up duplicate className="bc-select" props added to <select> elements.

Strategy:
- The global CSS in @layer base already styles ALL <select> elements.
- We only need className="bc-select" when there is NO other className.
- When a <select> has both className="bc-select" AND another className="...",
  remove className="bc-select" (keep the original className).
- When a <select> only has className="bc-select" and no other className, keep it.

This script is idempotent.
"""
import re
import os
import glob

BASE = "/home/juan/Work Space/leetcode-clone-youtube/src"
tsx_files = glob.glob(f"{BASE}/**/*.tsx", recursive=True)

def fix_file(path):
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    original = "".join(lines)
    result = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this line starts a <select with className="bc-select" only
        stripped = line.rstrip()
        if re.search(r'<select\s+className="bc-select"\s*$', stripped):
            # Look ahead: next non-whitespace line might have another className
            lookahead = i + 1
            while lookahead < len(lines) and not lines[lookahead].strip():
                lookahead += 1
            
            if lookahead < len(lines):
                next_stripped = lines[lookahead].strip()
                # If the next prop line starts with className= (another one), skip this bc-select line
                if next_stripped.startswith('className=') and 'bc-select' not in next_stripped:
                    # Remove this line (the className="bc-select" on <select)
                    # Replace <select className="bc-select" with just <select
                    new_line = re.sub(r'\s+className="bc-select"', '', line)
                    result.append(new_line)
                    i += 1
                    continue
        
        result.append(line)
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
    if fix_file(path):
        changed += 1

print(f"\nDone. Fixed {changed} files.")
