import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
  color?: string;
  accessibilityLabel?: string;
}

export function ProgressBar({ fraction, color, accessibilityLabel }: ProgressBarProps) {
  const { colors, radius } = useTheme();
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const barColor = color ?? colors.accent;
  return (
    <View
      style={[styles.track, { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }]}
      accessibilityLabel={
        accessibilityLabel ?? `${Math.round(clamped * 100)} percent complete`
      }
      accessibilityRole="progressbar"
    >
      <View
        style={[
          styles.fill,
          {
            backgroundColor: barColor,
            borderRadius: radius.pill,
            width: `${Math.round(clamped * 100)}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    overflow: 'hidden',
    flexGrow: 1,
  },
  fill: {
    height: '100%',
  },
});
