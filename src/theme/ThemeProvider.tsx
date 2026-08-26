import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

import { ThemePreference } from '../types';
import { darkPalette, lightPalette, PaletteColors } from './colors';
import { radius, spacing } from './spacing';
import { fontSize, fontWeight, typography } from './typography';

export interface Theme {
  colors: PaletteColors;
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  typography: typeof typography;
}

const ThemeContext = createContext<Theme | null>(null);

function resolvePalette(preference: ThemePreference, systemScheme: ColorSchemeName): { palette: PaletteColors; isDark: boolean } {
  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';
  return { palette: isDark ? darkPalette : lightPalette, isDark };
}

interface ThemeModeProviderProps {
  preference: ThemePreference;
  children: React.ReactNode;
}

/** Resolves the active palette from the user's preference + system scheme. */
export function ThemeModeProvider({ preference, children }: ThemeModeProviderProps) {
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const value = useMemo<Theme>(() => {
    const { palette, isDark } = resolvePalette(preference, systemScheme);
    return { colors: palette, isDark, spacing, radius, fontSize, fontWeight, typography };
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeModeProvider');
  return ctx;
}
