import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GapsItLogo } from '../components/GapsItLogo';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { Screen, Card, SectionHeader, ScreenHeader } from '../components/ui/primitives';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { CurrencyPickerSheet } from '../components/sheets/CurrencyPickerSheet';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataProvider';
import { TabParamList } from '../navigation/types';
import {
  applyBackupMerge,
  applyBackupReplace,
  deleteAllData,
  pickBackupFile,
  readBackupFile,
  validateBackup,
  NormalizedBackup,
} from '../services/backup';
import { shareExportedBackup } from '../services/backup';
import { setExtraFlag } from '../database/repositories/settings';
import * as IntentLauncher from 'expo-intent-launcher';
import { getCurrency } from '../constants/currencies';
import { IS_EXPO_GO } from '../notifications/environment';
import { ThemePreference } from '../types';

type Props = BottomTabScreenProps<TabParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { settings, setDefaultCurrency, setThemePreference, setNotificationsEnabled, reload } =
    useSettings();
  const data = useData();

  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [pendingImport, setPendingImport] = useState<NormalizedBackup | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const handleExport = async () => {
    setBusy(true);
    try {
      await shareExportedBackup();
    } catch {
      setSnackbar('Export failed — please try again');
    } finally {
      setBusy(false);
    }
  };

  const handleImportPick = async () => {
    setImportMessage(null);
    setBusy(true);
    try {
      const uri = await pickBackupFile();
      if (!uri) return;
      let raw: unknown;
      try {
        raw = await readBackupFile(uri);
      } catch {
        setImportMessage('That file could not be read as JSON.');
        return;
      }
      const validated = validateBackup(raw);
      if (!validated.ok) {
        setImportMessage(validated.error);
        return;
      }
      setPendingImport(validated.value);
    } finally {
      setBusy(false);
    }
  };

  const finishImport = async (mode: 'replace' | 'merge') => {
    if (!pendingImport) return;
    setBusy(true);
    try {
      if (mode === 'replace') {
        await applyBackupReplace(pendingImport);
      } else {
        await applyBackupMerge(pendingImport);
      }
      await data.reloadAll();
      await reload();
      setPendingImport(null);
      setSnackbar('Backup imported');
    } catch {
      setSnackbar('Import failed');
    } finally {
      setBusy(false);
    }
  };

  const toggleNotifications = async () => {
    const next = !settings.notificationsEnabled;
    if (next && IS_EXPO_GO) {
      setSnackbar('Expo Go cannot show scheduled reminders — use a development build');
      return;
    }
    await setNotificationsEnabled(next);
    if (next) {
      const state = await data.enableNotificationsFlow();
      if (state === 'granted') {
        try {
          await IntentLauncher.startActivityAsync(
            IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
            { data: 'package:com.dues.app' }
          );
          await setExtraFlag('batteryDialogShown', true);
        } catch {}
      } else if (state === 'denied') {
        setSnackbar('Notifications are blocked in system settings');
      } else if (state === 'unsupported') {
        setSnackbar('Expo Go cannot deliver scheduled reminders');
      }
    } else {
      data.refreshReminders();
    }
  };

  return (
    <Screen padded={false} safeBottom={false}>
      <ScreenHeader title="Settings" subtitle="Preferences, reminders & data" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}>
        <SectionHeader title="General" />
        <Card>
          <Row
            icon="cash-outline"
            label="Default currency"
            value={`${getCurrency(settings.defaultCurrencyCode).symbol ?? ''} ${settings.defaultCurrencyCode}`.trim()}
            onPress={() => setCurrencySheetOpen(true)}
            chevron
          />
          <View style={styles.themeBlock}>
            <View style={styles.themeLabelRow}>
              <Ionicons name="contrast-outline" size={17} color={colors.textSecondary} />
              <Text style={[typography.smallMedium, { color: colors.textSecondary, marginLeft: spacing.sm + 2 }]}>
                Theme
              </Text>
            </View>
            <View style={{ marginTop: spacing.sm + 2 }}>
              <SegmentedControl
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
                value={settings.themePreference}
                onChange={(v) => void setThemePreference(v as ThemePreference)}
              />
            </View>
          </View>
        </Card>

        <SectionHeader title="Notifications" />
        <Card>
          <Row
            icon="notifications-outline"
            label="Reminders enabled"
            value={settings.notificationsEnabled ? 'On' : 'Off'}
            onPress={() => void toggleNotifications()}
            switchOn={settings.notificationsEnabled}
          />
          {IS_EXPO_GO ? (
            <Text style={[typography.caption, styles.expoGoNote, { color: colors.warning }]}>
              Expo Go cannot deliver scheduled notifications (removed in SDK 53). Run a
              development build — `npx expo run:android` — to use reminders.
            </Text>
          ) : (
            !settings.notificationsEnabled && (
              <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: 38 }]}>
                Existing reminders stay saved but will not notify.
              </Text>
            )
          )}
        </Card>

        <SectionHeader title="Categories" />
        <Card>
          <Row
            icon="pricetag-outline"
            label="Manage categories"
            value={`${data.categories.length}`}
            onPress={() => navigation.getParent()?.navigate('Categories')}
            chevron
          />
        </Card>

        <SectionHeader title="Data" />
        <Card>
          <Row
            icon="share-outline"
            label="Export backup"
            value="JSON file"
            onPress={() => void handleExport()}
            chevron
            disabled={busy}
          />
          <Row
            icon="download-outline"
            label="Import backup"
            value="Replace or merge"
            onPress={() => void handleImportPick()}
            chevron
            disabled={busy}
          />
          {importMessage ? (
            <Text style={[typography.caption, styles.errorText, { color: colors.danger }]}>
              {importMessage}
            </Text>
          ) : null}
          <Row
            icon="trash-outline"
            label="Delete all data"
            onPress={() => setConfirmWipe(true)}
            destructive
          />
        </Card>

        <SectionHeader title="About" />
        <Card>
          <Row icon="apps-outline" label="App" value="Dues" />
          <Row icon="information-circle-outline" label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} />
          <View style={styles.row}>
            <Ionicons name="construct-outline" size={17} color={colors.textSecondary} />
            <Text
              numberOfLines={1}
              style={[
                typography.bodyMedium,
                { flex: 1, marginLeft: spacing.sm + 4, color: colors.textPrimary },
              ]}
            >
              Developed by
            </Text>
            <View style={{ marginLeft: 8 }}>
              <GapsItLogo height={24} />
            </View>
          </View>
          <Row icon="shield-checkmark-outline" label="Rights" value="All rights reserved" />
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.md, marginLeft: 2, lineHeight: 18 }]}>
            Dues is a simple, local-first tracker for money and things you borrow or lend. All data stays on this device — no account required. Back up regularly using Export.
          </Text>
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm, marginLeft: 2, lineHeight: 18 }]}>
            © {new Date().getFullYear()} GAPS IT. All rights reserved.
          </Text>
        </Card>
      </ScrollView>

      <CurrencyPickerSheet
        visible={currencySheetOpen}
        onClose={() => setCurrencySheetOpen(false)}
        selectedCode={settings.defaultCurrencyCode}
        onPick={(code) => void setDefaultCurrency(code)}
      />

      {/* Import mode chooser — never silently overwrites */}
      <BottomSheet
        visible={pendingImport != null}
        onClose={() => setPendingImport(null)}
        title="Import backup"
      >
        {pendingImport && (
          <View style={{ paddingHorizontal: spacing.xl }}>
            <Text style={[typography.small, { color: colors.textTertiary }]}>
              Exported{' '}
              {new Date(pendingImport.meta.exportedAt).toLocaleString()}
              {' · '}
              {pendingImport.people.length} people · {pendingImport.dues.length} dues
            </Text>
            <View style={{ marginTop: spacing.lg }}>
              <Button
                label={`Merge (${pendingImport.dues.length} dues)`}
                variant="soft"
                onPress={() => void finishImport('merge')}
                disabled={busy}
              />
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  label="Replace everything"
                  variant="danger"
                  onPress={() => void finishImport('replace')}
                  disabled={busy}
                />
              </View>
              <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.md }]}>
                Merge keeps existing records with the same IDs untouched. Replace wipes current data first.
              </Text>
            </View>
          </View>
        )}
      </BottomSheet>

      <ConfirmDialog
        visible={confirmWipe}
        title="Delete all data?"
        message="Every person, due, payment, return, category and setting will be permanently removed from this device."
        confirmLabel="Delete everything"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setConfirmWipe(false);
          void (async () => {
            await deleteAllData();
            await data.reloadAll();
            await reload();
            data.refreshReminders();
            setSnackbar('All data deleted');
          })();
        }}
        onCancel={() => setConfirmWipe(false)}
      />

      <InfoSnackbar message={snackbar} onDone={() => setSnackbar(null)} />
    </Screen>
  );
}

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  switchOn?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}

