import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconProps = {
  /** SF Symbol on iOS, Material Symbol on Android and web. */
  name: SymbolViewProps['name'];
  size?: number;
  color?: ThemeColor;
};

export function Icon({ name, size = 18, color = 'text' }: IconProps) {
  const theme = useTheme();
  return <SymbolView name={name} size={size} tintColor={theme[color]} />;
}
