import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { MODES } from '@/features/chat/modes';
import { useTheme } from '@/hooks/use-theme';
import type { Mode } from '@shared/chat';

export function EmptyState({ mode, onPick }: { mode: Mode; onPick: (text: string) => void }) {
  const theme = useTheme();
  const config = MODES[mode];
  return (
    <View style={styles.container}>
      <View style={[styles.icon, { experimental_backgroundImage: `linear-gradient(135deg, ${theme.accent}, #8B5CF6)` }]}>
        <Icon name={config.icon} size={30} color="accentText" />
      </View>
      <Text variant="title" style={styles.center}>
        {config.title}
      </Text>
      <Text color="textSecondary" style={[styles.center, styles.description]}>
        {config.description}
      </Text>
      <View style={styles.examples}>
        <Text variant="label" color="textSecondary">
          Try an example
        </Text>
        {config.examples.map((example) => (
          <Pressable
            key={example}
            accessibilityRole="button"
            onPress={() => onPick(example)}
            style={({ pressed }) => [
              styles.example,
              { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Text variant="small" style={styles.exampleText}>
              {example}
            </Text>
            <Icon name={{ ios: 'arrow.up.left', android: 'north_west', web: 'north_west' }} size={13} color="textSecondary" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingVertical: Spacing.five },
  icon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  center: { textAlign: 'center' },
  description: { maxWidth: 320 },
  examples: { alignSelf: 'stretch', gap: Spacing.two, marginTop: Spacing.four },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three + 2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exampleText: { flex: 1 },
});
