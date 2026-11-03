export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** The AI provider failed or returned something we could not use. */
export class AiError extends Error {
  constructor(
    readonly reason: 'unavailable' | 'invalid_output' | 'blocked' | 'config',
    message: string
  ) {
    super(message);
    this.name = 'AiError';
  }
}
