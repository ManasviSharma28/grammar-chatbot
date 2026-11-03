import { ChatResponseSchema, type ChatRequest, type ChatResponse } from '@shared/chat';

import { ApiError } from '@/lib/api/errors';
import { createPreviewChatApi } from '@/lib/api/preview';
import { secureTokenStore, type TokenStore } from '@/lib/api/token-store';

export type ChatApi = {
  /** `true` when no backend is configured and responses are canned previews. */
  isPreview: boolean;
  send(request: ChatRequest): Promise<ChatResponse>;
};

// The server may try two models with retries before giving up.
const REQUEST_TIMEOUT_MS = 60_000;

type HttpOptions = {
  fetchImpl?: typeof fetch;
  tokenStore?: TokenStore;
};

function errorMessage(body: unknown): string | undefined {
  return body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : undefined;
}

export function createHttpChatApi(baseUrl: string, { fetchImpl = fetch, tokenStore = secureTokenStore }: HttpOptions = {}): ChatApi {
  async function request(path: string, init: RequestInit): Promise<{ status: number; body: unknown }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...init.headers },
        signal: controller.signal,
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    } catch {
      throw new ApiError(controller.signal.aborted ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
    }
  }

  async function register(): Promise<string> {
    const { status, body } = await request('/api/auth/anonymous', { method: 'POST' });
    if (status === 429) throw new ApiError('rate_limited');
    const token = body && typeof body === 'object' && 'token' in body ? body.token : null;
    if (status !== 201 || typeof token !== 'string') throw new ApiError('server');
    await tokenStore.set(token);
    return token;
  }

  async function postChat(token: string, chat: ChatRequest) {
    return request('/api/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(chat),
    });
  }

  return {
    isPreview: false,
    async send(chat) {
      let token = (await tokenStore.get()) ?? (await register());
      let { status, body } = await postChat(token, chat);
      if (status === 401) {
        // Token expired or the server's database was reset: start a fresh session once.
        await tokenStore.clear();
        token = await register();
        ({ status, body } = await postChat(token, chat));
      }

      if (status >= 200 && status < 300) {
        const parsed = ChatResponseSchema.safeParse(body);
        if (!parsed.success) throw new ApiError('invalid_response');
        return parsed.data;
      }
      if (status === 400 || status === 422) throw new ApiError('invalid_input', errorMessage(body));
      if (status === 401) throw new ApiError('unauthorized');
      if (status === 404) throw new ApiError('not_found');
      if (status === 429) throw new ApiError('rate_limited');
      if (status === 503) throw new ApiError('busy');
      throw new ApiError('server');
    },
  };
}

export function createChatApi(): ChatApi {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  return baseUrl ? createHttpChatApi(baseUrl.replace(/\/$/, '')) : createPreviewChatApi();
}
