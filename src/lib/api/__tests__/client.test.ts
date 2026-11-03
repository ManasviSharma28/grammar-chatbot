import { createHttpChatApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { memoryTokenStore } from '@/lib/api/token-store';

jest.mock('expo-secure-store', () => ({}));

const request = { mode: 'translate' as const, text: 'Mujhe kal office nahi aana hai.', conversationId: null };

const validBody = {
  conversationId: 'c1',
  messageId: 'm1',
  createdAt: '2026-10-26T10:00:00.000Z',
  result: {
    kind: 'translation',
    detectedLanguage: 'roman_hindi',
    translation: "I don't have to come to the office tomorrow.",
    alternatives: [],
    ambiguity: null,
  },
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** Fake server: answers /api/auth/anonymous with a new token, /api/chat with `chat(token)`. */
function fakeServer(chat: (token: string | undefined) => Response) {
  let issued = 0;
  return jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith('/api/auth/anonymous')) return json(201, { userId: 'u', token: `t${++issued}` });
    const auth = (init?.headers as Record<string, string>).Authorization;
    return chat(auth?.replace('Bearer ', ''));
  });
}

async function errorCode(chat: (token: string | undefined) => Response) {
  const api = createHttpChatApi('https://api.test', { fetchImpl: fakeServer(chat), tokenStore: memoryTokenStore('t0') });
  try {
    await api.send(request);
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return (error as ApiError).code;
  }
  throw new Error('expected send() to throw');
}

describe('createHttpChatApi', () => {
  it('registers once, stores the token, and sends it with each chat', async () => {
    const fetchImpl = fakeServer(() => json(200, validBody));
    const tokenStore = memoryTokenStore();
    const api = createHttpChatApi('https://api.test', { fetchImpl, tokenStore });

    expect((await api.send(request)).result).toEqual(validBody.result);
    await api.send(request);

    const urls = fetchImpl.mock.calls.map(([url]) => String(url));
    expect(urls).toEqual([
      'https://api.test/api/auth/anonymous',
      'https://api.test/api/chat',
      'https://api.test/api/chat',
    ]);
    expect(await tokenStore.get()).toBe('t1');
    const [, init] = fetchImpl.mock.calls[1];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer t1');
    expect(JSON.parse(init?.body as string)).toEqual(request);
  });

  it('gets a fresh token and retries once when the stored token is rejected', async () => {
    const tokenStore = memoryTokenStore('stale');
    const fetchImpl = fakeServer((token) => (token === 'stale' ? json(401, {}) : json(200, validBody)));
    const api = createHttpChatApi('https://api.test', { fetchImpl, tokenStore });

    await expect(api.send(request)).resolves.toMatchObject({ conversationId: 'c1' });
    expect(await tokenStore.get()).toBe('t1');
  });

  it('maps HTTP status codes to error codes', async () => {
    expect(await errorCode(() => json(400, { error: 'bad' }))).toBe('invalid_input');
    expect(await errorCode(() => json(401, {}))).toBe('unauthorized');
    expect(await errorCode(() => json(404, {}))).toBe('not_found');
    expect(await errorCode(() => json(429, {}))).toBe('rate_limited');
    expect(await errorCode(() => json(503, {}))).toBe('busy');
    expect(await errorCode(() => json(500, {}))).toBe('server');
  });

  it('surfaces the server message for invalid input', async () => {
    const api = createHttpChatApi('https://api.test', {
      fetchImpl: fakeServer(() => json(400, { error: 'Message too long' })),
      tokenStore: memoryTokenStore('t0'),
    });
    await expect(api.send(request)).rejects.toThrow('Message too long');
  });

  it('rejects a 200 response that does not match the schema', async () => {
    expect(await errorCode(() => json(200, { ...validBody, result: { kind: 'translation' } }))).toBe('invalid_response');
  });

  it('reports a network failure as retryable', async () => {
    const api = createHttpChatApi('https://api.test', {
      fetchImpl: jest.fn().mockRejectedValue(new TypeError('Network request failed')),
      tokenStore: memoryTokenStore('t0'),
    });
    await expect(api.send(request)).rejects.toMatchObject({ code: 'network', retryable: true });
    expect(new ApiError('busy').retryable).toBe(true);
    expect(new ApiError('invalid_input').retryable).toBe(false);
    expect(new ApiError('not_found').retryable).toBe(false);
  });
});
