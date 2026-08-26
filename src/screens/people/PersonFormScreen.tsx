import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../../components/ui/primitives';
import { AppHeader } from '../../components/ui/AppHeader';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useTheme } from '../../theme/ThemeProvider';
import { useData } from '../../context/DataProvider';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PersonForm'>;

export function PersonFormScreen({ route, navigation }: Props) {
  const { colors, typography, spacing } = useTheme();
  const data = useData();

  const params = route.params;
  const editing =
    params.mode === 'edit' ? data.people.find((p) => p.id === params.personId) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const duesCount = editing ? data.dues.filter((d) => d.personId === editing.id).length : 0;

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const input = { name, note: note.trim() || null };
      const result = editing
        ? await data.editPerson(editing, input)
        : await data.addPerson(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    await data.removePerson(editing);
    setConfirmDelete(false);
    // Pop back to the previous screen (details may have been open on top).
    navigation.popToTop();
  };

  return (
    <Screen padded={false}>
      <AppHeader title={editing ? 'Edit person' : 'Add person'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <TextField
          label="Name"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError(null);
          }}
          placeholder="e.g. Rahim"
          error={error}
          maxLength={60}
          autoFocus={!editing}
          hint="Names are unique — you'll pick people instead of typing them each time."
        />
        <View style={{ marginTop: spacing.md }}>
          <TextField
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Colleague from office"
            multiline
            maxLength={500}
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Button label={editing ? 'Save changes' : 'Save person'} onPress={handleSave} loading={saving} disabled={saving} />
        </View>

        {editing && (
          <>
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.lg }]}>
              {duesCount === 0
                ? 'This person has no dues.'
                : `Deleting ${editing.name} also deletes their ${duesCount} due${duesCount === 1 ? '' : 's'}, payments and return history.`}
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <Button
                label="Delete person"
                variant="danger"
                icon="trash-outline"
                onPress={() => setConfirmDelete(true)}
              />
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title={`Delete ${editing?.name ?? ''}?`}
        message={
          duesCount > 0
            ? `This permanently removes ${editing?.name} along with ${duesCount} due${duesCount === 1 ? '' : 's'}, all payments and returns. This cannot be undone.`
            : 'This cannot be undone.'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}


