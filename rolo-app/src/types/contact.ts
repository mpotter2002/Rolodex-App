export interface CardColors {
  cardBg: string;
  cardBorder: string;
  accentHex: string;
  textColor: string;
  mutedColor: string;
  chipBg: string;
  chipBorder: string;
  chipColor: string;
  isDark: boolean;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  notes: string;
  category: string;
  createdAt: string;
  cardColors?: CardColors;
}

export interface Category {
  key: string;
  label: string;
}
