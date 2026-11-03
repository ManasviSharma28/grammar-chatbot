import { z } from 'zod';

import {
  ConversationResultSchema,
  GrammarResultSchema,
  LearningResultSchema,
  ProfessionalResultSchema,
  TranslationResultSchema,
  type AssistantResult,
  type Mode,
} from '../../../shared/chat.js';
import { AiError } from '../errors.js';
import type { JsonGenerator, Turn } from './gemini.js';
import { systemPrompt } from './prompts.js';

const SCHEMAS = {
  grammar: GrammarResultSchema,
  translate: TranslationResultSchema,
  conversation: ConversationResultSchema,
  professional: ProfessionalResultSchema,
  learn: LearningResultSchema,
} satisfies Record<Mode, z.ZodObject>;

/** `kind` is set by the server from the requested mode, so the model is never asked for it. */
function toGeminiSchema(schema: z.ZodObject): object {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema.omit({ kind: true })) as Record<string, unknown>;
  return jsonSchema;
}

const JSON_SCHEMAS = Object.fromEntries(
  Object.entries(SCHEMAS).map(([mode, schema]) => [mode, toGeminiSchema(schema)])
) as Record<Mode, object>;

/** Modes where earlier turns change the answer. Others treat each message on its own. */
const CONTEXTUAL_MODES: Mode[] = ['conversation', 'learn'];
const MAX_HISTORY_TURNS = 10;

export type PriorTurn = { role: 'user'; text: string } | { role: 'assistant'; result: AssistantResult };

function summarize(result: AssistantResult): string {
  switch (result.kind) {
    case 'conversation':
      return result.reply;
    case 'learning':
      return `${result.topic}: ${result.explanation}`;
    case 'grammar':
      return result.corrected;
    case 'translation':
      return result.translation;
    case 'professional':
      return result.rewritten;
  }
}

export type Coach = (input: { mode: Mode; text: string; history: PriorTurn[] }) => Promise<AssistantResult>;

export function createCoach(generate: JsonGenerator): Coach {
  return async ({ mode, text, history }) => {
    const prior: Turn[] = CONTEXTUAL_MODES.includes(mode)
      ? history.slice(-MAX_HISTORY_TURNS).map((t) =>
          t.role === 'user' ? { role: 'user', text: t.text } : { role: 'model', text: summarize(t.result) }
        )
      : [];
    // Gemini requires the conversation to start with a user turn.
    while (prior[0]?.role === 'model') prior.shift();

    const request = {
      system: systemPrompt(mode),
      turns: [...prior, { role: 'user' as const, text }],
      schema: JSON_SCHEMAS[mode],
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      const output = await generate(request);
      const parsed = SCHEMAS[mode].safeParse(
        output && typeof output === 'object' ? { ...output, kind: SCHEMAS[mode].shape.kind.value } : output
      );
      if (parsed.success) {
        const result = parsed.data;
        // The model must not rewrite what the user typed.
        return result.kind === 'grammar' ? { ...result, original: text } : result;
      }
      // Log only the failing paths, never the user's text.
      console.warn(
        `[ai] ${mode} output failed validation (attempt ${attempt + 1}):`,
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
      );
    }
    throw new AiError('invalid_output', `AI output did not match the ${mode} schema`);
  };
}
