import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DOTS = 3;

export function TypingIndicator() {
  const theme = useTheme();
  const [values] = useState(() => Array.from({ length: DOTS }, () => new Animated.Value(0)));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.stagger(
        150,
        values.map((v) =>
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true }),
          ])
        )
      )
    );
    animation.start();
    return () => animation.stop();
  }, [values]);

  return (
    <View
      accessibilityLabel="Assistant is typing"
      accessibilityRole="progressbar"
      style={[styles.bubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {values.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: theme.textSecondary,
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
