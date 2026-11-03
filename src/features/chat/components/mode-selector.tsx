import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { MODE_ORDER, MODES } from '@/features/chat/modes';
import { useTheme } from '@/hooks/use-theme';
import type { Mode } from '@shared/chat';

export function ModeSelector({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist">
      {MODE_ORDER.map((mode) => {
        const selected = mode === value;
        return (
          <Pressable
            key={mode}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(mode)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.accent : theme.surface,
                borderColor: selected ? theme.accent : theme.border,
              },
            ]}>
            <Icon name={MODES[mode].icon} size={14} color={selected ? 'accentText' : 'textSecondary'} />
            <Text variant="smallStrong" color={selected ? 'accentText' : 'text'}>
              {MODES[mode].label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView otherwise grows to fill the column.
  scroll: { flexGrow: 0 },
  row: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
