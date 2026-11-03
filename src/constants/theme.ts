import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B0D12',
    textSecondary: '#5B6170',
    background: '#F6F7FB',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF0F5',
    border: '#E1E4EC',
    accent: '#4F6BF5',
    accentText: '#FFFFFF',
    userBubble: '#4F6BF5',
    success: '#13A46B',
    successMuted: '#E3F6EE',
    warning: '#B7791F',
    warningMuted: '#FBF1DF',
    danger: '#D93F4C',
    dangerMuted: '#FCE8EA',
  },
  dark: {
    text: '#F3F4F8',
    textSecondary: '#9AA0AE',
    background: '#0B0D12',
    surface: '#161922',
    surfaceMuted: '#1F2330',
    border: '#2A2F3D',
    accent: '#7088FF',
    accentText: '#FFFFFF',
    userBubble: '#4F6BF5',
    success: '#3DD598',
    successMuted: '#123326',
    warning: '#F2B45A',
    warningMuted: '#33270F',
    danger: '#FF6B76',
    dangerMuted: '#3A1A1E',
  },
} as const;

export type Theme = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof Theme;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: { mono: 'ui-monospace' },
  default: { mono: 'monospace' },
});

export const MaxContentWidth = 720;
