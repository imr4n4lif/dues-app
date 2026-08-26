import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from './primitives';
import { ArchivedTag, DirectionTag, OverdueTag, StatusBadge } from './Badges';
import { ProgressBar } from './ProgressBar';
import { useTheme } from '../../theme/ThemeProvider';
import { Due, Person } from '../../types';
import { DueStatusInfo } from '../../models/status';
import { formatAmountCompact } from '../../utils/money';
import { formatDateShort } from '../../utils/datetime';

interface DueCardProps {
  due: Due;
  person?: Person;
  info: DueStatusInfo;
  onPress?: () => void;
}

export function DueCard({ due, person, info, onPress }: DueCardProps) {
  const { colors, typography, spacing } = useTheme();
  const directionColor = due.direction === 'borrowed' ? colors.borrowed : colors.lent;

  const headline = due.kind === 'money' && due.amountMinor != null && due.currencyCode
    ? formatAmountCompact(due.amountMinor, due.currencyCode)
    : due.itemName ?? '';

  let subLine = '';
  if (due.kind === 'money' && info.money) {
    const settledLabel = due.direction === 'lent' ? 'Received' : 'Paid';
    if (info.settled && info.money.paidMinor < info.money.totalMinor) {
      // Manually marked settled before completion.
      subLine = `${settledLabel} ${formatAmountCompact(info.money.paidMinor, due.currencyCode ?? '')} · Marked settled`;
    } else {
      subLine = `${settledLabel} ${formatAmountCompact(info.money.paidMinor, due.currencyCode ?? '')} · Remaining ${formatAmountCompact(info.remainingMinor ?? 0, due.currencyCode ?? '')}`;
    }
  } else if (due.kind === 'item' && info.item?.trackQuantity) {
    subLine = `${info.item.returnedQuantity} of ${info.item.quantityTotal} returned`;
  }

  const progressFraction =
    due.kind === 'money' && info.money && info.money.totalMinor > 0
      ? info.money.paidMinor / info.money.totalMinor
      : due.kind === 'item' && info.item?.trackQuantity && (info.item.quantityTotal ?? 0) > 0
        ? info.item.returnedQuantity / (info.item.quantityTotal ?? 1)
        : null;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open due for ${person?.name ?? 'unknown'}`}>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.personRow}>
            <Text style={[typography.bodySemibold, { color: colors.textPrimary }]} numberOfLines={1}>
              {person?.name ?? 'Unknown'}
            </Text>
            <DirectionTag direction={due.direction} />
          </View>
          <View style={styles.badgeRow}>
            {info.overdue && <OverdueTag />}
            {due.archived && <ArchivedTag />}
            <StatusBadge status={info.status} />
          </View>
        </View>

        <Text style={[typography.titleSemibold, { color: directionColor, marginTop: spacing.sm }]} numberOfLines={2}>
          {headline}
        </Text>

        {subLine !== '' && (
          <Text style={[typography.small, { color: colors.textSecondary, marginTop: 3 }]}>
            {subLine}
          </Text>
        )}

        {progressFraction != null && !info.settled && (
          <View style={[styles.progressRow, { marginTop: spacing.sm }]}>
            <ProgressBar fraction={progressFraction} color={directionColor} />
          </View>
        )}

        <View style={[styles.metaRow, { marginTop: spacing.md }]}>
          {due.dueDate != null && (
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color={info.overdue ? colors.danger : colors.textTertiary}
              />
              <Text
                style={[
                  typography.caption,
                  { color: info.overdue ? colors.danger : colors.textTertiary },
                ]}
              >
                Due {formatDateShort(due.dueDate)}
              </Text>
            </View>
          )}
          {due.reminderConfig != null && (
            <View style={styles.metaItem}>
              <Ionicons name="notifications-outline" size={13} color={colors.textTertiary} />
            </View>
          )}
        </View>

        {due.note ? (
          <Text style={[typography.small, styles.note, { color: colors.textTertiary }]} numberOfLines={2}>
            “{due.note}”
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  progressRow: {
    flexDirection: 'row',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  note: {
    marginTop: 8,
    fontStyle: 'italic',
  },
});
