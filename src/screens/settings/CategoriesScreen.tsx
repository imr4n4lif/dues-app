import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../components/ui/primitives';
import { AppHeader } from '../../components/ui/AppHeader';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme } from '../../theme/ThemeProvider';
import { useData } from '../../context/DataProvider';
import { RootStackParamList } from '../../navigation/types';
import { validateCategoryName } from '../../services/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'Categories'>;

export function CategoriesScreen({ navigation }: Props) {
  const { colors, typography, spacing } = useTheme();
  const data = useData();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const usageCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const due of data.dues) {
      if (due.categoryId) map.set(due.categoryId, (map.get(due.categoryId) ?? 0) + 1);
    }
    return map;
  }, [data.dues]);

  const handleAdd = async () => {
    setError(null);
    const existingLower = new Set(data.categories.map((c) => c.name.toLowerCase()));
    const validated = validateCategoryName(newName, existingLower);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    await data.addCategory(validated.value);
    setNewName('');
  };

  const targetCategory = data.categories.find((c) => c.id === pendingDelete);

  return (
    <Screen padded={false}>
      <AppHeader title="Categories" onBack={() => navigation.goBack()} />

      <View style={{ paddingHorizontal: 16 }}>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          Optional labels for your dues. Categories are suggestions — dues never require one.
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <TextField
            label="New category"
            value={newName}
            onChangeText={(t) => {
              setNewName(t);
              setError(null);
            }}
            placeholder="e.g. Travel"
            error={error}
            maxLength={60}
          />
          <View style={{ marginTop: spacing.sm }}>
            <Button
              label="Add category"
              icon="add"
              size="sm"
              variant="soft"
              onPress={() => void handleAdd()}
              disabled={newName.trim().length === 0}
            />
          </View>
        </View>
      </View>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        data={data.categories}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={
          <EmptyState
            icon="pricetag-outline"
            title="No categories"
            message="Add one above if you want to label dues."
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginLeft: spacing.md, flexShrink: 1 }]}>
              {item.name}
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              {usageCounts.get(item.id) ?? 0} dues
            </Text>
            <Pressable
              onPress={() => setPendingDelete(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name}`}
              hitSlop={8}
              style={{ padding: spacing.xs }}
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.textTertiary} />
            </Pressable>
          </View>
        )}
      />

      <ConfirmDialog
        visible={targetCategory != null}
        title={`Delete “${targetCategory?.name ?? ''}”?`}
        message="Dues using this category keep all their data; they will simply have no category."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (targetCategory) void data.removeCategory(targetCategory);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
