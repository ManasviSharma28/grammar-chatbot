import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash'),
  /** Comma-separated, tried in order when the primary model is unavailable or over quota. */
  GEMINI_FALLBACK_MODELS: z.string().default('gemini-3.8-flash,gemini-3.5-flash-lite'),
  /** Unset in development → an in-memory MongoDB is started (data is lost on restart). */
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  /** Comma-separated list of allowed browser origins. Native apps send no Origin header. */
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
  CHAT_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
});

export type Config = z.infer<typeof EnvSchema>;

export function geminiModels(config: Config): string[] {
  return [config.GEMINI_MODEL, ...config.GEMINI_FALLBACK_MODELS.split(',')].map((m) => m.trim()).filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid server environment:\n${issues}\nSee server/.env.example`);
  }
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.MONGODB_URI) {
    throw new Error('MONGODB_URI is required in production');
  }
  return parsed.data;
}
