import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { Screen, ScreenHeader } from '../components/ui/primitives';
import { SearchBar } from '../components/ui/TextField';
import { FilterChip } from '../components/ui/FilterChip';
import { EmptyState } from '../components/ui/EmptyState';
import { DueCard } from '../components/ui/DueCard';
import { FAB } from '../components/ui/FAB';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useData } from '../context/DataProvider';
import { TabParamList } from '../navigation/types';
import {
  DUE_FILTER_KEYS,
  DueFilterKey,
  DueSortKey,
  matchesFilter,
  searchDues,
  sortDues,
} from '../models/aggregates';

const FILTER_LABELS: Record<DueFilterKey, string> = {
  all: 'All',
  borrowed: 'Borrowed',
  lent: 'Lent',
  money: 'Money',
  items: 'Items',
  active: 'Active',
  unpaid: 'Unpaid',
  partially_paid: 'Partially Paid',
  partially_returned: 'Partially Returned',
  fully_settled: 'Fully Settled',
  overdue: 'Overdue',
  archived: 'Archived',
};

const SORT_LABELS: Record<DueSortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  due_date: 'Due date',
  highest_amount: 'Highest amount (per currency)',
  lowest_amount: 'Lowest amount (per currency)',
  upcoming_reminder: 'Upcoming reminder',
  person: 'Person name',
};

type Props = BottomTabScreenProps<TabParamList, 'Dues'>;

export function AllDuesScreen({ route }: Props) {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const data = useData();

  const initialFilter = (
    route.params?.filter && DUE_FILTER_KEYS.includes(route.params.filter as DueFilterKey)
      ? (route.params.filter as DueFilterKey)
      : 'all'
  ) as DueFilterKey;

  const [filter, setFilter] = useState<DueFilterKey>(initialFilter);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<DueSortKey>('newest');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  useEffect(() => {
    if (route.params?.filter) setFilter(initialFilter);
  }, [route.params?.filter, initialFilter]);

  const visibleDues = useMemo(() => {
    let result = data.dues;
    result = searchDues(result, query, { peopleById: data.peopleById });
    const filtered = result.filter((due) => {
      const info = data.statusInfoById.get(due.id);
      return info ? matchesFilter(due, info, filter) : false;
    });
    return sortDues(filtered, sort, {
      peopleById: data.peopleById,
      statusInfoById: data.statusInfoById,
    });
  }, [data.dues, data.peopleById, data.statusInfoById, query, filter, sort]);

  const hasAnyDues = data.dues.length > 0;

  const openDue = (dueId: string) =>
    navigation.getParent()?.navigate('DueDetails', { dueId });

  return (
    <Screen padded={false} safeBottom={false}>
      <ScreenHeader
        title="All dues"
        right={
          <Pressable
            onPress={() => setSortSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Sort: ${SORT_LABELS[sort]}`}
            style={[styles.sortButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
            hitSlop={4}
          >
            <Ionicons name="swap-vertical-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        }
      />
      <View style={{ paddingHorizontal: 16 }}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search person, item, note, amount…" />

        {!hasAnyDues ? null : (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={DUE_FILTER_KEYS}
            keyExtractor={(k) => k}
            renderItem={({ item }) => (
              <FilterChip
                label={FILTER_LABELS[item]}
                selected={item === filter}
                onPress={() => setFilter(item)}
              />
            )}
            style={{ flexGrow: 0, marginTop: 14 }}
          />
        )}
        {!hasAnyDues ? null : <View style={{ height: 14 }} />}
      </View>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        data={visibleDues}
        keyExtractor={(d) => d.id}
        ListEmptyComponent={
          !hasAnyDues ? (
            <EmptyState
              icon="swap-horizontal-outline"
              title="No dues yet"
              message="Keep track of money or things you borrow and lend."
              actionLabel="Add your first due"
              onAction={() => navigation.getParent()?.navigate('DueForm', { mode: 'add' })}
            />
          ) : query.trim() !== '' ? (
            <EmptyState icon="search-outline" title="No results found" message="Try a different search." />
          ) : (
            <EmptyState
              icon="funnel-outline"
              title={`Nothing here`}
              message={`No dues match “${FILTER_LABELS[filter]}”.`}
            />
          )
        }
        renderItem={({ item }) => (
          <DueCard
            due={item}
            person={data.peopleById.get(item.personId)}
            info={data.statusInfoById.get(item.id)!}
            onPress={() => openDue(item.id)}
          />
        )}
      />

      <FAB onPress={() => navigation.getParent()?.navigate('DueForm', { mode: 'add' })} />

      <BottomSheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        title="Sort by"
      >
        {(Object.keys(SORT_LABELS) as DueSortKey[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => {
              setSort(key);
              setSortSheetVisible(false);
            }}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.sortRow,
              { paddingHorizontal: spacing.xl, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
              {SORT_LABELS[key]}
            </Text>
            {key === sort && <Ionicons name="checkmark" size={18} color={colors.accent} />}
          </Pressable>
        ))}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
});
