@AGENTS.md

# PaperTrail

Second Brain Reader — Next.js 16 App Router, TypeScript, Tailwind, Supabase.

## Commands
- `npm run dev` — dev server on localhost:3000
- `npm run build` — production build
- `npx tsc --noEmit` — type check only

## Env setup
Copy `.env.example` → `.env.local`. Required vars:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET` + `TELEGRAM_ALLOWED_USER_ID`
- `AI_API_KEY` (optional, enables AI summaries)

## Key conventions
- All DB queries in API routes use `createServerClient()` (service_role key)
- Frontend data fetching via SWR hooks in `hooks/` — no direct Supabase calls from components
- AI provider is abstracted in `lib/ai.ts` — swap by changing env vars
- Single-user: no auth, Telegram user ID gates the bot

## DB schema
Run `supabase/schema.sql` in your Supabase SQL editor once.
Tables: `articles`, `highlights`, `notes`, `ai_summaries`
