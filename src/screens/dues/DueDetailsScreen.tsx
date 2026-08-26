import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Card, SectionHeader } from '../../components/ui/primitives';
import { AppHeader } from '../../components/ui/AppHeader';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import {
  ArchivedTag,
  DirectionTag,
  KindTag,
  OverdueTag,
  SettledEarlyTag,
  StatusBadge,
} from '../../components/ui/Badges';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Snackbar } from '../../components/ui/Snackbar';
import { PaymentSheet } from '../../components/sheets/PaymentSheet';
import { ReturnSheet } from '../../components/sheets/ReturnSheet';
import { DatePickerSheet } from '../../components/sheets/DatePickerSheet';
import { ReminderSheet } from '../../components/sheets/ReminderSheet';
import { useTheme } from '../../theme/ThemeProvider';
import { useData } from '../../context/DataProvider';
import { RootStackParamList } from '../../navigation/types';
import {
  formatAmountCompact,
} from '../../utils/money';
import {
  formatDateTime,
  describeReminderTime,
  formatFullDate,
} from '../../utils/datetime';
import { computeMoneySummary } from '../../models/money';
import { ItemReturnRecord, Payment } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DueDetails'>;

type ConfirmTarget =
  | { type: 'due' }
  | { type: 'payment'; payment: Payment }
  | { type: 'return'; record: ItemReturnRecord }
  | null;

