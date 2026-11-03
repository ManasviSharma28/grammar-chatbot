import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    await Clipboard.setStringAsync(text);
    setCopied(true);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copied ? 'Copied' : 'Copy text'}
      hitSlop={8}
      onPress={copy}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Icon
        name={copied ? { ios: 'checkmark', android: 'check', web: 'check' } : { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
        size={14}
        color={copied ? 'success' : 'textSecondary'}
      />
      <Text variant="smallStrong" color={copied ? 'success' : 'textSecondary'}>
        {copied ? 'Copied' : 'Copy'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
  },
  pressed: { opacity: 0.6 },
});
