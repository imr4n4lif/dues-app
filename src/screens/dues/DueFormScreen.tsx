import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Card } from '../../components/ui/primitives';
import { AppHeader } from '../../components/ui/AppHeader';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { TextField } from '../../components/ui/TextField';
import { PersonPickerSheet } from '../../components/sheets/PersonPickerSheet';
import { CurrencyPickerSheet } from '../../components/sheets/CurrencyPickerSheet';
import { CategoryPickerSheet } from '../../components/sheets/CategoryPickerSheet';
import { DatePickerSheet } from '../../components/sheets/DatePickerSheet';
import { ReminderSheet } from '../../components/sheets/ReminderSheet';
import { useTheme } from '../../theme/ThemeProvider';
import { useData } from '../../context/DataProvider';
import { useSettings } from '../../context/SettingsContext';
import { RootStackParamList } from '../../navigation/types';
import { Direction, DueKind, ReminderConfig } from '../../types';
import { formatAmountCompact, parseAmountInput } from '../../utils/money';
import { formatDateShort, describeReminderTime } from '../../utils/datetime';
import { computeMoneySummary } from '../../models/money';
import { computeItemSummary } from '../../models/items';
import { getCurrency } from '../../constants/currencies';

type Props = NativeStackScreenProps<RootStackParamList, 'DueForm'>;

interface FormErrors {
  person?: string;
  amount?: string;
  itemName?: string;
  quantity?: string;
}

