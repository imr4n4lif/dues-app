import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Card } from '../../components/ui/primitives';
import { AppHeader } from '../../components/ui/AppHeader';
import { DueCard } from '../../components/ui/DueCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { FilterChip } from '../../components/ui/FilterChip';
import { useTheme } from '../../theme/ThemeProvider';
import { useData } from '../../context/DataProvider';
import { RootStackParamList } from '../../navigation/types';
import { formatAmountCompact } from '../../utils/money';
import { Due } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PersonDetails'>;

type PersonTab = 'all' | 'borrowed' | 'lent' | 'active' | 'settled';

const TABS: readonly { value: PersonTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'borrowed', label: 'Borrowed' },
  { value: 'lent', label: 'Lent' },
  { value: 'active', label: 'Active' },
  { value: 'settled', label: 'Completed' },
];

export function PersonDetailsScreen({ route, navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const data = useData();
  const person = data.peopleById.get(route.params.personId);
  const [tab, setTab] = useState<PersonTab>('all');

  const personDues = useMemo(
    () => data.dues.filter((d) => d.personId === route.params.personId),
    [data.dues, route.params.personId]
  );

  const summary = useMemo(() => {
    let activeCount = 0;
    const iOwe = new Map<string, number>();
    const owesMe = new Map<string, number>();
    for (const due of personDues) {
      if (due.archived) continue;
      const info = data.statusInfoById.get(due.id);
      if (!info) continue;
      if (!info.settled) activeCount += 1;
      // Outstanding money only counts while the due is NOT settled — a
      // manually-marked "fully paid" due has remaining data but owes nothing.
      if (
        due.kind === 'money' &&
        due.currencyCode &&
        !info.settled &&
        (info.remainingMinor ?? 0) > 0
      ) {
        const target = due.direction === 'borrowed' ? iOwe : owesMe;
        target.set(due.currencyCode, (target.get(due.currencyCode ?? '') ?? 0) + (info.remainingMinor ?? 0));
      }
    }
    return { activeCount, iOwe, owesMe };
  }, [personDues, data.statusInfoById]);

  const filtered = useMemo(() => {
    return personDues.filter((due) => {
      const info = data.statusInfoById.get(due.id);
      if (!info) return false;
      switch (tab) {
        case 'all':
          return true;
        case 'borrowed':
          return due.direction === 'borrowed';
        case 'lent':
          return due.direction === 'lent';
        case 'active':
          return !info.settled && !due.archived;
        case 'settled':
          return info.settled || due.archived;
      }
    });
  }, [personDues, tab, data.statusInfoById]);

  if (!person) {
    return (
      <Screen padded={false}>
        <AppHeader title="Person" onBack={() => navigation.goBack()} />
        <EmptyState icon="person-outline" title="Person not found" actionLabel="Go back" onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  const renderDue = ({ item }: { item: Due }) => (
    <DueCard
      due={item}
      person={person}
      info={data.statusInfoById.get(item.id)!}
      onPress={() => navigation.navigate('DueDetails', { dueId: item.id })}
    />
  );

  return (
    <Screen padded={false}>
      <AppHeader
        title={person.name}
        subtitle={`${summary.activeCount} active`}
        onBack={() => navigation.goBack()}
        right={
          <Pressable
            onPress={() => navigation.navigate('PersonForm', { mode: 'edit', personId: person.id })}
            accessibilityRole="button"
            accessibilityLabel="Edit person"
            hitSlop={8}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="create-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        }
      />

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        data={filtered}
        keyExtractor={(d) => d.id}
        ListHeaderComponent={
          <>
            {(summary.iOwe.size > 0 || summary.owesMe.size > 0 || personDues.length > 0) && (
              <Card>
                {summary.iOwe.size > 0 ? (
                  <Text style={[typography.smallMedium, { marginBottom: spacing.xs }]}>
                    <Text style={{ color: colors.borrowed }}>You owe: </Text>
                    <Text style={{ color: colors.textPrimary }}>{formatMap(summary.iOwe)}</Text>
                  </Text>
                ) : null}
                {summary.owesMe.size > 0 ? (
                  <Text style={[typography.smallMedium]}>
                    <Text style={{ color: colors.lent }}>Owes you: </Text>
                    <Text style={{ color: colors.textPrimary }}>{formatMap(summary.owesMe)}</Text>
                  </Text>
                ) : null}
                {summary.iOwe.size === 0 && summary.owesMe.size === 0 ? (
                  <Text style={[typography.smallMedium, { color: colors.success }]}>
                    All settled between you two
                  </Text>
                ) : null}
              </Card>
            )}

            {person.note ? (
              <Text style={[typography.small, { color: colors.textTertiary, marginTop: spacing.md, fontStyle: 'italic' }]}>
                “{person.note}”
              </Text>
            ) : null}

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={TABS}
              keyExtractor={(t) => t.value}
              renderItem={({ item }) => (
                <FilterChip
                  label={item.label}
                  selected={item.value === tab}
                  onPress={() => setTab(item.value)}
                />
              )}
              style={{ flexGrow: 0, marginTop: 14, marginBottom: 12 }}
            />
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="swap-horizontal-outline"
            title="No dues here"
            message={
              personDues.length === 0
                ? `Nothing tracked with ${person.name} yet.`
                : 'Try a different filter.'
            }
            actionLabel={personDues.length === 0 ? 'Add a due' : undefined}
            onAction={
              personDues.length === 0
                ? () => navigation.navigate('DueForm', { mode: 'add', presetPersonId: person.id })
                : undefined
            }
          />
        }
        renderItem={renderDue}
      />
    </Screen>
  );
}

function formatMap(map: Map<string, number>): string {
  return [...map.entries()].map(([code, minor]) => formatAmountCompact(minor, code)).join(' · ');
}
