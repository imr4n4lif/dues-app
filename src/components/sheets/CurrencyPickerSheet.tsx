import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '../ui/BottomSheet';
import { SearchBar } from '../ui/TextField';
import { useTheme } from '../../theme/ThemeProvider';
import { CURRENCIES, POPULAR_CURRENCY_CODES, getCurrency, searchCurrencies } from '../../constants/currencies';
import { formatAmount } from '../../utils/money';

interface CurrencyPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedCode?: string | null;
  onPick: (code: string) => void;
}

export function CurrencyPickerSheet({
  visible,
  onClose,
  selectedCode,
  onPick,
}: CurrencyPickerSheetProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCurrencies(query), [query]);
  const popularSet = useMemo(() => new Set<string>(POPULAR_CURRENCY_CODES), []);

  const handlePick = (code: string) => {
    onPick(code);
    setQuery('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Select currency">
      <View style={{ paddingHorizontal: spacing.xl }}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${CURRENCIES.length} currencies`}
        />
      </View>
      <FlatList
        style={{ marginTop: spacing.sm }}
        data={results}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const selected = item.code === selectedCode;
          return (
            <Pressable
              onPress={() => handlePick(item.code)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} (${item.code})`}
              style={({ pressed }) => [
                styles.row,
                { paddingHorizontal: spacing.xl, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.symbolBox, { backgroundColor: colors.surfaceMuted, borderRadius: radius.md }]}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
                  {getCurrency(item.code).symbol ?? item.code}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[typography.caption, { color: colors.textTertiary }]}>
                  {item.code}
                  {popularSet.has(item.code) ? '  ·  Popular' : ''}
                </Text>
              </View>
              <Text style={[typography.small, { color: colors.textTertiary }]}>
                {formatAmount(1000, item.code)}
              </Text>
              {selected && (
                <Ionicons name="checkmark" size={18} color={colors.accent} />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text
            style={[
              typography.body,
              { color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.xxxl },
            ]}
          >
            No currencies match “{query}”
          </Text>
        }
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  symbolBox: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
