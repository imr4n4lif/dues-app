import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { useTheme } from '../../theme/ThemeProvider';
import { useData } from '../../context/DataProvider';

interface CategoryPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedId: string | null;
  onPick: (categoryId: string | null) => void;
}

export function CategoryPickerSheet({
  visible,
  onClose,
  selectedId,
  onPick,
}: CategoryPickerSheetProps) {
  const { colors, spacing, typography } = useTheme();
  const data = useData();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pick = (id: string | null) => {
    onPick(id);
    setAdding(false);
    setNewName('');
    setError(null);
    onClose();
  };

  const create = async () => {
    setError(null);
    const result = await data.addCategory(newName);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    pick(result.value.id);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Category">
      <View style={{ paddingHorizontal: spacing.xl }}>
        {!adding ? (
          <Button
            label="Create new category"
            icon="add"
            variant="soft"
            size="sm"
            onPress={() => setAdding(true)}
          />
        ) : (
          <View>
            <TextField
              label="Category name"
              value={newName}
              onChangeText={(t) => {
                setNewName(t);
                setError(null);
              }}
              placeholder="e.g. Study"
              error={error}
              autoFocus
              maxLength={60}
            />
            <View style={[styles.createActions, { marginTop: spacing.sm }]}>
              <Button label="Cancel" variant="outline" size="sm" onPress={() => setAdding(false)} />
              <Button
                label="Save"
                size="sm"
                onPress={create}
                disabled={newName.trim().length === 0}
              />
            </View>
          </View>
        )}
      </View>

      <FlatList
        style={{ marginTop: spacing.md }}
        data={data.categories}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Pressable
            onPress={() => pick(null)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.row,
              { paddingHorizontal: spacing.xl, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="ban-outline" size={18} color={colors.textSecondary} />
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, flex: 1, marginLeft: spacing.md }]}>
              No category
            </Text>
            {selectedId == null && <Ionicons name="checkmark" size={18} color={colors.accent} />}
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => pick(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.name}`}
            style={({ pressed }) => [
              styles.row,
              { paddingHorizontal: spacing.xl, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="pricetag-outline" size={18} color={colors.textSecondary} />
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1, marginLeft: spacing.md }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.id === selectedId && <Ionicons name="checkmark" size={18} color={colors.accent} />}
          </Pressable>
        )}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    minHeight: 44,
  },
  createActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
