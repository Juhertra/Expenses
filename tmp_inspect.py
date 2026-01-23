from pathlib import Path
p=Path('src/components/ExpenseTracker.tsx')
t=p.read_text(encoding='utf-8', errors='ignore')
start=t.index('const CATEGORY_LABELS_HE')
block=t[start:start+200]
print(block.encode('unicode_escape'))
