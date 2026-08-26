import { TextStyle } from 'react-native';

export const fontSize = {
  caption: 11,
  small: 13,
  body: 15,
  bodyLarge: 17,
  title: 20,
  largeTitle: 28,
  displayAmount: 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

type FontKey =
  | 'caption'
  | 'captionMedium'
  | 'small'
  | 'smallMedium'
  | 'body'
  | 'bodyMedium'
  | 'bodySemibold'
  | 'bodyLarge'
  | 'title'
  | 'titleSemibold'
  | 'largeTitle'
  | 'amount';

const lineHeights: Record<number, number> = {
  11: 14,
  13: 18,
  15: 21,
  17: 24,
  20: 26,
  28: 34,
  34: 40,
};

function style(size: number, weight: string): TextStyle {
  return {
    fontSize: size,
    lineHeight: lineHeights[size] ?? Math.round(size * 1.35),
    fontWeight: weight as TextStyle['fontWeight'],
  };
}

/**
 * Base text styles. Colors are applied by components from the active palette —
 * never hardcode colors here.
 */
export const typography = {
  caption: style(fontSize.caption, fontWeight.medium),
  captionMedium: style(fontSize.caption, fontWeight.semibold),
  small: style(fontSize.small, fontWeight.regular),
  smallMedium: style(fontSize.small, fontWeight.medium),
  body: style(fontSize.body, fontWeight.regular),
  bodyMedium: style(fontSize.body, fontWeight.medium),
  bodySemibold: style(fontSize.body, fontWeight.semibold),
  bodyLarge: style(fontSize.bodyLarge, fontWeight.regular),
  title: style(fontSize.title, fontWeight.regular),
  titleSemibold: style(fontSize.title, fontWeight.semibold),
  largeTitle: style(fontSize.largeTitle, fontWeight.bold),
  amount: style(fontSize.displayAmount, fontWeight.bold),
} satisfies Record<FontKey, TextStyle>;

export type TypographyStyle = TextStyle;
