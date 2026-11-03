/**
 * Contract between the mobile app and the backend. The server validates AI
 * output against these schemas before it ever reaches the app, and the app
 * validates again on receipt.
 */
import { z } from 'zod';

export const MAX_INPUT_LENGTH = 1000;

export const ModeSchema = z.enum(['grammar', 'translate', 'conversation', 'professional', 'learn']);
export type Mode = z.infer<typeof ModeSchema>;

export const MistakeCategorySchema = z.enum([
  'tense',
  'article',
  'preposition',
  'subject_verb_agreement',
  'word_order',
  'vocabulary',
  'spelling',
  'punctuation',
  'other',
]);
export type MistakeCategory = z.infer<typeof MistakeCategorySchema>;

export const MistakeSchema = z.object({
  category: MistakeCategorySchema,
  wrong: z.string(),
  right: z.string(),
  /** `mandatory` = grammatically wrong; `optional` = style/naturalness only. */
  severity: z.enum(['mandatory', 'optional']),
  /** Simple Hinglish explanation. */
  explanation: z.string(),
});
export type Mistake = z.infer<typeof MistakeSchema>;

export const GrammarResultSchema = z.object({
  kind: z.literal('grammar'),
  original: z.string(),
  corrected: z.string(),
  isAlreadyCorrect: z.boolean(),
  natural: z.string().nullable(),
  mistakes: z.array(MistakeSchema),
  meaningHinglish: z.string(),
  tip: z.string(),
});

export const TranslationResultSchema = z.object({
  kind: z.literal('translation'),
  detectedLanguage: z.enum(['hindi', 'roman_hindi', 'hinglish', 'english', 'other']),
  translation: z.string(),
  alternatives: z.array(z.string()),
  ambiguity: z
    .object({
      meanings: z.array(z.object({ english: z.string(), interpretation: z.string() })),
      clarifyingQuestion: z.string(),
    })
    .nullable(),
});

export const ConversationResultSchema = z.object({
  kind: z.literal('conversation'),
  reply: z.string(),
  correction: z
    .object({
      corrected: z.string(),
      mistakes: z.array(MistakeSchema),
    })
    .nullable(),
});

export const ProfessionalResultSchema = z.object({
  kind: z.literal('professional'),
  rewritten: z.string(),
  subject: z.string().nullable(),
  tone: z.string(),
  /** What was changed and why, in Hinglish. */
  changes: z.array(z.string()),
});

export const LearningResultSchema = z.object({
  kind: z.literal('learning'),
  topic: z.string(),
  explanation: z.string(),
  examples: z.array(
    z.object({ english: z.string(), hinglish: z.string(), note: z.string().nullable() })
  ),
  practice: z.object({ question: z.string(), answer: z.string() }).nullable(),
});

export const AssistantResultSchema = z.discriminatedUnion('kind', [
  GrammarResultSchema,
  TranslationResultSchema,
  ConversationResultSchema,
  ProfessionalResultSchema,
  LearningResultSchema,
]);
export type AssistantResult = z.infer<typeof AssistantResultSchema>;
export type GrammarResult = z.infer<typeof GrammarResultSchema>;
export type TranslationResult = z.infer<typeof TranslationResultSchema>;
export type ConversationResult = z.infer<typeof ConversationResultSchema>;
export type ProfessionalResult = z.infer<typeof ProfessionalResultSchema>;
export type LearningResult = z.infer<typeof LearningResultSchema>;

export const ChatRequestSchema = z.object({
  mode: ModeSchema,
  text: z.string().trim().min(1, 'Message is empty').max(MAX_INPUT_LENGTH),
  conversationId: z.string().nullable(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  createdAt: z.string(),
  result: AssistantResultSchema,
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
