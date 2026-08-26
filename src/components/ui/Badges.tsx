import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeProvider';
import { DueStatus, Direction, DueKind } from '../../types';

interface TagProps {
  children: React.ReactNode;
}

function BaseTag({ children, bg, fg, icon }: TagProps & { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }) {
  const { radius } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: bg, borderRadius: radius.pill }]}>
      <Ionicons name={icon} size={11} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{children}</Text>
    </View>
  );
}

const STATUS_META: Record<
  DueStatus,
  { label: string; icon: keyof typeof Ionicons.glyphMap; tone: 'neutral' | 'warning' | 'success' }
> = {
  unpaid: { label: 'Unpaid', icon: 'cash-outline', tone: 'neutral' },
  partially_paid: { label: 'Partially Paid', icon: 'time-outline', tone: 'warning' },
  fully_paid: { label: 'Fully Paid', icon: 'checkmark-done-outline', tone: 'success' },
  not_returned: { label: 'Not Returned', icon: 'cube-outline', tone: 'neutral' },
  partially_returned: { label: 'Partially Returned', icon: 'sync-outline', tone: 'warning' },
  fully_returned: { label: 'Fully Returned', icon: 'checkmark-done-outline', tone: 'success' },
};

export function StatusBadge({ status }: { status: DueStatus }) {
  const { colors } = useTheme();
  const meta = STATUS_META[status];
  const tone = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    success: { bg: colors.successSoft, fg: colors.success },
  }[meta.tone];
  return (
    <BaseTag bg={tone.bg} fg={tone.fg} icon={meta.icon}>
      {meta.label}
    </BaseTag>
  );
}

export function OverdueTag() {
  const { colors } = useTheme();
  return (
    <BaseTag bg={colors.dangerSoft} fg={colors.danger} icon="warning-outline">
      Overdue
    </BaseTag>
  );
}

export function ArchivedTag() {
  const { colors } = useTheme();
  return (
    <BaseTag bg={colors.surfaceMuted} fg={colors.textTertiary} icon="archive-outline">
      Archived
    </BaseTag>
  );
}

export function SettledEarlyTag() {
  const { colors } = useTheme();
  return (
    <BaseTag bg={colors.successSoft} fg={colors.success} icon="flag-outline">
      Marked settled
    </BaseTag>
  );
}

export function DirectionTag({ direction }: { direction: Direction }) {
  const { colors } = useTheme();
  return direction === 'borrowed' ? (
    <BaseTag bg={colors.borrowedSoft} fg={colors.borrowed} icon="arrow-down-circle-outline">
      Borrowed
    </BaseTag>
  ) : (
    <BaseTag bg={colors.lentSoft} fg={colors.lent} icon="arrow-up-circle-outline">
      Lent
    </BaseTag>
  );
}

export function KindTag({ kind }: { kind: DueKind }) {
  const { colors } = useTheme();
  return kind === 'money' ? (
    <BaseTag bg={colors.infoSoft} fg={colors.info} icon="cash-outline">
      Money
    </BaseTag>
  ) : (
    <BaseTag bg={colors.accentSoft} fg={colors.accent} icon="cube-outline">
      Item
    </BaseTag>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
});
