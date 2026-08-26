import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { useTheme } from '../../theme/ThemeProvider';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.scrim }]} onPress={onCancel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              padding: spacing.xl,
              marginHorizontal: spacing.xxl,
            },
          ]}
          accessibilityViewIsModal
        >
          <Text style={[typography.titleSemibold, { color: colors.textPrimary }]} accessibilityRole="header">
            {title}
          </Text>
          {message ? (
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: spacing.sm + 2 },
              ]}
            >
              {message}
            </Text>
          ) : null}
          <View style={[styles.actions, { marginTop: spacing.xl }]}>
            <View style={styles.buttonRow}>
              <Button
                label={cancelLabel}
                variant="outline"
                size="sm"
                onPress={onCancel}
                style={styles.buttonFlex}
              />
              <Button
                label={confirmLabel}
                variant={destructive ? 'danger' : 'primary'}
                size="sm"
                onPress={onConfirm}
                style={styles.buttonFlex}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
  },
  actions: {},
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonFlex: {
    flex: 1,
  },
});
