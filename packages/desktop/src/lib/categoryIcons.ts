/**
 * Categorized icon library for custom categories
 */

export interface IconDefinition {
  id: string;
  emoji: string;
  keywords: string[];
}

export interface IconCategory {
  id: string;
  icons: IconDefinition[];
}

export const CATEGORY_ICONS: IconCategory[] = [
  {
    id: 'transport',
    icons: [
      { id: 'car', emoji: '🚗', keywords: ['car', 'auto', 'vehicle', 'drive'] },
      { id: 'bus', emoji: '🚌', keywords: ['bus', 'public', 'transport'] },
      { id: 'taxi', emoji: '🚕', keywords: ['taxi', 'cab', 'ride'] },
      { id: 'bike', emoji: '🚲', keywords: ['bike', 'bicycle', 'cycle'] },
      { id: 'train', emoji: '🚆', keywords: ['train', 'railway', 'rail'] },
      { id: 'airplane', emoji: '✈️', keywords: ['airplane', 'plane', 'flight', 'air'] },
      { id: 'boat', emoji: '🚤', keywords: ['boat', 'ship', 'water'] },
      { id: 'scooter', emoji: '🛴', keywords: ['scooter', 'kick'] },
      { id: 'fuel', emoji: '⛽', keywords: ['fuel', 'gas', 'petrol', 'station'] },
      { id: 'metro', emoji: '🚇', keywords: ['metro', 'subway', 'underground'] },
    ],
  },
  {
    id: 'shopping',
    icons: [
      { id: 'cart', emoji: '🛒', keywords: ['cart', 'shopping', 'grocery'] },
      { id: 'bag', emoji: '🛍️', keywords: ['bag', 'shopping', 'store'] },
      { id: 'gift', emoji: '🎁', keywords: ['gift', 'present', 'surprise'] },
      { id: 'dress', emoji: '👗', keywords: ['dress', 'clothing', 'fashion'] },
      { id: 'tshirt', emoji: '👕', keywords: ['shirt', 'tshirt', 'clothing'] },
      { id: 'shoes', emoji: '👟', keywords: ['shoes', 'sneakers', 'footwear'] },
      { id: 'jeans', emoji: '👖', keywords: ['jeans', 'pants', 'trousers'] },
      { id: 'coat', emoji: '🧥', keywords: ['coat', 'jacket', 'outerwear'] },
      { id: 'hat', emoji: '🎩', keywords: ['hat', 'cap', 'headwear'] },
      { id: 'package', emoji: '📦', keywords: ['package', 'box', 'delivery'] },
    ],
  },
  {
    id: 'food',
    icons: [
      { id: 'burger', emoji: '🍔', keywords: ['burger', 'hamburger', 'fast', 'food'] },
      { id: 'pizza', emoji: '🍕', keywords: ['pizza', 'italian', 'food'] },
      { id: 'ramen', emoji: '🍜', keywords: ['ramen', 'noodles', 'soup'] },
      { id: 'sushi', emoji: '🍱', keywords: ['sushi', 'japanese', 'bento'] },
      { id: 'coffee', emoji: '☕', keywords: ['coffee', 'cafe', 'drink'] },
      { id: 'donut', emoji: '🍩', keywords: ['donut', 'doughnut', 'sweet'] },
      { id: 'cake', emoji: '🍰', keywords: ['cake', 'dessert', 'sweet'] },
      { id: 'restaurant', emoji: '🍽️', keywords: ['restaurant', 'dining', 'eat'] },
      { id: 'vegetables', emoji: '🥗', keywords: ['salad', 'vegetables', 'healthy'] },
      { id: 'fruit', emoji: '🍎', keywords: ['fruit', 'apple', 'healthy'] },
    ],
  },
  {
    id: 'home',
    icons: [
      { id: 'house', emoji: '🏠', keywords: ['house', 'home', 'building'] },
      { id: 'building', emoji: '🏢', keywords: ['building', 'office', 'apartment'] },
      { id: 'couch', emoji: '🛋️', keywords: ['couch', 'sofa', 'furniture'] },
      { id: 'bed', emoji: '🛏️', keywords: ['bed', 'bedroom', 'sleep'] },
      { id: 'bulb', emoji: '💡', keywords: ['bulb', 'light', 'electricity', 'idea'] },
      { id: 'key', emoji: '🔑', keywords: ['key', 'lock', 'security'] },
      { id: 'tools', emoji: '🔧', keywords: ['tools', 'wrench', 'repair', 'fix'] },
      { id: 'cleaning', emoji: '🧹', keywords: ['cleaning', 'broom', 'clean'] },
      { id: 'water', emoji: '💧', keywords: ['water', 'drop', 'liquid'] },
      { id: 'fire', emoji: '🔥', keywords: ['fire', 'flame', 'heat'] },
    ],
  },
  {
    id: 'entertainment',
    icons: [
      { id: 'movie', emoji: '🎬', keywords: ['movie', 'film', 'cinema'] },
      { id: 'music', emoji: '🎵', keywords: ['music', 'song', 'note'] },
      { id: 'game', emoji: '🎮', keywords: ['game', 'gaming', 'video'] },
      { id: 'party', emoji: '🎉', keywords: ['party', 'celebration', 'fun'] },
      { id: 'tv', emoji: '📺', keywords: ['tv', 'television', 'screen'] },
      { id: 'camera', emoji: '📷', keywords: ['camera', 'photo', 'picture'] },
      { id: 'art', emoji: '🎨', keywords: ['art', 'painting', 'creative'] },
      { id: 'guitar', emoji: '🎸', keywords: ['guitar', 'music', 'instrument'] },
      { id: 'microphone', emoji: '🎤', keywords: ['microphone', 'mic', 'sing'] },
      { id: 'ticket', emoji: '🎫', keywords: ['ticket', 'event', 'show'] },
    ],
  },
  {
    id: 'health',
    icons: [
      { id: 'hospital', emoji: '🏥', keywords: ['hospital', 'medical', 'doctor'] },
      { id: 'pill', emoji: '💊', keywords: ['pill', 'medicine', 'drug'] },
      { id: 'gym', emoji: '💪', keywords: ['gym', 'muscle', 'strength', 'fitness'] },
      { id: 'running', emoji: '🏃', keywords: ['running', 'run', 'exercise', 'jog'] },
      { id: 'yoga', emoji: '🧘', keywords: ['yoga', 'meditation', 'zen'] },
      { id: 'heart', emoji: '❤️', keywords: ['heart', 'love', 'health'] },
      { id: 'apple', emoji: '🍏', keywords: ['apple', 'fruit', 'healthy'] },
      { id: 'bicycle', emoji: '🚴', keywords: ['bicycle', 'cycling', 'bike'] },
      { id: 'swimming', emoji: '🏊', keywords: ['swimming', 'swim', 'pool'] },
      { id: 'meditation', emoji: '🧘‍♀️', keywords: ['meditation', 'mindfulness', 'calm'] },
    ],
  },
  {
    id: 'finance',
    icons: [
      { id: 'money', emoji: '💰', keywords: ['money', 'cash', 'bag'] },
      { id: 'card', emoji: '💳', keywords: ['card', 'credit', 'debit'] },
      { id: 'bank', emoji: '🏦', keywords: ['bank', 'banking', 'finance'] },
      { id: 'chart', emoji: '📈', keywords: ['chart', 'graph', 'growth', 'stock'] },
      { id: 'receipt', emoji: '🧾', keywords: ['receipt', 'bill', 'invoice'] },
      { id: 'piggy', emoji: '🐷', keywords: ['piggy', 'pig', 'savings', 'save'] },
      { id: 'dollar', emoji: '💵', keywords: ['dollar', 'bill', 'money'] },
      { id: 'coin', emoji: '🪙', keywords: ['coin', 'money', 'change'] },
      { id: 'safe', emoji: '🔒', keywords: ['safe', 'lock', 'secure', 'vault'] },
      { id: 'wallet', emoji: '👛', keywords: ['wallet', 'purse', 'money'] },
    ],
  },
  {
    id: 'education',
    icons: [
      { id: 'school', emoji: '🎓', keywords: ['school', 'education', 'graduate', 'study'] },
      { id: 'book', emoji: '📚', keywords: ['book', 'books', 'library', 'read'] },
      { id: 'briefcase', emoji: '💼', keywords: ['briefcase', 'work', 'business', 'job'] },
      { id: 'laptop', emoji: '💻', keywords: ['laptop', 'computer', 'work', 'tech'] },
      { id: 'pencil', emoji: '✏️', keywords: ['pencil', 'write', 'draw'] },
      { id: 'notebook', emoji: '📓', keywords: ['notebook', 'note', 'journal'] },
      { id: 'phone', emoji: '📱', keywords: ['phone', 'mobile', 'smartphone'] },
      { id: 'calculator', emoji: '🧮', keywords: ['calculator', 'calculate', 'math'] },
      { id: 'paperclip', emoji: '📎', keywords: ['paperclip', 'clip', 'attach'] },
      { id: 'chart-bar', emoji: '📊', keywords: ['chart', 'bar', 'graph', 'data'] },
    ],
  },
  {
    id: 'pets',
    icons: [
      { id: 'dog', emoji: '🐕', keywords: ['dog', 'pet', 'puppy'] },
      { id: 'cat', emoji: '🐈', keywords: ['cat', 'pet', 'kitten'] },
      { id: 'bird', emoji: '🐦', keywords: ['bird', 'pet', 'avian'] },
      { id: 'fish', emoji: '🐠', keywords: ['fish', 'pet', 'aquarium'] },
      { id: 'paw', emoji: '🐾', keywords: ['paw', 'pet', 'animal'] },
      { id: 'bone', emoji: '🦴', keywords: ['bone', 'dog', 'pet'] },
    ],
  },
  {
    id: 'misc',
    icons: [
      { id: 'star', emoji: '⭐', keywords: ['star', 'favorite', 'important'] },
      { id: 'rocket', emoji: '🚀', keywords: ['rocket', 'space', 'launch', 'fast'] },
      { id: 'trophy', emoji: '🏆', keywords: ['trophy', 'win', 'award', 'prize'] },
      { id: 'bell', emoji: '🔔', keywords: ['bell', 'notification', 'alert'] },
      { id: 'calendar', emoji: '📅', keywords: ['calendar', 'date', 'schedule'] },
      { id: 'clock', emoji: '⏰', keywords: ['clock', 'time', 'alarm'] },
      { id: 'mail', emoji: '✉️', keywords: ['mail', 'email', 'message'] },
      { id: 'flag', emoji: '🚩', keywords: ['flag', 'marker', 'important'] },
      { id: 'tag', emoji: '🏷️', keywords: ['tag', 'label', 'price'] },
      { id: 'diamond', emoji: '💎', keywords: ['diamond', 'gem', 'luxury', 'valuable'] },
    ],
  },
];

/**
 * Get all icons flattened into a single array
 */
export function getAllIcons(): IconDefinition[] {
  return CATEGORY_ICONS.flatMap(category => category.icons);
}

/**
 * Search icons by keyword
 */
export function searchIcons(query: string): IconDefinition[] {
  if (!query.trim()) {
    return getAllIcons();
  }

  const searchTerm = query.toLowerCase();
  return getAllIcons().filter(icon =>
    icon.id.includes(searchTerm) ||
    icon.keywords.some(keyword => keyword.includes(searchTerm))
  );
}

/**
 * Get icon by ID
 */
export function getIconById(id: string): IconDefinition | undefined {
  return getAllIcons().find(icon => icon.id === id);
}
