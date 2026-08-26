import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Card, SectionHeader, ScreenHeader } from '../components/ui/primitives';
import { EmptyState } from '../components/ui/EmptyState';
import { DueCard } from '../components/ui/DueCard';
import { useTheme } from '../theme/ThemeProvider';
import { useData } from '../context/DataProvider';
import { TabParamList } from '../navigation/types';
import {
  aggregateItemStatusCounts,
  aggregateMoneyByCurrency,
} from '../models/aggregates';
import { formatAmountCompact } from '../utils/money';
import { startOfToday } from '../utils/datetime';
import { Due } from '../types';

type Nav = BottomTabNavigationProp<TabParamList>;

export function DashboardScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const data = useData();

  const activeDues = useMemo(() => data.dues.filter((d) => !d.archived), [data.dues]);

  const borrowedTotals = useMemo(
    () => aggregateMoneyByCurrency(activeDues, data.paymentsByDueId, 'borrowed'),
    [activeDues, data.paymentsByDueId]
  );
  const lentTotals = useMemo(
    () => aggregateMoneyByCurrency(activeDues, data.paymentsByDueId, 'lent'),
    [activeDues, data.paymentsByDueId]
  );

  const borrowedItems = useMemo(
    () => aggregateItemStatusCounts(activeDues, data.returnsByDueId, 'borrowed'),
    [activeDues, data.returnsByDueId]
  );
  const lentItems = useMemo(
    () => aggregateItemStatusCounts(activeDues, data.returnsByDueId, 'lent'),
    [activeDues, data.returnsByDueId]
  );

  const sections = useMemo(() => buildSections(activeDues, data.statusInfoById), [activeDues, data.statusInfoById]);

  const openDue = (due: Due) => navigation.getParent()?.navigate('DueDetails', { dueId: due.id });

  const hasAnyContent =
    borrowedTotals.length > 0 ||
    lentTotals.length > 0 ||
    borrowedItems.activeTotal > 0 ||
    lentItems.activeTotal > 0;

  return (
    <Screen padded={false}>
      <ScreenHeader title="Dues" subtitle="What you owe and what is owed to you" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}>
        {!hasAnyContent ? (
          <View style={{ marginTop: 24 }}>
            <EmptyState
              icon="swap-horizontal-outline"
              title="No dues yet"
              message="Keep track of money or things you borrow and lend."
              actionLabel="Add your first due"
              onAction={() => navigation.getParent()?.navigate('DueForm', { mode: 'add' })}
            />
          </View>
        ) : (
          <>
            <SectionHeader title="Borrowed" />
            <MoneyGroupsCard
              groups={borrowedTotals}
              accentColor={colors.borrowed}
              verb="Paid"
              emptyLabel="No borrowed money right now."
            />

            <SectionHeader title="Lent" />
            <MoneyGroupsCard
              groups={lentTotals}
              accentColor={colors.lent}
              verb="Received"
              emptyLabel="Nothing lent out right now."
            />

            {(borrowedItems.activeTotal > 0 || lentItems.activeTotal > 0) && (
              <>
                <SectionHeader title="Items" />
                <View style={styles.itemsRow}>
                  <ItemsCard
                    label="Borrowed items"
                    counts={borrowedItems}
                    accentColor={colors.borrowed}
                  />
                  <ItemsCard label="Lent items" counts={lentItems} accentColor={colors.lent} />
                </View>
              </>
            )}
          </>
        )}

        {sections.overdue.length > 0 && (
          <>
            <SectionHeader
              title="Overdue"
              action={<SeeAll onPress={() => navigation.navigate('Dues', { filter: 'overdue' })} />}
            />
            {sections.overdue.map((due) => (
              <DueCard
                key={due.id}
                due={due}
                person={data.peopleById.get(due.personId)}
                info={data.statusInfoById.get(due.id)!}
                onPress={() => openDue(due)}
              />
            ))}
          </>
        )}

        {sections.upcoming.length > 0 && (
          <>
            <SectionHeader
              title="Upcoming due dates"
              action={<SeeAll onPress={() => navigation.navigate('Dues', { filter: 'active' })} />}
            />
            {sections.upcoming.map((due) => (
              <DueCard
                key={due.id}
                due={due}
                person={data.peopleById.get(due.personId)}
                info={data.statusInfoById.get(due.id)!}
                onPress={() => openDue(due)}
              />
            ))}
          </>
        )}

        {sections.recentlySettled.length > 0 && (
          <>
            <SectionHeader title="Recently settled" />
            {sections.recentlySettled.map((due) => (
              <DueCard
                key={due.id}
                due={due}
                person={data.peopleById.get(due.personId)}
                info={data.statusInfoById.get(due.id)!}
                onPress={() => openDue(due)}
              />
            ))}
          </>
        )}

        {hasAnyContent && sections.recent.length > 0 && (
          <>
            <SectionHeader
              title="Recent dues"
              action={<SeeAll onPress={() => navigation.navigate('Dues')} />}
            />
            {sections.recent.map((due) => (
              <DueCard
                key={due.id}
                due={due}
                person={data.peopleById.get(due.personId)}
                info={data.statusInfoById.get(due.id)!}
                onPress={() => openDue(due)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

// --- helpers ---------------------------------------------------------------

function SeeAll({ onPress }: { onPress: () => void }) {
  const { colors, typography } = useTheme();
  return (
    <Text onPress={onPress} accessibilityRole="button" style={[typography.captionMedium, { color: colors.accent }]}>
      SEE ALL
    </Text>
  );
}

interface GroupsProps {
  groups: ReturnType<typeof aggregateMoneyByCurrency>;
  accentColor: string;
  verb: string;
  emptyLabel: string;
}

function MoneyGroupsCard({ groups, accentColor, verb, emptyLabel }: GroupsProps) {
  const { colors, typography, spacing, radius } = useTheme();

  if (groups.length === 0) {
    return (
      <Card muted>
        <Text style={[typography.small, { color: colors.textTertiary }]}>{emptyLabel}</Text>
      </Card>
    );
  }

  if (groups.length === 1) {
    const g = groups[0];
    if (!g) return null;
    const settledLabel = verb === 'Paid' ? 'Paid' : 'Received';
    return (
      <Card>
        <View style={styles.bigAmountRow}>
          <Text
            style={[typography.amount, { color: accentColor, flexShrink: 1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
            accessibilityLabel={`Total ${formatAmountCompact(g.totalMinor, g.currencyCode)}`}
          >
            {formatAmountCompact(g.totalMinor, g.currencyCode)}
          </Text>
          {g.dueCount > 1 && (
            <View style={[styles.countPill, { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }]}>
              <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>
                {g.dueCount} dues
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.trio, { marginTop: spacing.md }]}>
          <Stat label="Total" value={formatAmountCompact(g.totalMinor, g.currencyCode)} />
          <Stat label={settledLabel} value={formatAmountCompact(g.settledMinor, g.currencyCode)} tone={colors.success} />
          <Stat label="Remaining" value={formatAmountCompact(g.remainingMinor, g.currencyCode)} tone={accentColor} strong />
        </View>
      </Card>
    );
  }

  return (
    <Card>
      {groups.map((g, index) => (
        <View key={g.currencyCode} style={index > 0 ? styles.groupDivider : undefined}>
          <View style={styles.groupRow}>
            <View style={[styles.codeChip, { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm }]}>
              <Text style={[typography.captionMedium, { color: colors.textPrimary }]}>{g.currencyCode}</Text>
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[typography.bodySemibold, { color: accentColor }]}>
                {formatAmountCompact(g.totalMinor, g.currencyCode)}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {verb} {formatAmountCompact(g.settledMinor, g.currencyCode)} · Remaining{' '}
                {formatAmountCompact(g.remainingMinor, g.currencyCode)}
              </Text>
            </View>
            {g.dueCount > 1 && (
              <Text style={[typography.caption, { color: colors.textTertiary }]}>{g.dueCount}</Text>
            )}
          </View>
        </View>
      ))}
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
  strong = false,
}: {
  label: string;
  value: string;
  tone?: string;
  strong?: boolean;
}) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.statCell}>
      <Text style={[typography.caption, { color: colors.textTertiary }]}>{label.toUpperCase()}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          strong ? typography.bodyLarge : typography.body,
          { fontWeight: '700', color: tone ?? colors.textPrimary, marginTop: 2 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

interface ItemsCardProps {
  label: string;
  counts: ReturnType<typeof aggregateItemStatusCounts>;
  accentColor: string;
}

function ItemsCard({ label, counts, accentColor }: ItemsCardProps) {
  const { colors, typography } = useTheme();
  const Row = ({ n, text }: { n: number; text: string }) =>
    n === 0 ? null : (
      <View style={styles.itemStatRow}>
        <Ionicons name="cube-outline" size={12} color={colors.textSecondary} />
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {n} {text}
        </Text>
      </View>
    );
  return (
    <Card style={{ flex: 1 }}>
      <Text style={[typography.smallMedium, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.itemsCountRow}>
        <Text style={[typography.title, { color: accentColor, fontWeight: '700' }]}>
          {counts.activeTotal - counts.fullyReturned}
        </Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>outstanding</Text>
      </View>
      <Row n={counts.notReturned} text="not returned" />
      <Row n={counts.partiallyReturned} text="partial" />
      <Row n={counts.fullyReturned} text="fully returned" />
    </Card>
  );
}

// --- section building ---------------------------------------------------------

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

function buildSections(dues: Due[], statusInfoById: Map<string, import('../models/status').DueStatusInfo>) {
  const today = startOfToday();
  const overdue: Due[] = [];
  const upcoming: Due[] = [];
  const recentlySettled: Due[] = [];

  for (const due of dues) {
    const info = statusInfoById.get(due.id);
    if (!info) continue;
    if (info.overdue) overdue.push(due);
    else if (!info.settled && due.dueDate != null && due.dueDate >= today && due.dueDate <= today + THIRTY_DAYS) {
      upcoming.push(due);
    }
    if (info.settled && Date.now() - due.updatedAt <= FOURTEEN_DAYS) {
      recentlySettled.push(due);
    }
  }

  overdue.sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0));
  upcoming.sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0));

  const usedIds = new Set([...overdue.slice(0, 4).map((d) => d.id), ...upcoming.slice(0, 4).map((d) => d.id)]);
  const recent = [...dues].filter((d) => !usedIds.has(d.id)).slice(0, 4);

  return {
    overdue: overdue.slice(0, 4),
    upcoming: upcoming.slice(0, 4),
    recentlySettled: recentlySettled.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3),
    recent,
  };
}

const styles = StyleSheet.create({
  itemsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bigAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  trio: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    paddingRight: 8,
  },
  groupDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
    borderStyle: 'solid',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  itemsCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 6,
  },
  itemStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
});
