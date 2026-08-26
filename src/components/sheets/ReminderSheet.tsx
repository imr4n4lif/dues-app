import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { WheelPicker } from '../ui/WheelPicker';
import { useTheme } from '../../theme/ThemeProvider';
import {
  ReminderConfig,
  ReminderFrequency,
} from '../../types';
import {
  describeReminderTime,
  formatDateTime,
  formatTimeOfDay,
  weekdayLabel,
  weekdayShortLabel,
} from '../../utils/datetime';
import { nextOccurrence } from '../../models/reminders';
import { validateReminderConfig } from '../../services/validation';

const FREQUENCIES: readonly { value: ReminderFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

interface HourMinute {
  hour: number;
  minute: number;
}

function splitTime(hm: HourMinute): { period: 'AM' | 'PM'; hour12: number } {
  const period = hm.hour < 12 ? 'AM' : 'PM';
  const hour12 = hm.hour % 12 === 0 ? 12 : hm.hour % 12;
  return { period, hour12 };
}

function joinTime(hour12: number, minute: number, period: 'AM' | 'PM'): HourMinute {
  const hour = period === 'AM' ? (hour12 === 12 ? 0 : hour12) : hour12 === 12 ? 12 : hour12 + 12;
  return { hour, minute };
}

interface ReminderSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Current config or null when no reminder is set. */
  value: ReminderConfig | null;
  onSave: (config: ReminderConfig | null) => void;
}

