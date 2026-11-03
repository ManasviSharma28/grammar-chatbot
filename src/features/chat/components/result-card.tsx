import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { Highlight, MistakeList, Section } from '@/features/chat/components/card-parts';
import { useTheme } from '@/hooks/use-theme';
import type {
  AssistantResult,
  ConversationResult,
  GrammarResult,
  LearningResult,
  ProfessionalResult,
  TranslationResult,
} from '@shared/chat';

function GrammarCard({ result }: { result: GrammarResult }) {
  const mandatory = result.mistakes.filter((m) => m.severity === 'mandatory');
  const optional = result.mistakes.filter((m) => m.severity === 'optional');
  return (
    <>
      {result.isAlreadyCorrect ? (
        <Highlight label="Already correct ✓" text={result.corrected} />
      ) : (
        <>
          <Section label="You wrote">
            <Text color="textSecondary">{result.original}</Text>
          </Section>
          <Highlight label="Corrected English" text={result.corrected} />
        </>
      )}
      {result.natural && <Highlight label="More natural" text={result.natural} tone="accent" />}
      {mandatory.length > 0 && (
        <Section label="Mistakes">
          <MistakeList mistakes={mandatory} />
        </Section>
      )}
      {optional.length > 0 && (
        <Section label="Optional improvements">
          <MistakeList mistakes={optional} />
        </Section>
      )}
      <Section label="Hindi / Hinglish meaning">
        <Text>{result.meaningHinglish}</Text>
      </Section>
      <Tip text={result.tip} />
    </>
  );
}

const LANGUAGE_LABELS: Record<TranslationResult['detectedLanguage'], string> = {
  hindi: 'Hindi',
  roman_hindi: 'Roman Hindi',
  hinglish: 'Hinglish',
  english: 'English',
  other: 'Detected',
};

function TranslationCard({ result }: { result: TranslationResult }) {
  return (
    <>
      <Highlight label={`English · from ${LANGUAGE_LABELS[result.detectedLanguage]}`} text={result.translation} />
      {result.ambiguity && (
        <Section label="Ye sentence do tarah samjha ja sakta hai">
          {result.ambiguity.meanings.map((m, i) => (
            <Text key={i} variant="small">
              <Text variant="smallStrong">{m.english}</Text> — {m.interpretation}
            </Text>
          ))}
          <Text variant="smallStrong" color="accent">
            {result.ambiguity.clarifyingQuestion}
          </Text>
        </Section>
      )}
      {result.alternatives.length > 0 && (
        <Section label="Other ways to say it">
          {result.alternatives.map((a, i) => (
            <Text key={i} variant="small" selectable>
              • {a}
            </Text>
          ))}
        </Section>
      )}
    </>
  );
}

function ConversationCard({ result }: { result: ConversationResult }) {
  return (
    <>
      <Text selectable>{result.reply}</Text>
      {result.correction && (
        <>
          <Highlight label="Your message, corrected" text={result.correction.corrected} />
          {result.correction.mistakes.length > 0 && <MistakeList mistakes={result.correction.mistakes} />}
        </>
      )}
    </>
  );
}

function ProfessionalCard({ result }: { result: ProfessionalResult }) {
  return (
    <>
      {result.subject && <Highlight label="Subject" text={result.subject} tone="accent" />}
      <Highlight label={`Rewritten · ${result.tone}`} text={result.rewritten} />
      {result.changes.length > 0 && (
        <Section label="What changed">
          {result.changes.map((c, i) => (
            <Text key={i} variant="small" color="textSecondary">
              • {c}
            </Text>
          ))}
        </Section>
      )}
    </>
  );
}

function LearningCard({ result }: { result: LearningResult }) {
  const theme = useTheme();
  return (
    <>
      <Text variant="heading">{result.topic}</Text>
      <Text>{result.explanation}</Text>
      <Section label="Examples">
        {result.examples.map((e, i) => (
          <View key={i} style={[styles.example, { borderColor: theme.accent }]}>
            <Text variant="bodyStrong" selectable>
              {e.english}
            </Text>
            <Text variant="small" color="textSecondary">
              {e.hinglish}
            </Text>
            {e.note && (
              <Text variant="small" color="accent">
                {e.note}
              </Text>
            )}
          </View>
        ))}
      </Section>
      {result.practice && <Practice question={result.practice.question} answer={result.practice.answer} />}
    </>
  );
}

function Practice({ question, answer }: { question: string; answer: string }) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={[styles.practice, { backgroundColor: theme.surfaceMuted }]}>
      <Text variant="label" color="textSecondary">
        Practice
      </Text>
      <Text>{question}</Text>
      {revealed ? (
        <Text variant="bodyStrong" color="success">
          ✓ {answer}
        </Text>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setRevealed(true)} hitSlop={8}>
          <Text variant="smallStrong" color="accent">
            Show answer
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function Tip({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tip, { backgroundColor: theme.warningMuted }]}>
      <Icon name={{ ios: 'lightbulb', android: 'lightbulb', web: 'lightbulb' }} size={15} color="warning" />
      <Text variant="small" style={styles.tipText}>
        {text}
      </Text>
    </View>
  );
}

export function ResultCard({ result }: { result: AssistantResult }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {result.kind === 'grammar' && <GrammarCard result={result} />}
      {result.kind === 'translation' && <TranslationCard result={result} />}
      {result.kind === 'conversation' && <ConversationCard result={result} />}
      {result.kind === 'professional' && <ProfessionalCard result={result} />}
      {result.kind === 'learning' && <LearningCard result={result} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  example: { gap: Spacing.half, paddingLeft: Spacing.three, borderLeftWidth: 2, marginTop: Spacing.two },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md },
  tipText: { flex: 1 },
  practice: { gap: Spacing.one + 2, padding: Spacing.three, borderRadius: Radius.md },
});