function Row({ icon, label, value, onPress, chevron, switchOn, destructive, disabled }: RowProps) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      accessibilityRole={switchOn != null ? 'switch' : onPress ? 'button' : 'text'}
      accessibilityState={switchOn != null ? { checked: switchOn } : undefined}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.7 : disabled ? 0.5 : 1 },
      ]}
    >
      <Ionicons name={icon} size={17} color={destructive ? colors.danger : colors.textSecondary} />
      <Text
        numberOfLines={1}
        style={[
          typography.bodyMedium,
          {
            flex: 1,
            marginLeft: spacing.sm + 4,
            color: destructive ? colors.danger : colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>
      {value ? (
        <Text style={[typography.smallMedium, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
          {value}
        </Text>
      ) : null}
      {chevron && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textTertiary}
          style={{ marginLeft: 6 }}
        />
      )}
      {switchOn != null && (
        <View
          pointerEvents="none"
          style={[
            styles.switchTrack,
            {
              backgroundColor: switchOn ? colors.accent : colors.borderStrong,
              marginLeft: value ? spacing.md : spacing.sm,
            },
          ]}
        >
          <View
            style={[
              styles.switchThumb,
              { backgroundColor: '#FFFFFF', transform: [{ translateX: switchOn ? 20 : 2 }] },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

function InfoSnackbar({ message, onDone }: { message: string | null; onDone: () => void }) {
  const { radius, typography, spacing } = useTheme();
  if (!message) return null;
  return (
    <Pressable
      onPress={onDone}
      accessibilityRole="button"
      accessibilityLabel={message}
      style={{
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        backgroundColor: '#26292F',
        borderRadius: radius.md,
        paddingVertical: 12,
        paddingHorizontal: spacing.lg,
      }}
    >
      <Text style={[typography.smallMedium, { color: '#F2F4F7', textAlign: 'center' }]}>{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  themeBlock: {
    marginTop: 6,
  },
  themeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
  },
  errorText: {
    marginLeft: 38,
    marginBottom: 8,
  },
  expoGoNote: {
    marginLeft: 38,
    marginTop: 4,
    lineHeight: 17,
  },
  switchTrack: {
    width: 44,
    height: 27,
    borderRadius: 14,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 23,
    height: 23,
    borderRadius: 12,
  },
});