export function DueDetailsScreen({ route, navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const data = useData();
  const due = data.dues.find((d) => d.id === route.params.dueId);

  const [sheet, setSheet] = useState<null | 'payment' | 'return' | 'date' | 'reminder'>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; undo?: () => void } | null>(null);

  const info = due ? data.statusInfoById.get(due.id) : undefined;
  const person = due ? data.peopleById.get(due.personId) : undefined;
  const category = due?.categoryId ? data.categoriesById.get(due.categoryId) : undefined;

  const payments = useMemo(() => (due ? data.paymentsFor(due.id) : []), [due, data]);
  const returns = useMemo(() => (due ? data.returnsFor(due.id) : []), [due, data]);

  const moneySummary = due && due.kind === 'money' ? computeMoneySummary(due, payments) : null;
  const directionColor = due?.direction === 'borrowed' ? colors.borrowed : colors.lent;

  const handleDeleteDue = useCallback(async () => {
    if (!due) return;
    const deletedId = due.id;
    await data.deleteDue(due);
    setConfirm(null);
    navigation.goBack();
    setTimeout(() => {
      setSnackbar({
        message: 'Due deleted',
        undo: () => void data.undoDeleteDue(deletedId),
      });
    }, 250);
  }, [due, data, navigation]);

  if (!due || !info) {
    return (
      <Screen padded={false}>
        <AppHeader title="Due" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="file-tray-outline"
          title="This due is gone"
          message="It may have been deleted."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const headline =
    due.kind === 'money' && due.amountMinor != null && due.currencyCode
      ? formatAmountCompact(due.amountMinor, due.currencyCode)
      : due.itemName ?? '';

  const progressFraction =
    due.kind === 'money' && moneySummary && moneySummary.totalMinor > 0
      ? moneySummary.paidMinor / moneySummary.totalMinor
      : info.item?.trackQuantity && (info.item.quantityTotal ?? 0) > 0
        ? (info.item.returnedQuantity ?? 0) / (info.item.quantityTotal ?? 1)
        : null;

  const canAddPayment = due.kind === 'money' && (moneySummary?.remainingMinor ?? 0) > 0 && !info.settled;
  const canRecordReturn =
    due.kind === 'item' &&
    !info.settled &&
    (!due.trackQuantity || (info.remainingQuantity ?? 0) > 0);

  return (
    <Screen padded={false}>
      <AppHeader
        title={person?.name ?? 'Due'}
        subtitle={due.direction === 'borrowed' ? 'Borrowed by me' : 'Lent by me'}
        onBack={() => navigation.goBack()}
        right={
          <Pressable
            onPress={() => navigation.navigate('DueForm', { mode: 'edit', dueId: due.id })}
            accessibilityRole="button"
            accessibilityLabel="Edit due"
            hitSlop={8}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}>
        {/* Hero */}
        <Card style={{ marginTop: 4 }}>
          <View style={styles.tagRow}>
            <DirectionTag direction={due.direction} />
            <KindTag kind={due.kind} />
            <View style={styles.spacer} />
            {info.overdue ? <OverdueTag /> : null}
            {due.manuallySettledAt != null && !isDerivedFullySettled(info.status) ? (
              <SettledEarlyTag />
            ) : null}
            {due.archived ? <ArchivedTag /> : null}
          </View>

          <Text
            style={[
              typography.amount,
              { color: directionColor, marginTop: spacing.md },
            ]}
            adjustsFontSizeToFit
            numberOfLines={2}
          >
            {headline}
          </Text>
          {due.kind === 'item' && due.trackQuantity && (
            <Text style={[typography.smallMedium, { color: colors.textSecondary, marginTop: 2 }]}>
              Quantity tracked
            </Text>
          )}

          {due.kind === 'money' && moneySummary && due.currencyCode ? (
            <>
              <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                {info.settled && moneySummary.paidMinor < moneySummary.totalMinor
                  ? `${due.direction === 'lent' ? 'Received' : 'Paid'} ${formatAmountCompact(moneySummary.paidMinor, due.currencyCode)} · Marked settled`
                  : `${due.direction === 'lent' ? 'Received' : 'Paid'} ${formatAmountCompact(moneySummary.paidMinor, due.currencyCode)} · Remaining ${formatAmountCompact(moneySummary.remainingMinor, due.currencyCode)} of ${formatAmountCompact(moneySummary.totalMinor, due.currencyCode)}`}
              </Text>
              {progressFraction != null && !(info.settled && moneySummary.paidMinor < moneySummary.totalMinor) && (
                <View style={[styles.progressRow, { marginTop: spacing.sm }]}>
                  <ProgressBar fraction={progressFraction} color={directionColor} />
                  <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: 10 }]}>
                    {Math.round(progressFraction * 100)}%
                  </Text>
                </View>
              )}
            </>
          ) : null}

          {due.kind === 'item' && info.item ? (
            <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {info.item.trackQuantity
                ? `${info.item.returnedQuantity} of ${info.item.quantityTotal} returned · ${info.remainingQuantity} remaining`
                : 'Status-based tracking — no quantity'}
            </Text>
          ) : null}

          <View style={[styles.statusWrap, { marginTop: spacing.md }]}>
            <StatusBadge status={info.status} />
          </View>

          <View style={[styles.actionsRow, { marginTop: spacing.lg }]}>
            {due.kind === 'money' ? (
              <Button
                label="Add payment"
                icon="cash-outline"
                size="sm"
                disabled={!canAddPayment}
                onPress={() => setSheet('payment')}
                style={styles.flexAction}
              />
            ) : (
              <Button
                label="Record return"
                icon="arrow-undo-outline"
                size="sm"
                disabled={!canRecordReturn}
                onPress={() => setSheet('return')}
                style={styles.flexAction}
              />
            )}
            <Button
              label={
                due.kind === 'money'
                  ? info.settled
                    ? 'Mark unpaid'
                    : 'Mark fully paid'
                  : info.settled
                    ? 'Unmark returned'
                    : 'Mark fully returned'
              }
              variant={info.settled ? 'outline' : 'soft'}
              size="sm"
              onPress={() => void data.setDueManuallySettled(due, !info.settled)}
              style={styles.flexAction}
            />
          </View>
        </Card>

        {/* History */}
        {due.kind === 'money' ? (
          <>
            <SectionHeader title={`Payment history${payments.length > 0 ? ` (${payments.length})` : ''}`} />
            <Card>
              {payments.length === 0 ? (
                <Text style={[typography.small, { color: colors.textTertiary }]}>
                  No payments yet.
                  {due.currencyCode
                    ? ` Payments will use ${due.currencyCode}.`
                    : ''}
                </Text>
              ) : (
                payments.map((p) => (
                  <HistoryRow
                    key={p.id}

                    title={
                      p.amountMinor != null && due.currencyCode
                        ? formatAmountCompact(p.amountMinor, due.currencyCode)
                        : ''
                    }
                    timestamp={formatDateTime(p.paidAt)}
                    note={p.note}
                    onDelete={() => setConfirm({ type: 'payment', payment: p })}
                  />
                ))
              )}
            </Card>
          </>
        ) : (
          <>
            <SectionHeader title={`Return history${returns.length > 0 ? ` (${returns.length})` : ''}`} />
            <Card>
              {returns.length === 0 ? (
                <Text style={[typography.small, { color: colors.textTertiary }]}>No returns recorded yet.</Text>
              ) : (
                returns.map((r) => (
                  <HistoryRow
                    key={r.id}

                    title={
                      r.kind === 'quantity'
                        ? `${r.quantity} returned`
                        : r.status === 'full'
                          ? 'Fully returned'
                          : 'Partially returned'
                    }
                    timestamp={formatDateTime(r.returnedAt)}
                    note={r.note}
                    onDelete={() => setConfirm({ type: 'return', record: r })}
                  />
                ))
              )}
            </Card>
          </>
        )}

        {/* Details */}
        <SectionHeader title="Details" />
        <Card>
          <DetailRow
            icon="person-outline"
            label="Person"
            value={person?.name ?? 'Unknown'}
            onPress={() => navigation.navigate('PersonDetails', { personId: due.personId })}
            chevron
          />
          {category && (
            <DetailRow icon="pricetag-outline" label="Category" value={category.name} />
          )}
          <DetailRow
            icon="calendar-clear-outline"
            label="Due date"
            value={due.dueDate != null ? formatFullDate(due.dueDate) : 'None'}
            onPress={() => setSheet('date')}
            chevron={!info.settled}
          />
          <DetailRow
            icon="notifications-outline"
            label="Reminder"
            value={due.reminderConfig ? describeReminderTime(due.reminderConfig) : 'None'}
            onPress={() => setSheet('reminder')}
            chevron
          />
          {due.note ? (
            <View style={styles.noteBlock}>
              <Text style={[typography.body, { color: colors.textPrimary, fontStyle: 'italic' }]}>
                “{due.note}”
              </Text>
            </View>
          ) : null}
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}>
            Created {formatDateTime(due.createdAt)} · Updated {formatDateTime(due.updatedAt)}
          </Text>
        </Card>

        {/* Secondary actions */}
        <View style={[styles.secondaryActions, { marginTop: spacing.lg }]}>
          <Button
            label={due.archived ? 'Restore from archive' : 'Archive'}
            variant="outline"
            size="sm"
            icon="archive-outline"
            onPress={() => void data.setDueArchived(due, !due.archived)}
          />
          <Button
            label="Delete due"
            variant="danger"
            size="sm"
            icon="trash-outline"
            onPress={() => setConfirm({ type: 'due' })}
          />
        </View>
      </ScrollView>

      {/* Sheets */}
      <PaymentSheet visible={sheet === 'payment'} onClose={() => setSheet(null)} due={due} />
      <ReturnSheet visible={sheet === 'return'} onClose={() => setSheet(null)} due={due} />
      <DatePickerSheet
        visible={sheet === 'date'}
        onClose={() => setSheet(null)}
        value={due.dueDate}
        onChange={(ts) => void data.saveDueEdits({ ...due, dueDate: ts })}
        title="Due date"
      />
      <ReminderSheet
        visible={sheet === 'reminder'}
        onClose={() => setSheet(null)}
        value={due.reminderConfig}
        onSave={(config) => void data.setDueReminder(due, config)}
      />

      {/* Confirmations */}
      <ConfirmDialog
        visible={confirm?.type === 'due'}
        title="Are you sure?"
        message="This will permanently delete this due and its payment/return history."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => void handleDeleteDue()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm?.type === 'payment'}
        title="Delete payment?"
        message="The paid total will be recalculated."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (confirm?.type === 'payment') void data.deletePayment(confirm.payment);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm?.type === 'return'}
        title="Delete return record?"
        message="Returned quantity/status will be recalculated."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (confirm?.type === 'return') void data.deleteItemReturnRecord(confirm.record);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />

      <Snackbar
        visible={snackbar != null}
        message={snackbar?.message ?? ''}
        actionLabel={snackbar?.undo ? 'Undo' : undefined}
        onAction={snackbar?.undo}
        onDismiss={() => setSnackbar(null)}
      />
    </Screen>
  );
}

