import { describe, expect, it, vi } from 'vitest';

import { createCoach } from '../src/ai/coach.js';
import type { JsonGenerator } from '../src/ai/gemini.js';
import { conversationResult, grammarResult } from './fixtures.js';

describe('createCoach', () => {
  it('returns schema-valid output and keeps the original text exactly as typed', async () => {
    const { kind: _kind, ...modelOutput } = grammarResult;
    const generate = vi.fn<JsonGenerator>().mockResolvedValue({ ...modelOutput, original: 'model rewrote this' });
    const coach = createCoach(generate);

    const result = await coach({ mode: 'grammar', text: 'I am go to office yesterday.', history: [] });
    expect(result).toEqual({ ...grammarResult, original: 'I am go to office yesterday.' });
  });

  it('asks again once when the output does not match the schema', async () => {
    const generate = vi.fn<JsonGenerator>().mockResolvedValueOnce({ kind: 'grammar' }).mockResolvedValueOnce(grammarResult);
    await expect(createCoach(generate)({ mode: 'grammar', text: 'x', history: [] })).resolves.toMatchObject({
      corrected: grammarResult.corrected,
    });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('fails with invalid_output when the output is wrong twice', async () => {
    const generate = vi.fn<JsonGenerator>().mockResolvedValue({ kind: 'translation' });
    await expect(createCoach(generate)({ mode: 'translate', text: 'x', history: [] })).rejects.toMatchObject({
      reason: 'invalid_output',
    });
  });

  it('rejects output for a different mode than requested', async () => {
    const generate = vi.fn<JsonGenerator>().mockResolvedValue(grammarResult);
    await expect(createCoach(generate)({ mode: 'conversation', text: 'x', history: [] })).rejects.toMatchObject({
      reason: 'invalid_output',
    });
  });

  it('sends the mode-specific system prompt and JSON schema', async () => {
    const generate = vi.fn<JsonGenerator>().mockResolvedValue(grammarResult);
    await createCoach(generate)({ mode: 'grammar', text: 'x', history: [] });

    const { system, schema } = generate.mock.calls[0][0];
    expect(system).toContain('MODE: Grammar correction');
    expect(system).toContain('Hinglish');
    expect(schema).toMatchObject({ type: 'object', required: expect.arrayContaining(['corrected', 'mistakes']) });
    expect(schema).not.toHaveProperty('$schema');
    // The server sets `kind` itself; the model is never asked for it.
    expect(schema).not.toHaveProperty('properties.kind');
  });

  it('includes earlier turns for conversation mode only', async () => {
    const history = [
      { role: 'user' as const, text: 'I like books.' },
      { role: 'assistant' as const, result: conversationResult },
    ];
    const generate = vi.fn<JsonGenerator>().mockResolvedValueOnce(conversationResult).mockResolvedValueOnce(grammarResult);
    const coach = createCoach(generate);

    await coach({ mode: 'conversation', text: 'Novels mostly.', history });
    expect(generate.mock.calls[0][0].turns).toEqual([
      { role: 'user', text: 'I like books.' },
      { role: 'model', text: 'Nice! What do you like to read?' },
      { role: 'user', text: 'Novels mostly.' },
    ]);

    await coach({ mode: 'grammar', text: 'x', history });
    expect(generate.mock.calls[1][0].turns).toEqual([{ role: 'user', text: 'x' }]);
  });
});
