import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';

type Variant = 'primary' | 'soft' | 'outline' | 'danger' | 'ghost';
type Size = 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  /** Ionicons glyph name, e.g. "cash-outline". Rendered as a real icon. */
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle | ViewStyle[];
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  fullWidth = true,
  accessibilityLabel,
}: ButtonProps) {
  const { colors, radius, typography, spacing } = useTheme();

  const getColors = (): { bg: string; fg: string; border?: string } => {
    switch (variant) {
      case 'primary':
        return { bg: colors.accent, fg: colors.onAccent };
      case 'soft':
        return { bg: colors.accentSoft, fg: colors.accent };
      case 'outline':
        return { bg: 'transparent', fg: colors.textPrimary, border: colors.borderStrong };
      case 'danger':
        return { bg: colors.danger, fg: colors.onAccent };
      case 'ghost':
        return { bg: 'transparent', fg: colors.accent };
    }
  };

  const palette = getColors();
  const isBlocked = disabled || loading;

  const textStyle: TextStyle[] = [
    size === 'sm' ? typography.smallMedium : typography.bodySemibold,
    { color: isBlocked ? colors.textTertiary : palette.fg },
  ];
  const containerStyle: ViewStyle = {
    backgroundColor: isBlocked && variant === 'primary' ? colors.surfaceMuted : palette.bg,
    borderColor: isBlocked ? colors.border : palette.border ?? 'transparent',
    borderRadius: size === 'sm' ? radius.sm : radius.md,
    minHeight: size === 'sm' ? 36 : 48,
    paddingHorizontal: size === 'sm' ? spacing.md : spacing.lg,
    opacity: isBlocked && variant !== 'primary' ? 0.5 : 1,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isBlocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isBlocked }}
      style={({ pressed }) => [
        styles.base,
        containerStyle,
        fullWidth && styles.fullWidth,
        pressed && !isBlocked && styles.pressed,
        ...(Array.isArray(style) ? style : style ? [style] : []),
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {icon != null && (
            <Ionicons
              name={icon as keyof typeof Ionicons.glyphMap}
              size={size === 'sm' ? 15 : 17}
              color={isBlocked ? colors.textTertiary : palette.fg}
              style={{ marginRight: spacing.xs }}
            />
          )}
          <Text style={textStyle}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.82,
  },
});
