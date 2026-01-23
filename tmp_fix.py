from pathlib import Path
import re
p=Path('src/components/ExpenseTracker.tsx')
text=p.read_text(encoding='utf-8', errors='ignore')
replacement = """  const DEFAULT_CATEGORIES: Record<string, Category> = {\n    Housing: { icon: '🏠', color: 'bg-orange-500' },\n    Food: { icon: '🍔', color: 'bg-green-500' },\n    Transportation: { icon: '🚗', color: 'bg-blue-500' },\n    Utilities: { icon: '💡', color: 'bg-yellow-500' },\n    Healthcare: { icon: '💊', color: 'bg-red-500' },\n    Entertainment: { icon: '🎮', color: 'bg-purple-500' },\n    Shopping: { icon: '🛍️', color: 'bg-pink-500' },\n    Education: { icon: '📚', color: 'bg-indigo-500' },\n    Insurance: { icon: '🛡️', color: 'bg-cyan-500' },\n    Savings: { icon: '💰', color: 'bg-emerald-500' },\n    Other: { icon: '📌', color: 'bg-gray-500' }\n  };\n\n  // Curated emoji list for category picker\n  const CURATED_EMOJIS = {\n    home: ['🏠', '🏡', '🏘️', '🏚️', '🏢'],\n    food: ['🍔', '🍕', '🍜', '🍣', '🥗', '🍩'],\n    transport: ['🚗', '🚌', '🚕', '🚙', '🚲', '✈️', '🚆'],\n    shopping: ['🛍️', '🛒', '🎁', '👗', '👟'],\n    entertainment: ['🎮', '🎬', '🎤', '🎧', '🎟️'],\n    utilities: ['💡', '🔌', '🧯', '🚰', '🏷️'],\n    health: ['💊', '🩺', '💉', '🧴', '🍎'],\n    finance: ['💰', '🏦', '💳', '📈', '🧾'],\n    education: ['📚', '📝', '🎓', '✏️', '📖'],\n    other: ['📌', '📦', '🗂️', '📁', '🧩']\n  };\n"""
pattern=re.compile(r"  const DEFAULT_CATEGORIES:[\s\S]+?  // Curated emoji list for category picker\n  const CURATED_EMOJIS = {\n[\s\S]+?};\n", re.M)
m=pattern.search(text)
if not m:
    raise SystemExit('block not found')
text=text[:m.start()]+replacement+text[m.end():]
p.write_text(text, encoding='utf-8')
print('defaults replaced')
