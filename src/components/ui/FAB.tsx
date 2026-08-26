import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';

interface FABProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
}

export function FAB({ onPress, icon = 'add', label = 'New due' }: FABProps) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: colors.accent,
          borderRadius: radius.pill,
          bottom: spacing.xxl,
          right: spacing.xl,
          paddingHorizontal: spacing.lg + 2,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.onAccent} />
      <Text style={[typography.bodySemibold, { color: colors.onAccent }]}>New due</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 52,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
});
