import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MAX_INPUT_LENGTH } from '@shared/chat';

type ComposerProps = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  busy: boolean;
};

const COUNTER_THRESHOLD = MAX_INPUT_LENGTH * 0.8;

export function Composer({ value, onChange, onSend, placeholder, busy }: ComposerProps) {
  const theme = useTheme();
  const canSend = value.trim().length > 0 && !busy;

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.background }]}>
      <View style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          multiline
          maxLength={MAX_INPUT_LENGTH}
          style={[styles.input, { color: theme.text }]}
          accessibilityLabel="Message"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={onSend}
          style={[styles.send, { backgroundColor: canSend ? theme.accent : theme.surfaceMuted }]}>
          <Icon
            name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
            size={18}
            color={canSend ? 'accentText' : 'textSecondary'}
          />
        </Pressable>
      </View>
      {value.length >= COUNTER_THRESHOLD && (
        <Text variant="small" color={value.length >= MAX_INPUT_LENGTH ? 'danger' : 'textSecondary'} style={styles.counter}>
          {value.length}/{MAX_INPUT_LENGTH}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingLeft: Spacing.four,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 140,
    paddingTop: Spacing.two + 2,
    paddingBottom: Spacing.two + 2,
    fontSize: 16,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  counter: { alignSelf: 'flex-end', marginTop: Spacing.one },
});
