import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderButton } from '@/components/ui/header-button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useChat, type ChatMessage } from '@/features/chat/chat-store';
import { Composer } from '@/features/chat/components/composer';
import { EmptyState } from '@/features/chat/components/empty-state';
import { MessageBubble } from '@/features/chat/components/message-bubble';
import { ModeSelector } from '@/features/chat/components/mode-selector';
import { TypingIndicator } from '@/features/chat/components/typing-indicator';
import { MODES } from '@/features/chat/modes';
import { useTheme } from '@/hooks/use-theme';

export default function ChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const chat = useChat();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const messages = chat.active?.messages ?? [];

  // New user message → show the typing indicator at the bottom. New reply → show
  // the top of the reply card, so the corrected sentence is visible first.
  const lastMessage = messages.at(-1);
  useEffect(() => {
    if (!lastMessage) return;
    const timer = setTimeout(() => {
      if (lastMessage.role === 'assistant') {
        listRef.current?.scrollToIndex({ index: messages.length - 1, viewPosition: 0, viewOffset: Spacing.two });
      } else {
        listRef.current?.scrollToEnd({ animated: true });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [lastMessage, messages.length]);

  function send() {
    if (!draft.trim() || chat.isSending) return;
    chat.send(draft);
    setDraft('');
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <HeaderButton
              icon={{ ios: 'clock.arrow.circlepath]ffr', android: 'history', web: 'history' }}
              label="History"
              onPress={() => router.push('/history')}
            />
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <HeaderButton
                icon={{ ios: 'square.and.pencil', android: 'edit_square', web: 'edit_square' }}
                label="New chat"
                onPress={chat.newChat}
              />
              <HeaderButton
                icon={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                label="Settings"
                onPress={() => router.push('/settings')}
              />
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView behavior="padding" automaticOffset style={styles.flex}>
        <View style={styles.content}>
          {chat.isPreview && (
            <View style={[styles.banner, { backgroundColor: theme.warningMuted }]}>
              <Icon name={{ ios: 'info.circle', android: 'info', web: 'info' }} size={13} color="warning" />
              <Text variant="smallStrong" color="warning" numberOfLines={1} style={styles.bannerText}>
                Preview mode · replies are samples, not AI
              </Text>
            </View>
          )}
          <ModeSelector value={chat.mode} onChange={chat.setMode} />
          <FlatList
            ref={listRef}
            style={styles.flex}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MessageBubble message={item} onRetry={chat.retry} />}
            contentContainerStyle={[styles.list, messages.length === 0 && styles.flexGrow]}
            ListEmptyComponent={<EmptyState mode={chat.mode} onPick={setDraft} />}
            ListFooterComponent={chat.isSending ? <TypingIndicator /> : undefined}
            onScrollToIndexFailed={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
          <View style={{ paddingBottom: insets.bottom }}>
            <Composer
              value={draft}
              onChange={setDraft}
              onSend={send}
              placeholder={MODES[chat.mode].placeholder}
              busy={chat.isSending}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGrow: { flexGrow: 1 },
  content: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  headerActions: { flexDirection: 'row', gap: Spacing.three },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.one + 2,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
  },
  bannerText: { flexShrink: 1 },
  list: { gap: Spacing.four, padding: Spacing.four },
});