function isDerivedFullySettled(status: import('../../types').DueStatus): boolean {
  return status === 'fully_paid' || status === 'fully_returned';
}

interface HistoryRowProps {
  title: string;
  timestamp: string;
  note?: string | null;
  onDelete?: () => void;
}

function HistoryRow({ title, timestamp, note, onDelete }: HistoryRowProps) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <View style={styles.historyRow}>
      <View style={[styles.historyDot, { backgroundColor: colors.accentSoft, borderRadius: radius.pill }]}>
        <Ionicons name="checkmark" size={12} color={colors.accent} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>{timestamp}</Text>
        {note ? (
          <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={3}>
            {note}
          </Text>
        ) : null}
      </View>
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${title}`}
          hitSlop={8}
          style={{ padding: spacing.xs }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

interface DetailRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  chevron?: boolean;
}

function DetailRow({ icon, label, value, onPress, chevron }: DetailRowProps) {
  const { colors, typography, spacing } = useTheme();
  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text style={[typography.smallMedium, { color: colors.textSecondary, width: 84, marginLeft: spacing.sm + 2 }]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[typography.body, { flex: 1, textAlign: 'right', color: colors.textPrimary }]}
      >
        {value}
      </Text>
      {chevron ? <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  spacer: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusWrap: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  flexAction: {
    flex: 1,
  },
  secondaryActions: {
    gap: 10,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  historyDot: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  noteBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.25)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
