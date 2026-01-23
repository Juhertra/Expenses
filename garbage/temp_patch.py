import json, codecs

def load_utf16(path):
    return json.load(codecs.open(path, 'r', 'utf-16'))

en_base = load_utf16('en_restore.json')
he_base = load_utf16('he_restore.json')

categories_en = {"Housing":"Housing","Food":"Food","Transportation":"Transportation","Utilities":"Utilities","Healthcare":"Healthcare","Entertainment":"Entertainment","Shopping":"Shopping","Education":"Education","Insurance":"Insurance","Savings":"Savings","Other":"Other"}
categories_he = {"Housing":"????","Food":"????","Transportation":"??????","Utilities":"???????","Healthcare":"??????","Entertainment":"?????","Shopping":"?????","Education":"?????","Insurance":"?????","Savings":"???????","Other":"???"}
emoji_themes_en = {"home":"Home","food":"Food","transport":"Transport","shopping":"Shopping","entertainment":"Entertainment","utilities":"Utilities","health":"Health","finance":"Finance","education":"Education","other":"Other"}
emoji_themes_he = {"home":"???","food":"????","transport":"??????","shopping":"?????","entertainment":"?????","utilities":"???????","health":"??????","finance":"???????","education":"?????","other":"???"}
add_label_defaults_en = {"paid":"Paid","fairShare":"Fair Share","iconEmoji":"Icon (Emoji)","noteOptional":"Note (optional)"}
add_label_defaults_he = {"paid":"????","fairShare":"??? ????","iconEmoji":"??? (??????)","noteOptional":"???? (?????????)"}
msg_defaults_en = {"partnerOwes":"{{from}} owes {{to}}","searchBreadcrumb":"Search: {{query}}"}
msg_defaults_he = {"partnerOwes":"{{from}} ???? ?{{to}}","searchBreadcrumb":"?????: {{query}}"}
placeholders_en = {"transferExample":"e.g., bank transfer"}
placeholders_he = {"transferExample":"??????, ????? ??????"}
commands_en = {"transactionSummary":"Transaction summary"}
commands_he = {"transactionSummary":"????? ????"}
tooltip_en = {"emojiAlreadyUsed":"Already used","selectEmoji":"Select emoji"}
tooltip_he = {"emojiAlreadyUsed":"??? ??????","selectEmoji":"??? ??????"}

def merge_into(base, section, kv):
    if section not in base:
        base[section] = {}
    for k, v in kv.items():
        if k not in base[section]:
            base[section][k] = v

for base, cats, labels_add, msgs, ph, cmds, emojis in [
    (en_base, categories_en, add_label_defaults_en, msg_defaults_en, placeholders_en, commands_en, emoji_themes_en),
    (he_base, categories_he, add_label_defaults_he, msg_defaults_he, placeholders_he, commands_he, emoji_themes_he),
]:
    merge_into(base, 'categories', cats)
    merge_into(base, 'labels', labels_add)
    merge_into(base, 'messages', msgs)
    merge_into(base, 'placeholders', ph)
    merge_into(base, 'commands', cmds)
    merge_into(base, 'emojiThemes', emojis)

merge_into(en_base, 'tooltips', tooltip_en)
merge_into(he_base, 'tooltips', tooltip_he)

json.dump(en_base, open('src/i18n/en.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump(he_base, open('src/i18n/he.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print('updated')
