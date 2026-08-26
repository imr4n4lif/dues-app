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

export const lightPalette: PaletteColors = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F2F5',
  textPrimary: '#101828',
  textSecondary: '#475467',
  textTertiary: '#98A2B3',
  border: '#E4E7EC',
  borderStrong: '#D0D5DD',

  accent: '#4F46E5',
  accentSoft: '#EEF0FE',
  onAccent: '#FFFFFF',

  borrowed: '#C2620A',
  borrowedSoft: '#FDF0DF',
  lent: '#0E8F80',
  lentSoft: '#E3F6F3',

  success: '#15803D',
  successSoft: '#E7F6EC',
  warning: '#B45309',
  warningSoft: '#FCF1DE',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  info: '#2563EB',
  infoSoft: '#EAF1FE',

  scrim: 'rgba(16, 24, 40, 0.45)',
};

export const darkPalette: PaletteColors = {
  background: '#0E1116',
  surface: '#161B22',
  surfaceMuted: '#1D242E',
  textPrimary: '#F2F4F7',
  textSecondary: '#98A2B3',
  textTertiary: '#667085',
  border: '#272F3B',
  borderStrong: '#39414E',

  accent: '#818CF8',
  accentSoft: 'rgba(129, 140, 248, 0.16)',
  onAccent: '#0E1116',

  borrowed: '#F5A524',
  borrowedSoft: 'rgba(245, 165, 36, 0.14)',
  lent: '#33D6C3',
  lentSoft: 'rgba(51, 214, 195, 0.12)',

  success: '#5BD975',
  successSoft: 'rgba(91, 217, 117, 0.14)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  danger: '#F97066',
  dangerSoft: 'rgba(249, 112, 102, 0.15)',
  info: '#61A6FA',
  infoSoft: 'rgba(97, 166, 250, 0.14)',

  scrim: 'rgba(0, 0, 0, 0.6)',
};
