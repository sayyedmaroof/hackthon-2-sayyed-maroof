# ScentBuild Studio

An AI-assisted fragrance studio: explore notes, design custom blends in an
interactive builder, and get personalized recommendations from an AI
concierge — with accounts, a cart, and saved compositions backed by
PostgreSQL.

Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4**,
**shadcn/ui**, **Drizzle ORM** + **PostgreSQL**, and AI providers
(**Google Gemini** as primary, **Groq** as fallback).

## Features

- **Explore** — browse the fragrance library of notes and house presets.
- **Builder** — compose custom blends (top / heart / base layers) with a
  live bottle preview.
- **AI Concierge** — structured itinerary-style recommendations generated
  via Gemini, automatically falling back to Groq if unavailable.
- **Accounts** — email + password auth with hashed (bcrypt) credentials
  and session cookies.
- **Cart & Checkout** — Stripe payments with shipping addresses saved to each order.
- **Saved blends** — persist compositions to your account.

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database

### 1. Install dependencies

```sh
npm install
```

### 2. Configure environment variables

Copy the example file and fill in the required values:

```sh
cp .env.example .env.local
```

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key (primary AI provider) |
| `GROQ_API_KEY` | ✅ | Groq API key (fallback AI provider) |
| `AI_PROVIDER` | — | Primary provider: `gemini` (default) or `groq` |
| `AI_GEMINI_MODEL` | — | Override the Gemini model (`gemini-3.5-flash`) |
| `AI_GROQ_MODEL` | — | Override the Groq model (`openai/gpt-oss-120b`) |
| `AI_REQUEST_TIMEOUT_MS` | — | Request timeout (default `12000`, cap `25000`) |
| `AI_MAX_OUTPUT_TOKENS` | — | Max output tokens (default `4096`, cap `16384`) |
| `E2E_BASE_URL` | — | Base URL for the Playwright e2e suite (default `http://localhost:3000`) |

### 3. Set up the database

Push the Drizzle schema to your database (applies `db/migrations`):

```sh
npx drizzle-kit push
```

> `drizzle.config.ts` reads `DATABASE_URL` directly from `.env.local`.

### 4. Run the app

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm start` | Run the production build |
| `npm run test:e2e` | Run Playwright e2e tests (auto-boots `npm run dev` on port 3000 if none is running) |
| `npm run test:e2e:ui` | Run e2e tests in Playwright's interactive UI |

## Project structure

```
app/            Routes: home, explore, builder, blend/[id], concierge,
                cart, checkout, account + API routes (auth, cart, orders, saved)
components/     UI components (shadcn/ui primitives + app components)
lib/            AI providers/prompts/config, auth, validation, perfumery data
db/             Drizzle schema + generated migrations
e2e/            Playwright end-to-end tests
```

## Notes

- AI configuration lives in `lib/ai/config.ts`; the primary provider is
  Gemini, and `providerChain()` falls back to Groq when configured.
- `.env*.local` files are git-ignored — never commit real secrets.