export function DueFormScreen({ route, navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const data = useData();
  const { settings } = useSettings();

  const params = route.params;
  const editing =
    params.mode === 'edit' ? data.dues.find((d) => d.id === params.dueId) : undefined;

  const [direction, setDirection] = useState<Direction>(editing?.direction ?? 'borrowed');
  const [kind, setKind] = useState<DueKind>(editing?.kind ?? 'money');
  const [personId, setPersonId] = useState<string | null>(
    editing?.personId ?? (params.mode === 'add' ? params.presetPersonId ?? null : null)
  );
  const [amountText, setAmountText] = useState<string>(() => {
    if (editing?.amountMinor != null && editing.currencyCode) {
      const digits = getCurrency(editing.currencyCode).decimalDigits;
      return String(editing.amountMinor / Math.pow(10, digits));
    }
    return '';
  });
  const [currencyCode, setCurrencyCode] = useState<string>(
    editing?.currencyCode ?? settings.defaultCurrencyCode
  );
  const [itemName, setItemName] = useState<string>(editing?.itemName ?? '');
  const [trackQuantity, setTrackQuantity] = useState<boolean>(editing?.trackQuantity ?? false);
  const [quantityText, setQuantityText] = useState<string>(
    editing?.quantity != null ? String(editing.quantity) : ''
  );
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [dueDate, setDueDate] = useState<number | null>(editing?.dueDate ?? null);
  const [note, setNote] = useState<string>(editing?.note ?? '');
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig | null>(
    editing?.reminderConfig ?? null
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<
    null | 'person' | 'currency' | 'category' | 'date' | 'reminder'
  >(null);

  // Follow default currency changes only while adding and untouched.
  useEffect(() => {
    if (!editing && kind === 'money') setCurrencyCode(settings.defaultCurrencyCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.defaultCurrencyCode]);

  const person = personId ? data.peopleById.get(personId) : undefined;
  const category = categoryId ? data.categoriesById.get(categoryId) : undefined;

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!personId) next.person = 'Select a person';

    if (kind === 'money') {
      const parsed = parseAmountInput(amountText, currencyCode);
      if (!parsed.ok) next.amount = parsed.error;
      else if (editing) {
        const { paidMinor } = computeMoneySummary(editing, data.paymentsFor(editing.id));
        if (paidMinor > parsed.value.minor) {
          next.amount = `Already paid ${formatAmountCompact(paidMinor, currencyCode)} — total cannot be lower`;
        }
        if (editing.currencyCode !== currencyCode && data.paymentsFor(editing.id).length > 0) {
          next.amount = `Payments exist in ${editing.currencyCode}; delete them before changing the currency`;
        }
      }
    } else {
      if (!itemName.trim()) next.itemName = 'Enter an item name';
      if (trackQuantity) {
        if (!/^\d+$/.test(quantityText.trim())) next.quantity = 'Quantity must be a whole number';
        else {
          const q = Number.parseInt(quantityText.trim(), 10);
          if (q <= 0) next.quantity = 'Quantity must be at least 1';
          else if (editing && editing.trackQuantity) {
            const summary = computeItemSummary(editing, data.returnsFor(editing.id));
            if ((summary.returnedQuantity ?? 0) > q) {
              next.quantity = `${summary.returnedQuantity} already returned — quantity cannot be lower`;
            }
          }
        }
      }
    }
    return next;
  };

  const parsedAmountMinor = (): number | null => {
    const parsed = parseAmountInput(amountText, currencyCode);
    return parsed.ok ? parsed.value.minor : null;
  };

  const handleSave = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const shared = {
        personId: personId!,
        direction,
        kind,
        categoryId,
        dueDate,
        note: note.trim() || null,
        reminderConfig,
      };
      if (editing) {
        await data.saveDueEdits({
          ...editing,
          ...shared,
          itemDescription: editing.itemDescription,
          amountMinor:
            kind === 'money' ? parsedAmountMinor() ?? editing.amountMinor : editing.amountMinor,
          currencyCode: kind === 'money' ? currencyCode : editing.currencyCode,
          itemName: kind === 'item' ? itemName.trim() : editing.itemName,
          trackQuantity: kind === 'item' ? trackQuantity : false,
          quantity:
            kind === 'item' && trackQuantity
              ? Number.parseInt(quantityText.trim(), 10)
              : editing.quantity,
        });
      } else {
        const result = await data.createDue({
          ...shared,
          itemDescription: null,
          amountMinor: kind === 'money' ? parsedAmountMinor() : null,
          currencyCode: kind === 'money' ? currencyCode : null,
          itemName: kind === 'item' ? itemName.trim() : null,
          trackQuantity: kind === 'item' ? trackQuantity : false,
          quantity:
            kind === 'item' && trackQuantity
              ? Number.parseInt(quantityText.trim(), 10)
              : null,
        });
        if (!result.ok) return;
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <AppHeader title={editing ? 'Edit due' : 'Add due'} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 16 }}>
            <SegmentedControl
              options={[
                { value: 'borrowed', label: 'Borrowed' },
                { value: 'lent', label: 'Lent' },
              ]}
              value={direction}
              onChange={(v) => setDirection(v as Direction)}
            />
            <View style={{ marginTop: spacing.sm }}>
              <SegmentedControl
                options={[
                  { value: 'money', label: 'Money' },
                  { value: 'item', label: 'Item' },
                ]}
                value={kind}
                onChange={(v) => {
                  if (!editing) setKind(v as DueKind);
                }}
              />
            </View>
            {editing && (
              <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 6 }]}>
                Type cannot change after creation.
              </Text>
            )}
          </View>

          <Card style={[styles.section, { marginTop: spacing.lg }]}>
            {/* Person */}
            <SelectRow
              icon="person-outline"
              label="Person"
              value={person?.name}
              placeholder="Select or add person"
              error={errors.person}
              onPress={() => setSheet('person')}
              chevron
            />

            {kind === 'money' ? (
              <>
                <InputRow
                  icon="cash-outline"
                  label="Amount"
                  value={amountText}
                  onChangeText={(t) => {
                    setAmountText(t.replace(/[^0-9.,\s]/g, ''));
                    setErrors((e) => ({ ...e, amount: undefined }));
                  }}
                  placeholder="0"
                  error={errors.amount}
                  keyboardType="decimal-pad"
                  suffix={(() => {
                    if (amountText.trim() === '') return undefined;
                    const parsed = parseAmountInput(amountText, currencyCode);
                    return parsed.ok
                      ? formatAmountCompact(parsed.value.minor, currencyCode)
                      : undefined;
                  })()}
                  autoFocus={!editing}
                />
                <SelectRow
                  icon="swap-horizontal-outline"
                  label="Currency"
                  value={`${getCurrency(currencyCode).symbol ?? ''} ${currencyCode}`.trim()}
                  onPress={() => setSheet('currency')}
                  chevron
                  hint={
                    currencyCode !== settings.defaultCurrencyCode
                      ? `Default is ${settings.defaultCurrencyCode} — this entry keeps ${currencyCode}`
                      : undefined
                  }
                />
              </>
            ) : (
              <>
                <InputRow
                  icon="cube-outline"
                  label="Item"
                  value={itemName}
                  onChangeText={(t) => {
                    setItemName(t);
                    setErrors((e) => ({ ...e, itemName: undefined }));
                  }}
                  placeholder="e.g. Books, charger"
                  error={errors.itemName}
                  autoFocus={!editing}
                />
                <Pressable
                  onPress={() => setTrackQuantity((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: trackQuantity }}
                  accessibilityLabel="Track quantity"
                  style={styles.trackQtyRow}
                >
                  <Ionicons
                    name={trackQuantity ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={trackQuantity ? colors.accent : colors.textTertiary}
                  />
                  <Text
                    style={[
                      typography.body,
                      { color: colors.textPrimary, marginLeft: spacing.sm },
                    ]}
                  >
                    Track quantity
                  </Text>
                </Pressable>
                {trackQuantity ? (
                  <InputRow
                    icon="layers-outline"
                    label="Quantity"
                    value={quantityText}
                    onChangeText={(t) => {
                      setQuantityText(t.replace(/[^0-9]/g, ''));
                      setErrors((e) => ({ ...e, quantity: undefined }));
                    }}
                    placeholder="How many?"
                    error={errors.quantity}
                    keyboardType="number-pad"
                  />
                ) : (
                  <Text
                    style={[typography.caption, styles.noQtyHint, { color: colors.textTertiary }]}
                  >
                    No quantity required — returns will be tracked by status instead.
                  </Text>
                )}
              </>
            )}
          </Card>

          <Card style={[styles.section, { marginTop: spacing.md }]}>
            <SelectRow
              icon="calendar-clear-outline"
              label="Due date"
              value={dueDate != null ? formatDateShort(dueDate) : undefined}
              placeholder="Optional"
              onPress={() => setSheet('date')}
              chevron
              clearable={dueDate != null}
              onClear={() => setDueDate(null)}
            />
            <SelectRow
              icon="notifications-outline"
              label="Reminder"
              value={reminderConfig ? describeReminderTime(reminderConfig) : undefined}
              placeholder="Optional"
              onPress={() => setSheet('reminder')}
              chevron
              clearable={reminderConfig != null}
              onClear={() => setReminderConfig(null)}
            />
            <SelectRow
              icon="pricetag-outline"
              label="Category"
              value={category?.name}
              placeholder="Optional"
              onPress={() => setSheet('category')}
              chevron
              clearable={categoryId != null}
              onClear={() => setCategoryId(null)}
            />
          </Card>

          <View style={{ paddingHorizontal: 16, marginTop: spacing.md }}>
            <TextField
              label="Note (optional)"
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Will pay after salary"
              multiline
              maxLength={500}
            />
          </View>

          <View style={{ paddingHorizontal: 16, marginTop: spacing.xl }}>
            <Button
              label={editing ? 'Save changes' : 'Save due'}
              onPress={handleSave}
              loading={saving}
              disabled={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PersonPickerSheet
        visible={sheet === 'person'}
        onClose={() => setSheet(null)}
        selectedId={personId}
        onPick={(p) => {
          setPersonId(p.id);
          setErrors((e) => ({ ...e, person: undefined }));
        }}
      />
      <CurrencyPickerSheet
        visible={sheet === 'currency'}
        onClose={() => setSheet(null)}
        selectedCode={currencyCode}
        onPick={(code) => setCurrencyCode(code)}
      />
      <CategoryPickerSheet
        visible={sheet === 'category'}
        onClose={() => setSheet(null)}
        selectedId={categoryId}
        onPick={(id) => setCategoryId(id)}
      />
      <DatePickerSheet
        visible={sheet === 'date'}
        onClose={() => setSheet(null)}
        value={dueDate}
        onChange={(ts) => setDueDate(ts)}
        title="Due date"
      />
      <ReminderSheet
        visible={sheet === 'reminder'}
        onClose={() => setSheet(null)}
        value={reminderConfig}
        onSave={(config) => setReminderConfig(config)}
      />
    </Screen>
  );
}

// --- rows -------------------------------------------------------------------

interface InputRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  suffix?: string;
  autoFocus?: boolean;
}

