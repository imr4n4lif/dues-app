import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, Theme as NavTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { DataProvider, useData } from './src/context/DataProvider';
import { ThemeModeProvider, useTheme } from './src/theme/ThemeProvider';
import { RootNavigator } from './src/navigation/RootNavigator';

function ThemedNavigation() {
  const { colors, isDark } = useTheme();

  const navTheme: NavTheme = {
    dark: isDark,
    colors: {
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accent,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '800' },
    },
  };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <DataProvider>
          <DataGate />
        </DataProvider>
      </NavigationContainer>
    </>
  );
}

function DataGate() {
  const { ready } = useData();
  if (!ready) return null;
  return <RootNavigator />;
}

function SettingsBridge() {
  const { settings, ready } = useSettings();
  // Wait for persisted preferences before resolving the system theme.
  if (!ready) return null;
  return (
    <ThemeModeProvider preference={settings.themePreference}>
      <ThemedNavigation />
    </ThemeModeProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <SettingsBridge />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
