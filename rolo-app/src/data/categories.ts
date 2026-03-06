import { Category } from '../types/contact';

export const CATEGORIES: Category[] = [
  { key: 'food', label: '🍽️ Food & Dining' },
  { key: 'transport', label: '🚗 Transport' },
  { key: 'events', label: '🎉 Events' },
  { key: 'florists', label: '💐 Florists' },
  { key: 'hotels', label: '🏨 Hotels' },
  { key: 'wellness', label: '💆 Wellness' },
  { key: 'medical', label: '🏥 Medical' },
  { key: 'legal', label: '⚖️ Legal' },
  { key: 'realestate', label: '🏠 Real Estate' },
  { key: 'business', label: '💼 Business' },
];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['restaurant', 'chef', 'catering', 'bistro', 'cafe', 'bar', 'culinary', 'bakery', 'sommelier', 'dining', 'cuisine', 'food'],
  transport: ['car', 'limo', 'limousine', 'driver', 'transport', 'logistics', 'taxi', 'chauffeur', 'delivery', 'courier', 'fleet'],
  events: ['event', 'party', 'wedding', 'planner', 'entertainment', 'dj', 'venue', 'banquet', 'caterer', 'coordinator'],
  florists: ['florist', 'flower', 'floral', 'bouquet', 'arrangement'],
  hotels: ['hotel', 'resort', 'concierge', 'hospitality', 'inn', 'lodge', 'suites', 'rooms'],
  wellness: ['spa', 'wellness', 'yoga', 'fitness', 'massage', 'salon', 'beauty', 'nail', 'hair', 'aesthetician'],
  medical: ['doctor', 'medical', 'health', 'dental', 'physician', 'clinic', 'therapy', 'therapist', 'nurse', 'pharmacist'],
  legal: ['attorney', 'lawyer', 'legal', 'law firm', 'counsel', 'notary', 'paralegal'],
  realestate: ['real estate', 'realtor', 'property', 'realty', 'broker', 'appraiser', 'mortgage'],
  business: ['consulting', 'finance', 'accounting', 'insurance', 'marketing', 'tech', 'software', 'startup'],
};

export function suggestCategory(title: string, company: string): string {
  const text = `${title || ''} ${company || ''}`.toLowerCase();
  for (const [key, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return key;
  }
  return '';
}

export function getCategoryLabel(key: string): string {
  const cat = CATEGORIES.find((c) => c.key === key);
  return cat ? cat.label : key || '';
}
