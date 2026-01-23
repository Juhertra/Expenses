import json, pathlib
p = pathlib.Path('src/i18n/he.json')
data = json.load(p.open(encoding='utf-8'))
settings = data.get('settings', {})
settings.update({
    'tabs': {'settings': 'הגדרות', 'shortcuts': 'קיצורי מקלדת'},
    'searchPlaceholder': 'חיפוש בהגדרות...',
    'sections': {
        'general': 'כללי',
        'household': 'משק בית',
        'dataBackup': 'נתונים וגיבוי',
        'appearance': 'מראה'
    },
    'hint': 'השינויים נשמרים מקומית.',
    'shortcutsTitle': 'קיצורי מקלדת',
    'shortcutsHint': 'Cmd+N הוספת תנועה • Cmd+K פקודות • Cmd+, הגדרות • Esc סגירה',
    'noMatchesTitle': 'לא נמצאו תוצאות',
    'noMatchesHint': 'נסו לחפש “מטבע”, “ייצוא”, “ערכת נושא”, או “שפה”.',
    'appearance': 'מראה',
    'theme': 'ערכת נושא',
    'darkPurple': 'סגול כהה',
    'oceanBlue': 'כחול אוקיינוס',
    'minimal': 'מינימליסטי'
})
data['settings'] = settings
p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
