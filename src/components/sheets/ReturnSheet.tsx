import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TextField } from '../ui/TextField';
import { DatePickerSheet } from './DatePickerSheet';
import { useTheme } from '../../theme/ThemeProvider';
import { useData } from '../../context/DataProvider';
import { Due } from '../../types';
import { computeItemSummary } from '../../models/items';
import { formatDateTime } from '../../utils/datetime';

interface ReturnSheetProps {
  visible: boolean;
  onClose: () => void;
  due: Due;
}

const MARK_OPTIONS = [
  { value: 'partial' as const, label: 'Partially returned' },
  { value: 'full' as const, label: 'Fully returned' },
];

export function ReturnSheet({ visible, onClose, due }: ReturnSheetProps) {
  const { colors, spacing, typography } = useTheme();
  const data = useData();
  const [quantityText, setQuantityText] = useState('');
  const [mark, setMark] = useState<'partial' | 'full'>('full');
  const [note, setNote] = useState('');
  const [returnedAt, setReturnedAt] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuantityText(due.trackQuantity ? String(Math.max(due.quantity ?? 1, 1)) : '');
      setMark('full');
      setNote('');
      setReturnedAt(Date.now());
      setError(null);
    }
  }, [visible, due]);

  const summary = computeItemSummary(due, data.returnsFor(due.id));
  const remainingQty = summary.remainingQuantity ?? 0;

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const trimmedNote = note.trim() || null;
      if (due.trackQuantity) {
        if (!/^\d+$/.test(quantityText.trim())) {
          setError('Quantity must be a whole number');
          return;
        }
        const qty = Number.parseInt(quantityText.trim(), 10);
        if (qty <= 0) {
          setError('Quantity must be at least 1');
          return;
        }
        if (qty > remainingQty) {
          setError(remainingQty === 0 ? 'Everything is already returned' : `Cannot return more than ${remainingQty}`);
          return;
        }
        // addQuantityReturn re-validates against freshest state.
        const result = await data.addQuantityReturn(due, qty, trimmedNote, returnedAt);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await data.addStatusReturn(due, mark, trimmedNote, returnedAt);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Record return">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing.xl }}
        style={{ maxHeight: 480 }}
      >
        <Text style={[typography.small, { color: colors.textTertiary }]}>
          {due.trackQuantity
            ? `${summary.returnedQuantity} of ${summary.quantityTotal} returned · ${remainingQty} remaining`
            : `Current status: ${summary.status === 'fully_returned' ? 'fully returned' : summary.status === 'partially_returned' ? 'partially returned' : 'not returned'}`}
        </Text>

        {due.trackQuantity ? (
          <View style={{ marginTop: spacing.md }}>
            <TextField
              label="Returned quantity"
              value={quantityText}
              onChangeText={(t) => {
                setQuantityText(t.replace(/[^\d]/g, ''));
                setError(null);
              }}
              keyboardType="number-pad"
              error={error}
              hint={remainingQty > 0 ? `Up to ${remainingQty}` : undefined}
            />
            {remainingQty > 0 && (
              <Text
                style={[typography.captionMedium, { color: colors.accent, marginTop: -2 }]}
                onPress={() => setQuantityText(String(remainingQty))}
                accessibilityRole="button"
                accessibilityLabel={`Fill all ${remainingQty}`}
              >
                Fill all ({remainingQty})
              </Text>
            )}
          </View>
        ) : (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.smallMedium, { color: colors.textSecondary, marginBottom: 6 }]}>
              This item has no quantity tracking — choose the return status:
            </Text>
            <SegmentedControl options={MARK_OPTIONS} value={mark} onChange={setMark} />
            {error ? (
              <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>{error}</Text>
            ) : null}
          </View>
        )}

        <View style={{ marginTop: spacing.md }}>
          <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Returned laptop, charger pending" maxLength={500} multiline />
        </View>

        <Text
          onPress={() => setDateSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Change return date and time"
          style={[typography.smallMedium, { color: colors.textSecondary, minHeight: 40, textAlignVertical: 'center', marginTop: spacing.sm }]}
        >
          {formatDateTime(returnedAt)} (tap to change)
        </Text>

        <View style={[styles.actions, { marginTop: spacing.lg }]}>
          <Button label="Cancel" variant="outline" size="sm" onPress={onClose} style={styles.flexButton} />
          <Button
            label={saving ? 'Saving…' : 'Save return'}
            size="sm"
            onPress={submit}
            disabled={
              saving ||
              (due.trackQuantity && (remainingQty <= 0 || quantityText.trim().length === 0))
            }
            style={styles.flexButton}
          />
        </View>
      </ScrollView>

      <DatePickerSheet
        visible={dateSheetVisible}
        onClose={() => setDateSheetVisible(false)}
        value={returnedAt}
        onChange={(ts) => ts != null && setReturnedAt(ts)}
        title="Return date"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flexButton: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
});
