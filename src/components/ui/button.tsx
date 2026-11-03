import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({ label, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const background =
    variant === 'primary' ? theme.accent : variant === 'danger' ? theme.dangerMuted : theme.surfaceMuted;
  const color = variant === 'primary' ? 'accentText' : variant === 'danger' ? 'danger' : 'text';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.5 : state.pressed ? 0.8 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <Text variant="smallStrong" color={color}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
