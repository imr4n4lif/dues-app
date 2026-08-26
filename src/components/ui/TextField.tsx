import { Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';

interface TextFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'number-pad';
  maxLength?: number;
  hint?: string | null;
  accessibilityLabel?: string;
  autoFocus?: boolean;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline = false,
  keyboardType = 'default',
  maxLength,
  hint,
  accessibilityLabel,
  autoFocus = false,
}: TextFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View style={styles.container}>
      {label != null && (
        <Text style={[typography.smallMedium, { color: colors.textSecondary, marginBottom: 6 }]}>
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel ?? label}
        style={[
          typography.body,
          {
            color: colors.textPrimary,
            backgroundColor: colors.surfaceMuted,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            paddingVertical: multiline ? spacing.md : 12,
            paddingHorizontal: spacing.lg + 2,
            minHeight: multiline ? 88 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
      {error ? (
        <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>{error}</Text>
      ) : hint ? (
        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export function SearchBar({ value, onChangeText, placeholder, style }: SearchBarProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          minHeight: 42,
        },
        style,
      ]}
    >
      <Ionicons name="search-outline" size={17} color={colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Search'}
        placeholderTextColor={colors.textTertiary}
        accessibilityRole="search"
        style={[
          styles.searchInput,
          { color: colors.textPrimary, marginHorizontal: spacing.sm, paddingVertical: 10 },
        ]}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={10}
        >
          <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
});
