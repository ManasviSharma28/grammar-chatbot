import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CopyButton } from '@/components/ui/copy-button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Mistake } from '@shared/chat';

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** Emphasised, copyable block for the main English output of a card. */
export function Highlight({ label, text, tone = 'success' }: { label: string; text: string; tone?: 'success' | 'accent' }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.highlight,
        {
          backgroundColor: tone === 'success' ? theme.successMuted : theme.surfaceMuted,
          borderColor: tone === 'success' ? theme.success : theme.accent,
        },
      ]}>
      <View style={styles.highlightHeader}>
        <Text variant="label" color={tone === 'success' ? 'success' : 'accent'}>
          {label}
        </Text>
        <CopyButton text={text} />
      </View>
      <Text variant="bodyStrong" selectable>
        {text}
      </Text>
    </View>
  );
}

const CATEGORY_LABELS: Record<Mistake['category'], string> = {
  tense: 'Tense',
  article: 'Article',
  preposition: 'Preposition',
  subject_verb_agreement: 'Subject–verb',
  word_order: 'Word order',
  vocabulary: 'Vocabulary',
  spelling: 'Spelling',
  punctuation: 'Punctuation',
  other: 'Grammar',
};

export function Badge({ label, color, background }: { label: string; color: ThemeColor; background: ThemeColor }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme[background] }]}>
      <Text variant="label" color={color}>
        {label}
      </Text>
    </View>
  );
}

export function MistakeList({ mistakes }: { mistakes: Mistake[] }) {
  const theme = useTheme();
  return (
    <View style={styles.mistakes}>
      {mistakes.map((m, i) => {
        const mandatory = m.severity === 'mandatory';
        return (
          <View key={i} style={[styles.mistake, i > 0 && [styles.divider, { borderColor: theme.border }]]}>
            <View style={styles.badges}>
              <Badge
                label={mandatory ? 'Zaroori' : 'Optional'}
                color={mandatory ? 'danger' : 'warning'}
                background={mandatory ? 'dangerMuted' : 'warningMuted'}
              />
              <Badge label={CATEGORY_LABELS[m.category]} color="textSecondary" background="surfaceMuted" />
            </View>
            <Text variant="smallStrong">
              <Text variant="smallStrong" color="danger" style={styles.strike}>
                {m.wrong}
              </Text>
              {'  →  '}
              <Text variant="smallStrong" color="success">
                {m.right}
              </Text>
            </Text>
            <Text variant="small" color="textSecondary">
              {m.explanation}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.one },
  highlight: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
  },
  highlightHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mistakes: { gap: Spacing.three, paddingTop: Spacing.one },
  mistake: { gap: Spacing.one },
  divider: { paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  badges: { flexDirection: 'row', gap: Spacing.one },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Radius.pill },
  strike: { textDecorationLine: 'line-through' },
});
