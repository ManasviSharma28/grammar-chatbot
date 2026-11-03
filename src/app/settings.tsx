import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useChat } from '@/features/chat/chat-store';
import { MODE_ORDER, MODES } from '@/features/chat/modes';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const chat = useChat();
  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text variant="label" color="textSecondary">
        Learning
      </Text>
      <View style={card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text variant="bodyStrong">Track my mistakes</Text>
            <Text variant="small" color="textSecondary">
              Aapki baar-baar hone wali galtiyon ko save karke progress dikhayenge. Aap kabhi bhi band kar sakte ho.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Track my mistakes"
            value={chat.settings.trackProgress}
            onValueChange={(trackProgress) => chat.updateSettings({ trackProgress })}
            trackColor={{ true: theme.accent }}
          />
        </View>
      </View>

      <Text variant="label" color="textSecondary">
        Modes
      </Text>
      <View style={card}>
        {MODE_ORDER.map((mode) => (
          <View key={mode} style={styles.modeRow}>
            <Text variant="bodyStrong">{MODES[mode].label}</Text>
            <Text variant="small" color="textSecondary">
              {MODES[mode].description}
            </Text>
          </View>
        ))}
      </View>

      <Text variant="label" color="textSecondary">
        Connection
      </Text>
      <View style={card}>
        <Text variant="bodyStrong">{chat.isPreview ? 'Preview (no backend)' : 'Connected to backend'}</Text>
        <Text variant="small" color="textSecondary">
          {chat.isPreview
            ? 'EXPO_PUBLIC_API_URL set nahi hai, isliye sample jawab dikh rahe hain.'
            : process.env.EXPO_PUBLIC_API_URL}
        </Text>
      </View>

      <Text variant="label" color="textSecondary">
        Developer
      </Text>
      <View style={card}>
        <View style={styles.modeRow}>
          <Text variant="bodyStrong">Practice Lab</Text>
          <Text variant="small" color="textSecondary">
            Working examples of layout, lists, forms and animations.
          </Text>
        </View>
        <Button label="Open Practice Lab" variant="secondary" onPress={() => router.push('/practice')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.two, padding: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowText: { flex: 1, gap: Spacing.half },
  modeRow: { gap: Spacing.half },
});
