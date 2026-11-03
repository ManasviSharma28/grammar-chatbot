import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import type { Coach } from './ai/coach.js';
import { createAnonymousUser, requireAuth } from './auth.js';
import { AiError, HttpError } from './errors.js';
import { chatRouter } from './routes/chat.js';

export type AppOptions = {
  coach: Coach;
  jwtSecret: string;
  corsOrigins: string[];
  chatRateLimitPerMinute: number;
  authRateLimitPerHour?: number;
};

export function createApp({ coach, jwtSecret, corsOrigins, chatRateLimitPerMinute, authRateLimitPerHour = 20 }: AppOptions) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post(
    '/api/auth/anonymous',
    rateLimit({ windowMs: 60 * 60_000, limit: authRateLimitPerHour, standardHeaders: 'draft-8', legacyHeaders: false }),
    async (_req, res) => {
      res.status(201).json(await createAnonymousUser(jwtSecret));
    }
  );

  app.use(
    '/api/chat',
    requireAuth(jwtSecret),
    rateLimit({
      windowMs: 60_000,
      limit: chatRateLimitPerMinute,
      keyGenerator: (req) => req.userId!,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Too many messages. Please wait a minute.' },
    }),
    chatRouter(coach)
  );

  app.use((_req, _res, next) => next(new HttpError(404, 'Not found')));

  // Express 5 forwards rejected promises from async handlers here.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
      res.status(400).json({ error: 'Malformed JSON' });
      return;
    }
    if (error instanceof AiError) {
      console.error(`[ai] ${error.reason}: ${error.message}`);
      if (error.reason === 'blocked') {
        res.status(422).json({ error: 'Is message par jawab nahi diya ja sakta. Kuch aur try karo.' });
      } else {
        res.status(error.reason === 'unavailable' ? 503 : 502).json({ error: 'AI service is unavailable. Please retry.' });
      }
      return;
    }
    console.error('[server] unexpected error', error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
