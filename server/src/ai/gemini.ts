/**
 * Minimal Gemini `generateContent` REST client with JSON-schema output,
 * per-attempt timeouts, retries with backoff, and a fallback model.
 */
import { AiError } from '../errors.js';

export type Turn = { role: 'user' | 'model'; text: string };

export type JsonRequest = {
  system: string;
  turns: Turn[];
  schema: object;
};

export type JsonGenerator = (request: JsonRequest) => Promise<unknown>;

type GeminiOptions = {
  apiKey: string;
  models: string[];
  attemptsPerModel?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

/** This model cannot serve us right now (quota exhausted or not enabled for this key). */
class ModelUnavailableError extends AiError {
  constructor(message: string) {
    super('unavailable', message);
  }
}

const ENDPOINT ='https://generativelanguage.googleapis.com/v1beta/models';

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

/** 5xx/408 are transient. Other 4xx mean our request is wrong. */
function isRetryableStatus(status: number) {
  return status === 408 || status >= 500;
}

export function createGeminiGenerator({
  apiKey,
  models,
  attemptsPerModel = 2,
  timeoutMs = 15_000,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: GeminiOptions): JsonGenerator {
  async function callOnce(model: string, request: JsonRequest): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: request.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
          generationConfig: {
            temperature: 0.3,
            thinkingConfig: { thinkingLevel: 'low' },
            responseMimeType: 'application/json',
            responseJsonSchema: request.schema,
          },
        }),
        signal: controller.signal,
      });
    } catch {
      // A model that is too slow right now is unlikely to be faster on retry.
      if (controller.signal.aborted) throw new ModelUnavailableError(`Gemini ${model} timed out`);
      throw new AiError('unavailable', 'Gemini network error');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      // 429: per-model quota exhausted. 404: model not enabled for this key.
      if (response.status === 429 || response.status === 404) {
        throw new ModelUnavailableError(`Gemini ${model} unavailable (HTTP ${response.status})`);
      }
      if (isRetryableStatus(response.status)) {
        throw new AiError('unavailable', `Gemini ${model} HTTP ${response.status}`);
      }
      // Our request or credentials are wrong; surface as a config error and stop retrying.
      throw new AiError('config', `Gemini ${model} HTTP ${response.status}: ${detail.slice(0, 300)}`);
    }

    const body = (await response.json().catch(() => null)) as GeminiResponse | null;
    if (!body) throw new AiError('unavailable', 'Gemini returned an empty body');
    if (body.promptFeedback?.blockReason) {
      throw new AiError('blocked', `Gemini blocked the prompt: ${body.promptFeedback.blockReason}`);
    }
    const candidate = body.candidates?.[0];
    const text = candidate?.content?.parts
      ?.filter((p) => !p.thought && typeof p.text === 'string')
      .map((p) => p.text)
      .join('');
    if (!text) {
      if (candidate?.finishReason === 'SAFETY') throw new AiError('blocked', 'Gemini blocked the response');
      throw new AiError('invalid_output', `Gemini returned no text (finishReason=${candidate?.finishReason})`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new AiError('invalid_output', 'Gemini returned malformed JSON');
    }
  }

  return async (request) => {
    let lastError: AiError = new AiError('unavailable', 'No Gemini model configured');
    for (const model of models) {
      for (let attempt = 0; attempt < attemptsPerModel; attempt++) {
        const started = Date.now();
        try {
          const output = await callOnce(model, request);
          console.info(`[ai] ${model} ok in ${Date.now() - started}ms`);
          return output;
        } catch (error) {
          console.warn(`[ai] ${model} failed after ${Date.now() - started}ms: ${(error as Error).message}`);
          if (!(error instanceof AiError) || error.reason === 'config' || error.reason === 'blocked') throw error;
          lastError = error;
          // Retrying the same model will not help: move straight to the next one.
          if (error instanceof ModelUnavailableError) break;
          if (attempt < attemptsPerModel - 1) await sleep(400 * 2 ** attempt);
        }
      }
    }
    throw lastError;
  };
}
