/**
 * Calls the real Gemini API. Run with `npm run test:live` (needs GEMINI_API_KEY
 * in server/.env). Assertions check meaning-bearing words, not exact wording,
 * because model phrasing legitimately varies.
 */
import { appendFileSync } from 'node:fs';

import { beforeEach, describe, expect, it } from 'vitest';

import type {
  AssistantResult,
  ConversationResult,
  GrammarResult,
  Mode,
  ProfessionalResult,
  TranslationResult,
} from '../../../shared/chat.js';
import { createCoach } from '../../src/ai/coach.js';
import { createGeminiGenerator } from '../../src/ai/gemini.js';
import { geminiModels, loadConfig } from '../../src/config.js';

const config = loadConfig({ ...process.env, JWT_SECRET: process.env.JWT_SECRET ?? 'x'.repeat(40) });
const coach = createCoach(
  createGeminiGenerator({
    apiKey: config.GEMINI_API_KEY,
    models: geminiModels(config),
    attemptsPerModel: 3,
  })
);

const TIMEOUT = 120_000;

// The free tier allows ~5 requests/minute per model, so space the cases out.
const GAP_MS = Number(process.env.LIVE_GAP_MS ?? 13_000);
let first = true;
beforeEach(async () => {
  if (!first) await new Promise((resolve) => setTimeout(resolve, GAP_MS));
  first = false;
}, GAP_MS + 1_000);

async function ask<T extends AssistantResult>(mode: Mode, text: string): Promise<T> {
  const result = await coach({ mode, text, history: [] });
  console.log(`\n[${mode}] ${text}\n${JSON.stringify(result, null, 2)}`);
  // Optional transcript for reviewing answer quality: LIVE_LOG=/path/to/file.jsonl
  if (process.env.LIVE_LOG) appendFileSync(process.env.LIVE_LOG, `${JSON.stringify({ mode, text, result })}\n`);
  return result as T;
}

const lower = (s: string) => s.toLowerCase();
const hasDevanagari = (s: string) => /[ऀ-ॿ]/.test(s);

function expectHinglishExplanations(result: GrammarResult) {
  for (const m of result.mistakes) expect(hasDevanagari(m.explanation), m.explanation).toBe(false);
  expect(hasDevanagari(result.tip)).toBe(false);
}

describe('grammar correction (live)', () => {
  it('past tense: "I am go to office yesterday."', { timeout: TIMEOUT }, async () => {
    const r = await ask<GrammarResult>('grammar', 'I am go to office yesterday.');
    expect(r.isAlreadyCorrect).toBe(false);
    expect(lower(r.corrected)).toContain('went');
    expect(lower(r.corrected)).toContain('yesterday');
    expect(r.mistakes.some((m) => m.category === 'tense' && m.severity === 'mandatory')).toBe(true);
    expectHinglishExplanations(r);
  });

  it('present tense agreement: "She do not like coffee."', { timeout: TIMEOUT }, async () => {
    const r = await ask<GrammarResult>('grammar', 'She do not like coffee.');
    expect(lower(r.corrected)).toMatch(/she (does not|doesn't) like coffee/);
    expect(r.mistakes.some((m) => m.severity === 'mandatory')).toBe(true);
    expectHinglishExplanations(r);
  });

  it('future tense: "I will going to market tomorrow."', { timeout: TIMEOUT }, async () => {
    const r = await ask<GrammarResult>('grammar', 'I will going to market tomorrow.');
    expect(lower(r.corrected)).toMatch(/i (will go|am going|'m going|will be going)/);
    expect(lower(r.corrected)).toContain('tomorrow');
    expectHinglishExplanations(r);
  });

  it('does not invent mandatory mistakes in a correct sentence', { timeout: TIMEOUT }, async () => {
    const r = await ask<GrammarResult>('grammar', 'I have been working here for three years.');
    expect(r.isAlreadyCorrect).toBe(true);
    expect(r.mistakes.filter((m) => m.severity === 'mandatory')).toHaveLength(0);
  });
});

describe('translation (live)', () => {
  it('Roman Hindi future: "Mujhe kal office nahi aana hai."', { timeout: TIMEOUT }, async () => {
    const r = await ask<TranslationResult>('translate', 'Mujhe kal office nahi aana hai.');
    expect(r.detectedLanguage).toMatch(/roman_hindi|hinglish/);
    expect(lower(r.translation)).toContain('tomorrow');
    expect(lower(r.translation)).toContain('office');
    expect(lower(r.translation)).toMatch(/don't|do not|not/);
  });

  it('Devanagari past: "मैं कल बाजार गया था।"', { timeout: TIMEOUT }, async () => {
    const r = await ask<TranslationResult>('translate', 'मैं कल बाजार गया था।');
    expect(r.detectedLanguage).toBe('hindi');
    expect(lower(r.translation)).toContain('yesterday');
    expect(lower(r.translation)).toMatch(/went|had gone|was/);
    expect(hasDevanagari(r.translation)).toBe(false);
  });

  it('Hinglish present: "Main abhi meeting mein hoon, baad mein call karta hoon."', { timeout: TIMEOUT }, async () => {
    const r = await ask<TranslationResult>('translate', 'Main abhi meeting mein hoon, baad mein call karta hoon.');
    expect(lower(r.translation)).toContain('meeting');
    expect(lower(r.translation)).toMatch(/call|ring/);
    expect(lower(r.translation)).toMatch(/later|back/);
  });

  it('ambiguous pronoun: "Maine usko kal dekha." flags or preserves the ambiguity', { timeout: TIMEOUT }, async () => {
    const r = await ask<TranslationResult>('translate', 'Maine usko kal dekha.');
    expect(lower(r.translation)).toContain('yesterday');
    expect(lower(r.translation)).toMatch(/saw/);
    const preserved = /him or her|her or him|him\/her|them/.test(lower(r.translation));
    expect(r.ambiguity !== null || preserved, 'gender of "usko" should be flagged or kept neutral').toBe(true);
  });
});

describe('other modes (live)', () => {
  it('conversation practice corrects gently and replies in English', { timeout: TIMEOUT }, async () => {
    const r = await ask<ConversationResult>('conversation', 'Hi! I want improve my English.');
    expect(r.reply.length).toBeGreaterThan(0);
    expect(hasDevanagari(r.reply)).toBe(false);
    expect(r.correction).not.toBeNull();
    expect(lower(r.correction!.corrected)).toContain('want to improve');
  });

  it('professional rewrite keeps the meaning', { timeout: TIMEOUT }, async () => {
    const r = await ask<ProfessionalResult>('professional', 'sir i will not come today because fever');
    expect(lower(r.rewritten)).toMatch(/fever|unwell|not feeling well|sick/);
    expect(lower(r.rewritten)).toContain('today');
    expect(r.changes.length).toBeGreaterThan(0);
  });
});
