import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const SHEET_MAX_HEIGHT_RATIO = 0.92;

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(visible);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) setKeyboardHeight(0);
  }, [visible]);

  useEffect(() => {
    if (visible) {
      mountedRef.current = true;
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (mountedRef.current) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: Dimensions.get('window').height,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        mountedRef.current = false;
      });
    }
  }, [visible, translateY, backdrop]);

  const sheetBottom = keyboardHeight > 0 ? keyboardHeight : 0;
  const sheetHeight = keyboardHeight > 0
    ? Dimensions.get('window').height - keyboardHeight - insets.top
    : Dimensions.get('window').height * SHEET_MAX_HEIGHT_RATIO;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop, backgroundColor: colors.scrim }]}>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close"
          style={styles.flex}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingBottom: insets.bottom + spacing.md,
            bottom: sheetBottom,
            maxHeight: sheetHeight,
            transform: [{ translateY }],
          },
        ]}
        accessibilityViewIsModal
      >
        <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
        {title != null && (
          <Text
            style={[
              typography.titleSemibold,
              { color: colors.textPrimary, marginHorizontal: spacing.xl, marginBottom: spacing.md },
            ]}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
  },
  content: {
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    marginBottom: 12,
  },
});
