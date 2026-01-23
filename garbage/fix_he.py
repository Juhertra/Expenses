import json, codecs, pathlib
he = json.load(codecs.open('he_restore.json','r','utf-16'))

he['categories'] = {
    'Housing': '\u05d3\u05d9\u05d5\u05e8',
    'Food': '\u05de\u05d6\u05d5\u05df',
    'Transportation': '\u05ea\u05d7\u05d1\u05d5\u05e8\u05d4',
    'Utilities': '\u05e9\u05d9\u05e8\u05d5\u05ea\u05d9\u05dd',
    'Healthcare': '\u05d1\u05e8\u05d9\u05d0\u05d5\u05ea',
    'Entertainment': '\u05d1\u05d9\u05d3\u05d5\u05e8',
    'Shopping': '\u05e7\u05e0\u05d9\u05d5\u05ea',
    'Education': '\u05d7\u05d9\u05e0\u05d5\u05da',
    'Insurance': '\u05d1\u05d9\u05d8\u05d5\u05d7',
    'Savings': '\u05d7\u05e1\u05db\u05d5\u05e0\u05d5\u05ea',
    'Other': '\u05d0\u05d7\u05e8'
}

he.setdefault('emojiThemes', {}).update({
    'home': '\u05d1\u05d9\u05ea',
    'food': '\u05de\u05d6\u05d5\u05df',
    'transport': '\u05ea\u05d7\u05d1\u05d5\u05e8\u05d4',
    'shopping': '\u05e7\u05e0\u05d9\u05d5\u05ea',
    'entertainment': '\u05d1\u05d9\u05d3\u05d5\u05e8',
    'utilities': '\u05e9\u05d9\u05e8\u05d5\u05ea\u05d9\u05dd',
    'health': '\u05d1\u05e8\u05d9\u05d0\u05d5\u05ea',
    'finance': '\u05e4\u05d9\u05e0\u05e0\u05e1\u05d9\u05dd',
    'education': '\u05d7\u05d9\u05e0\u05d5\u05da',
    'other': '\u05d0\u05d7\u05e8'
})

he.setdefault('labels', {}).update({
    'paid': '\u05e9\u05d5\u05dc\u05dd',
    'fairShare': '\u05d7\u05dc\u05e7 \u05d4\u05d5\u05d2\u05df',
    'iconEmoji': '\u05e1\u05de\u05dc (\u05d0\u05de\u05d5\u05d2\u05f3\u05d9)',
    'noteOptional': '\u05d4\u05e2\u05e8\u05d4 (\u05d0\u05d5\u05e4\u05e6\u05d9\u05d5\u05e0\u05dc\u05d9)'
})

he.setdefault('messages', {}).update({
    'partnerOwes': '{{from}} \u05d7\u05d9\u05d9\u05d1 \u05dc{{to}}',
    'searchBreadcrumb': '\u05d7\u05d9\u05e4\u05d5\u05e9: {{query}}'
})

he.setdefault('placeholders', {}).update({
    'transferExample': '\u05dc\u05d3\u05d5\u05d2\u05de\u05d4, \u05d4\u05e2\u05d1\u05e8\u05d4 \u05d1\u05e0\u05e7\u05d0\u05d9\u05ea'
})

he.setdefault('commands', {}).update({
    'transactionSummary': '\u05e1\u05d9\u05db\u05d5\u05dd \u05e2\u05e1\u05e7\u05d0'
})

he.setdefault('tooltips', {}).update({
    'emojiAlreadyUsed': '\u05db\u05d1\u05e8 \u05d1\u05e9\u05d9\u05de\u05d5\u05e9',
    'selectEmoji': '\u05d1\u05d7\u05e8 \u05d0\u05de\u05d5\u05d2\u05f3\u05d9'
})

pathlib.Path('src/i18n/he.json').write_text(json.dumps(he, ensure_ascii=False, indent=2), encoding='utf-8')
print('he.json rewritten with proper Hebrew')