export function ReminderSheet({ visible, onClose, value, onSave }: ReminderSheetProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const hasReminder = value != null;

  const [enabled, setEnabled] = useState(hasReminder);
  const [frequency, setFrequency] = useState<ReminderFrequency>(value?.frequency ?? 'daily');
  const [hm, setHm] = useState<HourMinute>({
    hour: value?.hour ?? 20,
    minute: value?.minute ?? 0,
  });
  const [weekday, setWeekday] = useState<number>(value?.weekday ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(value?.dayOfMonth ?? 1);
  const [weekdays, setWeekdays] = useState<number[]>(value?.weekdays ?? [1]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setEnabled(value != null);
    setFrequency(value?.frequency ?? 'daily');
    setHm({ hour: value?.hour ?? 20, minute: value?.minute ?? 0 });
    setWeekday(value?.weekday ?? 1);
    setDayOfMonth(value?.dayOfMonth ?? 1);
    setWeekdays(value?.weekdays ?? [1]);
    setError(null);
  }, [visible, value]);

  const { period, hour12 } = splitTime(hm);

  const draft: ReminderConfig = (() => {
    const base = { frequency, ...joinTime(hour12, hm.minute, period) };
    switch (frequency) {
      case 'weekly':
        return { ...base, weekday };
      case 'monthly':
        return { ...base, dayOfMonth };
      case 'custom':
        return { ...base, weekdays };
      default:
        return base;
    }
  })();

  const previewBase =
    frequency === 'weekly'
      ? `Every ${weekdayLabel(weekday)} at ${formatTimeOfDay(draft.hour, draft.minute)}`
      : describeReminderTime(draft);
  const nextAt = nextOccurrence(draft, Date.now() + 30_000); // 30s grace for saving
  const preview = nextAt
    ? `${previewBase} · next: ${formatDateTime(nextAt)}`
    : previewBase;

  const handleSave = () => {
    if (!enabled) {
      onSave(null);
      onClose();
      return;
    }
    const problem = validateReminderConfig({
      frequency,
      hour: draft.hour,
      minute: draft.minute,
      weekday,
      dayOfMonth,
      weekdays,
    });
    if (problem) {
      setError(problem);
      return;
    }
    onSave(draft);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Reminder">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing.xl }}
        style={{ maxHeight: 540 }}
      >
        <Pressable
          onPress={() => setEnabled((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
          accessibilityLabel="Enable reminder"
          style={styles.switchRow}
        >
          <Ionicons
            name={enabled ? 'checkbox' : 'square-outline'}
            size={22}
            color={enabled ? colors.accent : colors.textTertiary}
          />
          <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
            Remind me about this due
          </Text>
        </Pressable>

        {enabled && (
          <>
            <View style={{ marginTop: spacing.md }}>
              <SegmentedControl options={FREQUENCIES} value={frequency} onChange={(f) => { setFrequency(f); setError(null); }} />
            </View>

            {frequency === 'weekly' && (
              <View style={[styles.weekRow, { marginTop: spacing.lg }]}>
                {ISO_WEEKDAYS.map((iso) => (
                  <Pressable
                    key={iso}
                    onPress={() => setWeekday(iso)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: iso === weekday }}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: iso === weekday ? colors.accent : colors.surfaceMuted,
                        borderRadius: radius.pill,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        lineHeight: 16,
                        fontWeight: iso === weekday ? '700' : '500',
                        color: iso === weekday ? colors.onAccent : colors.textSecondary,
                      }}
                    >
                      {weekdayShortLabel(iso)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {frequency === 'monthly' && (
              <Text style={[typography.small, { color: colors.textTertiary, marginTop: spacing.md }]}>
                Months without day {dayOfMonth} will remind on the last day of that month.
              </Text>
            )}

            {frequency === 'custom' && (
              <View style={[styles.weekRow, { marginTop: spacing.lg }]}>
                {ISO_WEEKDAYS.map((iso) => {
                  const on = weekdays.includes(iso);
                  return (
                    <Pressable
                      key={iso}
                      onPress={() =>
                        setWeekdays((prev) =>
                          prev.includes(iso)
                            ? prev.filter((d) => d !== iso)
                            : [...prev, iso].sort((a, b) => a - b)
                        )
                      }
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: on ? colors.accent : colors.surfaceMuted,
                          borderRadius: radius.pill,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          lineHeight: 16,
                          fontWeight: on ? '700' : '500',
                          color: on ? colors.onAccent : colors.textSecondary,
                        }}
                      >
                        {weekdayShortLabel(iso)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={[styles.timeRow, { marginTop: spacing.lg }]}>
              <WheelPicker
                items={Array.from({ length: 12 }, (_, i) => ({
                  value: i + 1,
                  label: String(i + 1),
                }))}
                value={hour12}
                onSelect={(v) => setHm((s) => ({ ...s, hour: joinTime(v as number, s.minute, period).hour }))}
                width={70}
              />
              <WheelPicker
                items={Array.from({ length: 60 }, (_, i) => ({
                  value: i,
                  label: String(i).padStart(2, '0'),
                }))}
                value={hm.minute}
                onSelect={(v) => setHm((s) => ({ ...s, minute: v as number }))}
                width={70}
              />
              <WheelPicker
                items={[
                  { value: 'AM' as const, label: 'AM' },
                  { value: 'PM' as const, label: 'PM' },
                ]}
                value={period}
                onSelect={(v) =>
                  setHm((s) => ({ ...s, hour: joinTime(hour12, s.minute, v as 'AM' | 'PM').hour }))
                }
                width={80}
              />
            </View>

            <Text
              style={[
                typography.bodyMedium,
                { color: colors.accent, textAlign: 'center', marginTop: spacing.md },
              ]}
            >
              {preview}
            </Text>

            {error ? (
              <Text style={[typography.caption, { color: colors.danger, textAlign: 'center', marginTop: 4 }]}>
                {error}
              </Text>
            ) : null}
          </>
        )}

        <View style={[styles.actions, { marginTop: spacing.xl }]}>
          {hasReminder && (
            <Button
              label="Remove"
              variant="outline"
              size="sm"
              onPress={() => {
                onSave(null);
                onClose();
              }}
              style={styles.flexButton}
            />
          )}
          <Button label="Save reminder" size="sm" onPress={handleSave} style={styles.flexButton} />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flexButton: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayChip: {
    minWidth: 40,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
});
