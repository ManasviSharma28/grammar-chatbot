import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Live tests hit the real Gemini API and only run via `npm run test:live`.
    exclude: process.env.RUN_LIVE_AI ? [] : ['test/live/**'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