function InputRow({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
  suffix,
  autoFocus = false,
}: InputRowProps) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View>
      <View style={styles.row}>
        <Ionicons name={icon} size={17} color={colors.textSecondary} />
        <Text
          style={[
            typography.smallMedium,
            { color: colors.textSecondary, width: 72, marginLeft: spacing.sm },
          ]}
        >
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          accessible
          accessibilityLabel={label}
          style={[
            typography.bodyMedium,
            styles.input,
            { color: colors.textPrimary, minHeight: 48 },
          ]}
        />
        {suffix ? (
          <Text numberOfLines={1} style={[typography.small, { color: colors.textTertiary }]}>
            {suffix}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text style={[typography.caption, { color: colors.danger, marginLeft: 38, marginBottom: 4 }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

interface SelectRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  onPress?: () => void;
  chevron?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

function SelectRow({
  icon,
  label,
  value,
  placeholder,
  error,
  hint,
  onPress,
  chevron,
  clearable,
  onClear,
}: SelectRowProps) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View>
      <View style={styles.row}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ?? placeholder ?? ''}`}
          disabled={!onPress}
          style={({ pressed }) => [
            styles.row,
            { flex: 1, opacity: pressed ? 0.7 : 1, minHeight: 50 },
          ]}
        >
          <Ionicons name={icon} size={17} color={colors.textSecondary} />
          <Text
            style={[
              typography.smallMedium,
              { color: colors.textSecondary, width: 72, marginLeft: spacing.sm },
            ]}
          >
            {label}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              typography.bodyMedium,
              {
                flex: 1,
                color: value ? colors.textPrimary : colors.textTertiary,
              },
            ]}
          >
            {value ?? placeholder}
          </Text>
          {clearable ? (
            <Pressable
              onPress={onClear}
              accessibilityRole="button"
              accessibilityLabel={`Clear ${label}`}
              hitSlop={8}
              style={{ paddingHorizontal: 6 }}
            >
              <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
            </Pressable>
          ) : null}
          {chevron && <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
        </Pressable>
      </View>
      {error ? (
        <Text style={[typography.caption, { color: colors.danger, marginLeft: 38, marginBottom: 4 }]}>
          {error}
        </Text>
      ) : null}
      {!error && hint ? (
        <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: 38, marginBottom: 4 }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    textAlignVertical: 'center',
    paddingVertical: 8,
    marginLeft: -4,
  },
  trackQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
    paddingLeft: 2,
  },
  noQtyHint: {
    marginLeft: 33,
    marginBottom: 8,
  },
});
