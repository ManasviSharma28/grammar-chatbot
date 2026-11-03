export type ApiErrorCode =
  | 'network'
  | 'timeout'
  | 'rate_limited'
  | 'busy'
  | 'invalid_input'
  | 'unauthorized'
  | 'not_found'
  | 'server'
  | 'invalid_response';

const MESSAGES: Record<ApiErrorCode, string> = {
  network: 'Server se connect nahi ho paya. Internet check karo aur dobara try karo.',
  timeout: 'Server ne time par jawab nahi diya. Dobara try karo.',
  rate_limited: 'Bahut saare messages ek saath bheje gaye. Ek minute ruk kar try karo.',
  busy: 'AI abhi busy hai. Thodi der mein dobara try karo.',
  invalid_input: 'Message theek nahi hai. Check karke dobara bhejo.',
  unauthorized: 'Session expire ho gaya. App dobara kholo.',
  not_found: 'Ye conversation ab available nahi hai. New chat shuru karo.',
  server: 'Server mein problem aa gayi. Dobara try karo.',
  invalid_response: 'AI ka jawab samajh nahi aaya. Dobara try karo.',
};

const RETRYABLE: ApiErrorCode[] = ['network', 'timeout', 'rate_limited', 'busy', 'server', 'invalid_response'];

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly retryable: boolean;

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? MESSAGES[code]);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = RETRYABLE.includes(code);
  }
}

export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('network');
}
