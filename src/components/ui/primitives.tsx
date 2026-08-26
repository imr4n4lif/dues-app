import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider';

interface ScreenProps {
  children: React.ReactNode;
  /** Disable horizontal padding (screens handle their own). */
  padded?: boolean;
  /** Add safe-area bottom padding (default true). Set false for tab screens where the tab bar handles it. */
  safeBottom?: boolean;
}

export function Screen({ children, padded = true, safeBottom = true }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background },
        padded && styles.padded,
        safeBottom && { paddingBottom: insets.bottom },
      ]}
    >
      {children}
    </View>
  );
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned action (e.g. a sort or add button). */
  right?: React.ReactNode;
}

/** Consistent breathing room below every tab header. */
const SCREEN_HEADER_BOTTOM_GAP = 14;

/**
 * Large title header for tab screens. Applies the status-bar / notch inset so
 * content never collides with the notch, and gives every tab the exact same
 * vertical rhythm.
 */
export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screenHeader,
        {
          paddingTop: insets.top + spacing.sm + 4,
          paddingBottom: SCREEN_HEADER_BOTTOM_GAP,
          paddingHorizontal: 16,
        },
      ]}
      accessibilityRole="header"
    >
      <View style={styles.screenHeaderRow}>
        <View style={styles.screenHeaderText}>
          <Text style={[typography.largeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[typography.body, { color: colors.textSecondary, marginTop: 2 }]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.screenHeaderRight}>{right}</View> : null}
      </View>
    </View>
  );
}

interface CardProps extends ViewProps {
  children: React.ReactNode;
  muted?: boolean;
}

export function Card({ children, muted = false, style, ...rest }: CardProps) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: muted ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={[typography.captionMedium, { color: colors.textTertiary, letterSpacing: 0.8 }]}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title.toUpperCase()}
      </Text>
      {action}
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: 16,
  },
  screenHeader: {},
  screenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  screenHeaderText: {
    flexShrink: 1,
  },
  screenHeaderRight: {
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
