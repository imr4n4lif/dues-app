import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { DatePickerSheet } from './DatePickerSheet';
import { useTheme } from '../../theme/ThemeProvider';
import { useData } from '../../context/DataProvider';
import { getDecimalDigits } from '../../constants/currencies';
import { Due } from '../../types';
import { computeMoneySummary } from '../../models/money';
import { formatAmountCompact, parseAmountInput } from '../../utils/money';
import { formatDateShort } from '../../utils/datetime';

interface PaymentSheetProps {
  visible: boolean;
  onClose: () => void;
  due: Due;
}

export function PaymentSheet({ visible, onClose, due }: PaymentSheetProps) {
  const { colors, spacing, typography } = useTheme();
  const data = useData();
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [paidAt, setPaidAt] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmountText('');
      setNote('');
      setPaidAt(Date.now());
      setError(null);
    }
  }, [visible]);

  if (!due.currencyCode) return null;

  const payments = data.paymentsFor(due.id);
  const { paidMinor, remainingMinor } = computeMoneySummary(due, payments);
  const currencyCode: string = due.currencyCode;

  const submit = async () => {
    setError(null);
    const parsed = parseAmountInput(amountText, currencyCode);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    try {
      // addPayment re-validates against freshest state (spec §42).
      const result = await data.addPayment(due, parsed.value.minor, note.trim() || null, paidAt);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add payment">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing.xl }}
        style={{ maxHeight: 460 }}
      >
        <Text style={[typography.small, { color: colors.textTertiary }]}>
          Remaining {formatAmountCompact(remainingMinor, currencyCode)} · Paid{' '}
          {formatAmountCompact(paidMinor, currencyCode)}
        </Text>

        <View style={{ marginTop: spacing.md }}>
          <TextField
            label={`Amount (${currencyCode})`}
            value={amountText}
            onChangeText={(t) => {
              setAmountText(t);
              setError(null);
            }}
            placeholder="0"
            keyboardType="decimal-pad"
            error={error}
            autoFocus
          />
          {remainingMinor > 0 && (
            <Pressable
              onPress={() =>
                setAmountText(
                  String(
                    remainingMinor /
                      Math.pow(10, getDecimalDigits(currencyCode))
                  )
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Fill remaining amount"
              style={styles.fillRemaining}
              hitSlop={6}
            >
              <Ionicons name="sparkles-outline" size={14} color={colors.accent} />
              <Text style={[typography.captionMedium, { color: colors.accent, marginLeft: 4 }]}>
                Fill remaining ({formatAmountCompact(remainingMinor, currencyCode)})
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ marginTop: spacing.md }}>
          <TextField
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Cash"
            maxLength={500}
          />
        </View>

        <DateRow label={`Paid ${formatDateShort(paidAt)}`} onPress={() => setDateSheetVisible(true)} />

        <View style={[styles.actions, { marginTop: spacing.lg }]}>
          <Button label="Cancel" variant="outline" size="sm" onPress={onClose} style={styles.flexButton} />
          <Button
            label={saving ? 'Saving…' : 'Save payment'}
            size="sm"
            onPress={submit}
            disabled={remainingMinor <= 0 || saving || amountText.trim().length === 0}
            style={styles.flexButton}
          />
        </View>
      </ScrollView>

      <DatePickerSheet
        visible={dateSheetVisible}
        onClose={() => setDateSheetVisible(false)}
        value={paidAt}
        onChange={(ts) => ts != null && setPaidAt(ts)}
        title="Payment date"
      />
    </BottomSheet>
  );
}

function DateRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Change date"
      style={[styles.dateRow, { marginTop: spacing.md }]}
    >
      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
      <Text style={[typography.smallMedium, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flexButton: {
    flex: 1,
  },
  fillRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    minHeight: 32,
    alignSelf: 'flex-start',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
});
