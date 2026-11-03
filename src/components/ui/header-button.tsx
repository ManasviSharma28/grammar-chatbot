import { Pressable, StyleSheet } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { Icon } from '@/components/ui/icon';

type HeaderButtonProps = {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
};

export function HeaderButton({ icon, label, onPress }: HeaderButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Icon name={icon} size={20} color="accent" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 6 },
  pressed: { opacity: 0.5 },
});
