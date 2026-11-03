import { describe, expect, it, vi } from 'vitest';

import { createGeminiGenerator } from '../src/ai/gemini.js';
import { AiError } from '../src/errors.js';

const request = { system: 'sys', turns: [{ role: 'user' as const, text: 'hi' }], schema: { type: 'object' } };

function ok(json: unknown) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] }), {
    status: 200,
  });
}
const status = (code: number) => new Response('{}', { status: code });

function generator(fetchImpl: typeof fetch) {
  return createGeminiGenerator({ apiKey: 'test-key', models: ['primary', 'fallback'], fetchImpl, sleep: async () => {} });
}

describe('createGeminiGenerator', () => {
  it('sends the key, system prompt, turns and JSON schema, and parses the JSON reply', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ answer: 42 }));
    await expect(generator(fetchImpl)(request)).resolves.toEqual({ answer: 42 });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('/models/primary:generateContent');
    expect(init.headers['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(init.body);
    expect(body.systemInstruction.parts[0].text).toBe('sys');
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'hi' }] }]);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseJsonSchema).toEqual({ type: 'object' });
  });

  it('retries transient failures on the same model', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(status(503)).mockResolvedValueOnce(ok({ ok: true }));
    await expect(generator(fetchImpl)(request)).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('falls back to the second model when the first keeps failing', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(status(503))
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce(ok({ ok: true }));
    await expect(generator(fetchImpl)(request)).resolves.toEqual({ ok: true });
    expect(fetchImpl.mock.calls[2][0]).toContain('/models/fallback:');
  });

  it('gives up with "unavailable" after all models fail', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(status(503));
    await expect(generator(fetchImpl)(request)).rejects.toMatchObject({ reason: 'unavailable' });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it.each([429, 404])('skips straight to the next model on HTTP %i (quota / model not enabled)', async (code) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(status(code)).mockResolvedValueOnce(ok({ ok: true }));
    await expect(generator(fetchImpl)(request)).resolves.toEqual({ ok: true });
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining('/models/primary:'),
      expect.stringContaining('/models/fallback:'),
    ]);
  });

  it('moves to the next model when a request times out', async () => {
    const hang = (_url: unknown, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))));
    const fetchImpl = vi.fn().mockImplementationOnce(hang).mockResolvedValueOnce(ok({ ok: true }));
    const generate = createGeminiGenerator({ apiKey: 'k', models: ['slow', 'fast'], fetchImpl, timeoutMs: 10, sleep: async () => {} });

    await expect(generate(request)).resolves.toEqual({ ok: true });
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining('/models/slow:'),
      expect.stringContaining('/models/fast:'),
    ]);
  });

  it('does not retry a bad request or bad key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(status(400));
    await expect(generator(fetchImpl)(request)).rejects.toMatchObject({ reason: 'config' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports blocked prompts without retrying', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), { status: 200 }));
    const error = await generator(fetchImpl)(request).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiError);
    expect(error).toMatchObject({ reason: 'blocked' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('treats malformed JSON text as invalid output', async () => {
    const bad = () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{not json' }] } }] }), { status: 200 });
    const fetchImpl = vi.fn().mockImplementation(async () => bad());
    await expect(generator(fetchImpl)(request)).rejects.toMatchObject({ reason: 'invalid_output' });
  });
});
