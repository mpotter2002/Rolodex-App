export type ColorPalette = {
  bg: string;
  bgSoft: string;
  panel: string;
  ink: string;
  muted: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  line: string;
  danger: string;
  success: string;
  link: string;
};

export const lightColors: ColorPalette = {
  bg: '#f5f5f7',
  bgSoft: '#e8e8ed',
  panel: '#ffffff',
  ink: '#1d1d1f',
  muted: '#6e6e73',
  accent: '#1d1d1f',
  onAccent: '#ffffff',
  accentSoft: '#f0f0f2',
  line: '#d2d2d7',
  danger: '#ff3b30',
  success: '#34c759',
  link: '#0071e3',
};

export const darkColors: ColorPalette = {
  bg: '#0d0d0f',
  bgSoft: '#3a3a3f',
  panel: '#1c1c1f',
  ink: '#f5f5f7',
  muted: '#98989e',
  accent: '#f0f0f3',
  onAccent: '#0d0d0f',
  accentSoft: '#2e2e33',
  line: '#3a3a3e',
  danger: '#ff453a',
  success: '#30d158',
  link: '#0a84ff',
};

// Backward compat — static light colors for files not yet on dynamic theme
export const colors = lightColors;

export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semiBold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  extraBold: 'DMSans_800ExtraBold',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
};
