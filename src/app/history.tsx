import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useChat, type Conversation } from '@/features/chat/chat-store';
import { useTheme } from '@/hooks/use-theme';

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Row({ conversation, onOpen, onDelete }: { conversation: Conversation; onOpen: () => void; onDelete: () => void }) {
  const theme = useTheme();
  const count = conversation.messages.filter((m) => m.role === 'user').length;
  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.rowMain}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {conversation.title}
        </Text>
        <Text variant="small" color="textSecondary">
          {formatDate(conversation.updatedAt)} · {count} {count === 1 ? 'message' : 'messages'}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${conversation.title}`} hitSlop={10} onPress={onDelete}>
        <Icon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} color="danger" />
      </Pressable>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const chat = useChat();

  return (
    <FlatList
      style={styles.flex}
      contentContainerStyle={[styles.list, chat.conversations.length === 0 && styles.flexGrow]}
      data={chat.conversations}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <Row
          conversation={item}
          onOpen={() => {
            chat.open(item.id);
            router.back();
          }}
          onDelete={() => confirm('Delete conversation?', 'Ye conversation hamesha ke liye delete ho jayegi.', () => chat.remove(item.id))}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Icon name={{ ios: 'tray', android: 'inbox', web: 'inbox' }} size={32} color="textSecondary" />
          <Text variant="heading">Abhi koi history nahi hai</Text>
          <Text color="textSecondary" style={styles.center}>
            Chat shuru karo — aapki conversations yahan dikhengi.
          </Text>
        </View>
      }
      ListFooterComponent={
        chat.conversations.length > 0 ? (
          <Button
            label="Delete all history"
            variant="danger"
            onPress={() => confirm('Delete all history?', 'Saari conversations delete ho jayengi.', chat.clearHistory)}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGrow: { flexGrow: 1 },
  list: { gap: Spacing.two, padding: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowMain: { flex: 1, gap: Spacing.half },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  center: { textAlign: 'center' },
});
