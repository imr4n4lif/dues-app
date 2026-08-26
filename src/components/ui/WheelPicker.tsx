import { useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

const ITEM_HEIGHT = 42;
const VISIBLE_ITEMS = 3;

export interface WheelItem<T> {
  value: T;
  label: string;
}

interface WheelPickerProps<T> {
  items: readonly WheelItem<T>[];
  value: T;
  onSelect: (value: T) => void;
  width?: number | `${number}%`;
}

/** Lightweight snapping wheel picker used by time selection sheets. */
export function WheelPicker<T extends string | number>({
  items,
  value,
  onSelect,
  width,
}: WheelPickerProps<T>) {
  const { colors, typography } = useTheme();
  const containerHeight = ITEM_HEIGHT * VISIBLE_ITEMS;
  const padding = (containerHeight - ITEM_HEIGHT) / 2;
  const scrollRef = useRef<ScrollView>(null);

  const indexOfValue = Math.max(
    items.findIndex((i) => i.value === value),
    0
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: indexOfValue * ITEM_HEIGHT,
      animated: false,
    });
    // Re-align whenever the item set or selected value changes.
  }, [indexOfValue]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.min(
      Math.max(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT), 0),
      items.length - 1
    );
    const item = items[index];
    if (item && item.value !== value) onSelect(item.value);
  };

  return (
    <View style={[styles.frame, { height: containerHeight, width }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: padding }}
        onMomentumScrollEnd={onMomentumEnd}
        accessible
        accessibilityRole="adjustable"
      >
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <View key={String(item.value)} style={[styles.item, { height: ITEM_HEIGHT }]}>
              <Text
                style={[
                  typography.bodyLarge,
                  { color: selected ? colors.textPrimary : colors.textTertiary },
                  selected && styles.selectedText,
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    fontWeight: '700',
  },
});
