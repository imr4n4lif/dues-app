export interface PaletteColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderStrong: string;

  accent: string;
  accentSoft: string;
  onAccent: string;

  borrowed: string;
  borrowedSoft: string;
  lent: string;
  lentSoft: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  scrim: string;
}

/**
 * Emerald-forward palette — calm warm neutrals with a confident green accent
 * that reads "settled/money" in both themes. Borrowed keeps an amber hue,
 * lent shifts to sky blue so the two directions stay unmistakable.
 */
export const lightPalette: PaletteColors = {
  background: '#F8F9F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F3F1',
  textPrimary: '#141A17',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  accent: '#0E9F6E',
  accentSoft: '#E3F5EE',
  onAccent: '#FFFFFF',

  borrowed: '#B45309',
  borrowedSoft: '#FCF0DF',
  lent: '#0369A1',
  lentSoft: '#E3F0FA',

  success: '#15803D',
  successSoft: '#E7F6EC',
  warning: '#B45309',
  warningSoft: '#FBF1DE',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  info: '#2563EB',
  infoSoft: '#EAF1FE',

  scrim: 'rgba(20, 26, 23, 0.45)',
};

export const darkPalette: PaletteColors = {
  background: '#0D1117',
  surface: '#161D22',
  surfaceMuted: '#1E272E',
  textPrimary: '#F0F3F1',
  textSecondary: '#9BA5A0',
  textTertiary: '#6B7570',
  border: '#273135',
  borderStrong: '#3A464B',

  accent: '#3DD68C',
  accentSoft: 'rgba(61, 214, 140, 0.15)',
  onAccent: '#08110D',

  borrowed: '#F5A524',
  borrowedSoft: 'rgba(245, 165, 36, 0.13)',
  lent: '#58B6FF',
  lentSoft: 'rgba(88, 182, 255, 0.13)',

  success: '#4ADE80',
  successSoft: 'rgba(74, 222, 128, 0.13)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  danger: '#F87171',
  dangerSoft: 'rgba(249, 112, 102, 0.15)',
  info: '#60A5FA',
  infoSoft: 'rgba(97, 166, 250, 0.14)',

  scrim: 'rgba(0, 0, 0, 0.6)',
};
