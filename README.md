# English Coach

AI-powered English grammar correction, Hindi/Hinglish → English translation, conversation practice, professional rewriting, and grammar lessons — explained in simple Hinglish.

## Structure

```
src/app/              Expo Router screens (chat, history, settings)
src/features/chat/    Chat state, mode config, chat UI components
src/lib/api/          HTTP client for the backend + preview client
src/components/ui/    Shared UI primitives
shared/               Zod schemas shared by app and backend (request + AI response)
server/               Node/Express backend (Phase 3)
```

## Run the backend

```bash
cd server
npm install
cp .env.example .env    # fill in GEMINI_API_KEY and JWT_SECRET
npm run dev             # http://localhost:4000
```

Without `MONGODB_URI` the server starts a throwaway in-memory MongoDB (data is lost on restart).

```bash
npm test                # unit + API tests (AI mocked)
npm run test:live       # real Gemini calls — uses API quota
```

## Run the app

```bash
npm install
npx expo run:ios        # or: npx expo run:android  (dev build — native modules were added)
npx expo start          # afterwards, just start Metro
```

Set `EXPO_PUBLIC_API_URL` in `.env` (see `.env.example`) to use the backend. Without it the app runs in **preview mode**: a banner is shown and replies are fixed samples, not AI output.

## Quality

```bash
npm test                # jest
npx tsc --noEmit        # typecheck
npx expo lint           # lint
```
