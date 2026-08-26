import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_SETTINGS, Settings, ThemePreference } from '../types';
import { loadSettings, saveSettings } from '../database/repositories/settings';

export interface SettingsContextValue {
  settings: Settings;
  ready: boolean;
  setDefaultCurrency: (code: string) => Promise<void>;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  /** Used after a backup import replaces settings wholesale. */
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((loaded) => {
        if (!cancelled) setSettings(loaded);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: Settings) => {
    setSettings(next);
    try {
      await saveSettings(next);
    } catch {
      // In-memory value already updated; persistence retries on next change.
    }
  }, []);

  const setDefaultCurrency = useCallback(
    (code: string) => persist({ ...settings, defaultCurrencyCode: code }),
    [persist, settings]
  );

  const setThemePreference = useCallback(
    (themePreference: ThemePreference) => persist({ ...settings, themePreference }),
    [persist, settings]
  );

  const setNotificationsEnabled = useCallback(
    (notificationsEnabled: boolean) =>
      persist({ ...settings, notificationsEnabled }),
    [persist, settings]
  );

  const reload = useCallback(async () => {
    setSettings(await loadSettings());
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      ready,
      setDefaultCurrency,
      setThemePreference,
      setNotificationsEnabled,
      reload,
    }),
    [settings, ready, setDefaultCurrency, setThemePreference, setNotificationsEnabled, reload]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
