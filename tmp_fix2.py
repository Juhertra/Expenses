from pathlib import Path
p=Path('src/components/ExpenseTracker.tsx')
text=p.read_text(encoding='utf-8', errors='ignore')
start=text.index('const CATEGORY_LABELS_HE')
end=text.index('};', start)
replacement="""const CATEGORY_LABELS_HE: Record<string, string> = {
    Housing: 'דיור',
    Food: 'מזון',
    Transportation: 'תחבורה',
    Utilities: 'חשבונות',
    Healthcare: 'בריאות',
    Entertainment: 'בידור',
    Shopping: 'קניות',
    Education: 'חינוך',
    Insurance: 'ביטוח',
    Savings: 'חסכונות',
    Other: 'אחר'
  };"""
text = text[:start] + replacement + text[end+2:]
p.write_text(text, encoding='utf-8')
print('labels replaced via slice')
