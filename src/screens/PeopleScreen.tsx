import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Card, ScreenHeader } from '../components/ui/primitives';
import { SearchBar } from '../components/ui/TextField';
import { EmptyState } from '../components/ui/EmptyState';
import { useTheme } from '../theme/ThemeProvider';
import { useData } from '../context/DataProvider';
import { TabParamList } from '../navigation/types';
import { formatAmountCompact } from '../utils/money';
import { getDueStatusInfo } from '../models/status';
import { Person } from '../types';

type Props = BottomTabScreenProps<TabParamList, 'People'>;

interface PersonRowModel {
  person: Person;
  activeCount: number;
  iOwe: Map<string, number>;
  owesMe: Map<string, number>;
}

export function PeopleScreen({ navigation }: Props) {
  const { colors, spacing, typography, radius } = useTheme();
  const data = useData();
  const [query, setQuery] = useState('');

  const rows = useMemo<PersonRowModel[]>(() => {
    const q = query.trim().toLowerCase();
    return data.people
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .map((person) => {
        let activeCount = 0;
        const iOwe = new Map<string, number>();
        const owesMe = new Map<string, number>();
        for (const due of data.dues) {
          if (due.personId !== person.id || due.archived) continue;
          const info = getDueStatusInfo(
            due,
            due.kind === 'money' ? data.paymentsFor(due.id) : [],
            due.kind === 'item' ? data.returnsFor(due.id) : []
          );
          if (!info.settled) activeCount += 1;
          if (
            due.kind === 'money' &&
            due.currencyCode &&
            !info.settled &&
            (info.remainingMinor ?? 0) > 0
          ) {
            const target = due.direction === 'borrowed' ? iOwe : owesMe;
            target.set(due.currencyCode, (target.get(due.currencyCode) ?? 0) + (info.remainingMinor ?? 0));
          }
          if (
            due.kind === 'item' &&
            !info.settled &&
            (!due.trackQuantity || (info.remainingQuantity ?? 0) > 0)
          ) {
            const target = due.direction === 'borrowed' ? iOwe : owesMe;
            target.set('items', (target.get('items') ?? 0) + 1);
          }
        }
        return { person, activeCount, iOwe, owesMe };
      });
  }, [data, query]);

  const nav = useNavigation<BottomTabNavigationProp<TabParamList>>();

  return (
    <Screen padded={false} safeBottom={false}>
      <ScreenHeader title="People" subtitle="Everyone you borrow from and lend to" />
      <View style={{ paddingHorizontal: 16 }}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search people" />
      </View>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 80 }}
        data={rows}
        keyExtractor={(r) => r.person.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.trim() !== '' && data.people.length > 0 ? (
            <EmptyState icon="search-outline" title="No results found" />
          ) : (
            <EmptyState
              icon="people-outline"
              title="No people yet"
              message="Add someone to start tracking dues."
              actionLabel="Add person"
              onAction={() => navigation.getParent()?.navigate('PersonForm', { mode: 'add' })}
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => nav.getParent()?.navigate('PersonDetails', { personId: item.person.id })}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.person.name}`}
          >
            <Card style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={[styles.avatar, { backgroundColor: colors.accentSoft, borderRadius: radius.pill }]}>
                  <Text style={[typography.titleSemibold, { color: colors.accent }]}>
                    {item.person.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[typography.bodySemibold, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.person.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>
                    {item.activeCount === 0
                      ? 'No active dues'
                      : `${item.activeCount} active due${item.activeCount === 1 ? '' : 's'}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>

              {(item.iOwe.size > 0 || item.owesMe.size > 0) && (
                <View style={styles.totalsWrap}>
                  {item.iOwe.size > 0 && (
                    <Text style={[typography.smallMedium, styles.totalLine]}>
                      <Text style={{ color: colors.borrowed }}>You owe </Text>
                      <Text style={{ color: colors.textPrimary }}>{formatTotalsMap(item.iOwe)}</Text>
                    </Text>
                  )}
                  {item.owesMe.size > 0 && (
                    <Text style={styles.totalLine}>
                      <Text style={[typography.smallMedium, { color: colors.lent }]}>Owes you </Text>
                      <Text style={[typography.smallMedium, { color: colors.textPrimary }]}>
                        {formatTotalsMap(item.owesMe)}
                      </Text>
                    </Text>
                  )}
                </View>
              )}
            </Card>
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => nav.getParent()?.navigate('PersonForm', { mode: 'add' })}
        accessibilityRole="button"
        accessibilityLabel="Add person"
        style={[styles.fab, { backgroundColor: colors.accent, borderRadius: radius.pill, bottom: spacing.xxl, right: spacing.xl }]}
      >
        <Ionicons name="person-add" size={20} color={colors.onAccent} />
        <Text style={[styles.fabLabel, { color: colors.onAccent }]}>Add</Text>
      </Pressable>
    </Screen>
  );
}

function formatTotalsMap(map: Map<string, number>): string {
  const parts: string[] = [];
  for (const [code, minor] of map) {
    parts.push(code === 'items' ? `${minor} item${minor === 1 ? '' : 's'}` : formatAmountCompact(minor, code));
  }
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  rowCard: {
    marginBottom: 10,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalsWrap: {
    marginTop: 10,
    gap: 2,
    paddingLeft: 54,
  },
  totalLine: {},
  fab: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 52,
    paddingHorizontal: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});
