import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { SearchBar, TextField } from '../ui/TextField';
import { useTheme } from '../../theme/ThemeProvider';
import { useData } from '../../context/DataProvider';
import { Person } from '../../types';

interface PersonPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedId?: string | null;
  onPick: (person: Person) => void;
}

export function PersonPickerSheet({
  visible,
  onClose,
  selectedId,
  onPick,
}: PersonPickerSheetProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const data = useData();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(() => data.people.length === 0);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.people;
    return data.people.filter((p) => p.name.toLowerCase().includes(q));
  }, [data.people, query]);

  const reset = () => {
    setQuery('');
    setCreating(false);
    setNewName('');
    setError(null);
  };

  const handlePick = (person: Person) => {
    onPick(person);
    reset();
    onClose();
  };

  const handleCreate = async () => {
    setSaving(true);
    const result = await data.addPerson({ name: newName, note: null });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    handlePick(result.value);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Select person">
      {!creating ? (
        <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing.xl }}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Search people"
            />
            <View style={{ marginTop: spacing.sm }}>
              <Button
                label="Add new person"
                icon="person-add-outline"
                variant="soft"
                size="sm"
                onPress={() => setCreating(true)}
              />
            </View>
          </View>
          <FlatList
            style={{ marginTop: spacing.md, flex: 1 }}
            data={results}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handlePick(item)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.name}`}
                style={({ pressed }) => [
                  styles.row,
                  { paddingHorizontal: spacing.xl, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: colors.accentSoft, borderRadius: radius.pill }]}>
                  <Text style={[typography.bodySemibold, { color: colors.accent }]}>
                    {item.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1, marginLeft: spacing.md }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.id === selectedId && (
                  <Ionicons name="checkmark" size={18} color={colors.accent} />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              query.trim() !== '' && data.people.length > 0 ? (
                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.textTertiary,
                      textAlign: 'center',
                      paddingVertical: spacing.xxxl,
                    },
                  ]}
                >
                  No people match "{query.trim()}"
                </Text>
              ) : (
                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.textTertiary,
                      textAlign: 'center',
                      paddingVertical: spacing.xxxl,
                    },
                  ]}
                >
                  No people yet — add someone above to start tracking dues.
                </Text>
              )
            }
          />
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <TextField
            label="Name"
            value={newName}
            onChangeText={(text) => {
              setNewName(text);
              setError(null);
            }}
            placeholder="e.g. Rahim"
            error={error}
            autoFocus
            maxLength={60}
          />
          <View style={[styles.createActions, { marginTop: spacing.lg }]}>
            <Button
              label="Cancel"
              variant="outline"
              size="sm"
              onPress={() => {
                setCreating(false);
                setError(null);
              }}
              style={styles.flexButton}
            />
            <Button
              label={saving ? 'Saving…' : 'Save person'}
              size="sm"
              onPress={handleCreate}
              disabled={newName.trim().length === 0 || saving}
              style={styles.flexButton}
            />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  flexButton: {
    flex: 1,
  },
});
