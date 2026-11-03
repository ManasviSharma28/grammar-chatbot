import { createCoach } from './ai/coach.js';
import { createGeminiGenerator } from './ai/gemini.js';
import { createApp } from './app.js';
import { geminiModels, loadConfig } from './config.js';
import { connectDatabase } from './db.js';

const config = loadConfig();
const closeDatabase = await connectDatabase(config.MONGODB_URI);

const coach = createCoach(
  createGeminiGenerator({
    apiKey: config.GEMINI_API_KEY,
    models: geminiModels(config),
  })
);

const app = createApp({
  coach,
  jwtSecret: config.JWT_SECRET,
  corsOrigins: config.CORS_ORIGINS.split(',').map((o) => o.trim()),
  chatRateLimitPerMinute: config.CHAT_RATE_LIMIT_PER_MINUTE,
});

const server = app.listen(config.PORT, () => {
  console.log(`[server] listening on http://localhost:${config.PORT} (model ${config.GEMINI_MODEL})`);
});

async function shutdown() {
  server.close();
  await closeDatabase();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
