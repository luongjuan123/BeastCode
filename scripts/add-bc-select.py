#!/usr/bin/env python3
"""
Script to add 'bc-select' class to all native <select> elements in TSX files.
Idempotent: skips elements that already have bc-select class.
"""
import re
import os
import glob

# Files to process
BASE = "/home/juan/Work Space/leetcode-clone-youtube/src"
tsx_files = glob.glob(f"{BASE}/**/*.tsx", recursive=True)

SKIP_DIRS = ["node_modules", ".next", "dist"]

def should_skip(path):
    return any(d in path for d in SKIP_DIRS)

def process_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    def add_bc_select(m):
        tag = m.group(0)
        # Already has bc-select?
        if "bc-select" in tag:
            return tag
        # Has className="..."
        cls_match = re.search(r'className=\{?["`]([^"`]*)["`]\}?', tag)
        if cls_match:
            full = cls_match.group(0)
            classes = cls_match.group(1)
            # Prepend bc-select
            new_classes = f"bc-select {classes}".strip()
            new_full = full.replace(classes, new_classes, 1)
            return tag.replace(full, new_full, 1)
        else:
            # No className at all — inject one right after <select
            return tag.replace("<select", '<select className="bc-select"', 1)

    # Match <select...> tags (possibly multiline, not self-closing)
    # We match from <select to the closing > of the opening tag
    pattern = re.compile(r'<select(?:\s[^>]*)?>(?!\s*/>)', re.DOTALL)
    content = pattern.sub(add_bc_select, content)

    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  Updated: {path}")
        return True
    return False

changed = 0
for path in tsx_files:
    if should_skip(path):
        continue
    if process_file(path):
        changed += 1

print(f"\nDone. Updated {changed} files.")
