import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import type { ChatMessage, UserMessage } from '@/features/chat/chat-store';
import { ResultCard } from '@/features/chat/components/result-card';
import { MODES } from '@/features/chat/modes';
import { useTheme } from '@/hooks/use-theme';

function FadeIn({ children }: { children: ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [progress]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}>
      {children}
    </Animated.View>
  );
}

function UserBubble({ message, onRetry }: { message: UserMessage; onRetry: (id: string) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.userRow}>
      <View style={styles.meta}>
        <Icon name={MODES[message.mode].icon} size={11} color="textSecondary" />
        <Text variant="label" color="textSecondary">
          {MODES[message.mode].label}
        </Text>
      </View>
      <View style={[styles.userBubble, { backgroundColor: theme.userBubble }]}>
        <Text color="accentText" selectable>
          {message.text}
        </Text>
      </View>
      {message.status === 'failed' && message.error && (
        <View style={[styles.error, { backgroundColor: theme.dangerMuted }]} accessibilityRole="alert">
          <Icon name={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }} size={14} color="danger" />
          <Text variant="small" color="danger" style={styles.errorText}>
            {message.error.message}
          </Text>
          {message.error.retryable && (
            <Pressable
              accessibilityRole="button"
              onPress={() => onRetry(message.id)}
              hitSlop={8}
              style={[styles.retry, { backgroundColor: theme.danger }]}>
              <Icon name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={12} color="accentText" />
              <Text variant="smallStrong" color="accentText">
                Retry
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function AssistantHeader() {
  const theme = useTheme();
  return (
    <View style={styles.meta}>
      <View style={[styles.avatar, { experimental_backgroundImage: `linear-gradient(135deg, ${theme.accent}, #8B5CF6)` }]}>
        <Icon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={10} color="accentText" />
      </View>
      <Text variant="label" color="textSecondary">
        Coach
      </Text>
    </View>
  );
}

export function MessageBubble({ message, onRetry }: { message: ChatMessage; onRetry: (id: string) => void }) {
  return (
    <FadeIn>
      {message.role === 'user' ? (
        <UserBubble message={message} onRetry={onRetry} />
      ) : (
        <View style={styles.assistant}>
          <AssistantHeader />
          <ResultCard result={message.result} />
        </View>
      )}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  userRow: { alignItems: 'flex-end', gap: Spacing.one + 2 },
  userBubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    borderBottomRightRadius: Radius.sm / 2,
  },
  assistant: { gap: Spacing.one + 2 },
  avatar: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: '90%',
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  errorText: { flexShrink: 1 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
  },
});
