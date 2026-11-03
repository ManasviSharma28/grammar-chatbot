import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'title' | 'heading' | 'body' | 'bodyStrong' | 'small' | 'smallStrong' | 'label';

export type TextProps = RNTextProps & {
  variant?: Variant;
  color?: ThemeColor;
};

export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const theme = useTheme();
  return <RNText style={[styles[variant], { color: theme[color] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: 700 },
  body: { fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: 600 },
  small: { fontSize: 14, lineHeight: 20 },
  smallStrong: { fontSize: 14, lineHeight: 20, fontWeight: 600 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' },
});
