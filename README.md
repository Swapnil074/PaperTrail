# PaperTrail — Second Brain Reader

A personal reading list + annotation app. Save links via Telegram, read in a clean focused UI, highlight text, add notes, and generate AI summaries on demand.

## Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API routes (serverless)
- **Database**: Supabase (Postgres)
- **AI**: OpenAI-compatible (plug-and-play provider)
- **Bot**: Telegram webhook
- **Hosting**: Vercel + Supabase free tier

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Create Supabase project

1. [supabase.com](https://supabase.com) → New project
2. SQL Editor → paste and run `supabase/schema.sql`
3. Copy Project URL, anon key, service_role key

### 3. Configure environment

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 4. Create Telegram bot

1. Message [@BotFather](https://t.me/BotFather) → `/newbot`
2. Copy token → `TELEGRAM_BOT_TOKEN`
3. Get your user ID from [@userinfobot](https://t.me/userinfobot) → `TELEGRAM_ALLOWED_USER_ID`
4. After deploying, register webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-app.vercel.app/api/telegram/webhook","secret_token":"<WEBHOOK_SECRET>"}'
```

### 5. Run locally

```bash
npm run dev
```

### 6. Deploy to Vercel

```bash
npx vercel --prod
# Set all env vars in Vercel dashboard
```

## Features

| Feature | Status |
|---|---|
| Save URLs via paste | ✅ |
| Save URLs via Telegram bot | ✅ |
| Auto-fetch + parse article content (Readability) | ✅ |
| Clean distraction-free reader | ✅ |
| Text highlighting (5 colors) | ✅ |
| Inline notes on highlights | ✅ |
| Article-level notes | ✅ |
| AI summary + key points + insight (cached) | ✅ |
| Filter by status (unread/reading/read/archived) | ✅ |
| Favorites | ✅ |
| Full-text title search | ✅ |
| PWA (installable, offline shell cache) | ✅ |
| Mobile responsive | ✅ |

## Architecture

```
app/
├── page.tsx                     # Home — article grid, filters, add bar
├── article/[id]/page.tsx        # Reader — article body + sidebar
├── api/
│   ├── articles/route.ts        # GET list, POST create
│   ├── articles/[id]/route.ts   # GET, PATCH, DELETE
│   ├── articles/[id]/fetch/     # POST — on-demand parse
│   ├── articles/[id]/highlights/# GET, POST
│   ├── articles/[id]/notes/     # GET, POST
│   ├── articles/[id]/summarize/ # POST — on-demand AI summary
│   ├── highlights/[id]/         # PATCH, DELETE
│   ├── notes/[id]/              # PATCH, DELETE
│   └── telegram/webhook/        # POST — Telegram bot handler

lib/
├── supabase.ts   DB client
├── parser.ts     Readability article parser
├── ai.ts         OpenAI-compatible AI abstraction
├── telegram.ts   Telegram HTTP sender + auth
└── utils.ts      Helpers + highlight color map

components/
├── Reader.tsx              Article body + text-selection highlight picker
├── HighlightsSidebar.tsx   Manage highlights, colors, inline notes
├── NotesSidebar.tsx        Article-level notes CRUD
├── AISummaryPanel.tsx      On-demand AI generation + display
├── ArticleCard.tsx         Grid card with hover actions
├── AddArticleBar.tsx       URL paste input
└── FilterBar.tsx           Status pills + search input
```

## Swap AI provider

Set `AI_BASE_URL` + `AI_MODEL` in `.env.local`:

```env
# Groq (fast free tier)
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama3-8b-8192

# Local Ollama
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3
```
