import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ExampleCardProps = {
  title: string;
  /** The real-world problem this example solves. */
  problem: string;
  children: ReactNode;
};

export function ExampleCard({ title, problem, children }: ExampleCardProps) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text variant="heading">{title}</Text>
      <Text variant="small" color="textSecondary">
        {problem}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
