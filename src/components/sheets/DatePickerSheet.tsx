import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { WEEKDAY_SHORT_LABELS_ORDERED, buildMonthMatrix, monthTitle } from '../../utils/calendar';
import { sameCalendarDay, startOfDay } from '../../utils/calendar';

interface DatePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Selected timestamp (any time of day) or null for no date. */
  value: number | null;
  onChange: (value: number | null) => void;
  title?: string;
}

export function DatePickerSheet({
  visible,
  onClose,
  value,
  onChange,
  title = 'Select date',
}: DatePickerSheetProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const initial = value ?? Date.now();
  const [viewYear, setViewYear] = useState(new Date(initial).getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date(initial).getMonth());

  React.useEffect(() => {
    if (visible) {
      const base = new Date(value ?? Date.now());
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
  }, [visible, value]);

  const matrix = useMemo(() => buildMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = startOfDay(Date.now());
  const selectedDay = value != null ? startOfDay(value) : null;

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={{ paddingHorizontal: spacing.xl }}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => shiftMonth(-1)} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8} style={styles.navButton}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </Pressable>
          <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>
            {monthTitle(viewYear, viewMonth)}
          </Text>
          <Pressable onPress={() => shiftMonth(1)} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.weekHeader, { marginTop: spacing.md }]}>
          {WEEKDAY_SHORT_LABELS_ORDERED.map((label, i) => (
            <Text
              key={`weekday-col-${i}`}
              style={[typography.captionMedium, styles.weekCell, { color: colors.textTertiary }]}
            >
              {label}
            </Text>
          ))}
        </View>

        {matrix.map((week, weekIndex) => (
          <View key={`w-${weekIndex}`} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              if (day == null) {
                return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.dayCell} />;
              }
              const ts = startOfDay(new Date(viewYear, viewMonth, day).getTime());
              const isSelected = selectedDay === ts;
              const isToday = ts === today;
              return (
                <Pressable
                  key={ts}
                  onPress={() => {
                    // Preserve any existing time-of-day when a date already existed.
                    const base = new Date(value ?? Date.now());
                    const next = new Date(ts);
                    if (value != null && sameCalendarDay(value, ts)) {
                      next.setHours(base.getHours(), base.getMinutes(), 0, 0);
                    }
                    onChange(next.getTime());
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${viewYear}-${viewMonth + 1}-${day}`}
                  style={[
                    styles.dayCell,
                    styles.dayButton,
                    {
                      backgroundColor: isSelected ? colors.accent : 'transparent',
                      borderRadius: radius.pill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.small,
                      {
                        color: isSelected
                          ? colors.onAccent
                          : isToday
                            ? colors.accent
                            : colors.textPrimary,
                        fontWeight: isSelected || isToday ? '700' : '400',
                      },
                    ]}
                  >
                    {String(day)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={[styles.actions, { marginTop: spacing.lg }]}>
          <Button
            label="Clear"
            variant="outline"
            size="sm"
            disabled={value == null}
            onPress={() => {
              onChange(null);
              onClose();
            }}
          />
          <Button
            label="Today"
            variant="soft"
            size="sm"
            onPress={() => {
              onChange(today + 12 * 60 * 60 * 1000);
              onClose();
            }}
          />
          <Button label="Done" size="sm" onPress={onClose} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekCell: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    paddingVertical: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    marginVertical: 0,
    alignSelf: 'center',
    minWidth: 34,
    minHeight: 34,
    borderRadius: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
});
