import json, codecs, os, pathlib

def load_utf16(path):
    return json.load(codecs.open(path, 'r', 'utf-16'))

en_base = load_utf16('en_restore.json')
he_base = load_utf16('he_restore.json')

categories_en = {
    "Housing": "Housing",
    "Food": "Food",
    "Transportation": "Transportation",
    "Utilities": "Utilities",
    "Healthcare": "Healthcare",
    "Entertainment": "Entertainment",
    "Shopping": "Shopping",
    "Education": "Education",
    "Insurance": "Insurance",
    "Savings": "Savings",
    "Other": "Other"
}

categories_he = {
    "Housing": "????",
    "Food": "????",
    "Transportation": "??????",
    "Utilities": "???????",
    "Healthcare": "??????",
    "Entertainment": "?????",
    "Shopping": "?????",
    "Education": "?????",
    "Insurance": "?????",
    "Savings": "???????",
    "Other": "???"
}

emoji_themes_en = {
    "home": "Home",
    "food": "Food",
    "transport": "Transport",
    "shopping": "Shopping",
    "entertainment": "Entertainment",
    "utilities": "Utilities",
    "health": "Health",
    "finance": "Finance",
    "education": "Education",
    "other": "Other"
}

emoji_themes_he = {
    "home": "???",
    "food": "????",
    "transport": "??????",
    "shopping": "?????",
    "entertainment": "?????",
    "utilities": "???????",
    "health": "??????",
    "finance": "???????",
    "education": "?????",
    "other": "???"
}

labels_en = {
    "paid": "Paid",
    "fairShare": "Fair Share",
    "iconEmoji": "Icon (Emoji)",
    "noteOptional": "Note (optional)"
}

labels_he = {
    "paid": "????",
    "fairShare": "??? ????",
    "iconEmoji": "??? (??????)",
    "noteOptional": "???? (?????????)"
}

messages_en = {
    "partnerOwes": "{{from}} owes {{to}}",
    "searchBreadcrumb": "Search: {{query}}"
}

messages_he = {
    "partnerOwes": "{{from}} ???? ?{{to}}",
    "searchBreadcrumb": "?????: {{query}}"
}

placeholders_en = {"transferExample": "e.g., bank transfer"}
placeholders_he = {"transferExample": "??????, ????? ??????"}

commands_en = {"transactionSummary": "Transaction summary"}
commands_he = {"transactionSummary": "????? ????"}

tooltips_en = {"emojiAlreadyUsed": "Already used", "selectEmoji": "Select emoji"}
tooltips_he = {"emojiAlreadyUsed": "??? ??????", "selectEmoji": "??? ??????"}

def merge_missing(base, section, kv):
    if section not in base:
        base[section] = {}
    for k, v in kv.items():
        if k not in base[section] or base[section][k] in ('', '????'):
            base[section][k] = v

for base, cats, labels, msgs, ph, cmds, emojis in [
    (en_base, categories_en, labels_en, messages_en, placeholders_en, commands_en, emoji_themes_en),
    (he_base, categories_he, labels_he, messages_he, placeholders_he, commands_he, emoji_themes_he),
]:
    merge_missing(base, 'categories', cats)
    merge_missing(base, 'labels', labels)
    merge_missing(base, 'messages', msgs)
    merge_missing(base, 'placeholders', ph)
    merge_missing(base, 'commands', cmds)
    merge_missing(base, 'emojiThemes', emojis)

merge_missing(en_base, 'tooltips', tooltips_en)
merge_missing(he_base, 'tooltips', tooltips_he)

pathlib.Path('src/i18n/en.json').write_text(json.dumps(en_base, ensure_ascii=False, indent=2), encoding='utf-8')
pathlib.Path('src/i18n/he.json').write_text(json.dumps(he_base, ensure_ascii=False, indent=2), encoding='utf-8')
print('rewritten en.json & he.json as UTF-8 with Hebrew intact')
