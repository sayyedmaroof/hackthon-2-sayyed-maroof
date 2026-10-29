# 02 · The Builder Process

## From Idea to Delivery in Twelve Steps

### Understand

1. Find information
2. Find references
3. Ask AI

### Design

4. Branding
5. UI
6. Flows and features

### Build

7. Code with agents

### Harden

8. Security
9. Scalability
10. Cost optimisation
11. Testing and QA

### Ship

12. Delivery

---

# How ScentBuild Studio Stands on These Points

Our app — **ScentBuild Studio**, a custom fragrance builder e-commerce experience — was built following this exact process. Here is where we stand on each step.

## Understand

1. **Find information** — Researched the custom-perfume domain: fragrance note structure (top / heart / base), bottle configuration options (size, concentration EDT/EDP/Parfum, atomizer, label style), and how competitors present perfume personalisation online.
2. **Find references** — Studied premium e-commerce and DTC fragrance sites for layout and conversion patterns, plus modern Next.js/shadcn product builders for interaction design — distilled into our Explore → Builder → Cart → Checkout flow.
3. **Ask AI** — Used AI assistants for scoping, schema design, and edge-case planning (e.g. how to model immutable order snapshots, Stripe webhook idempotency, AI fallback strategies). AI was a sounding board for architecture decisions before a line of code was written.

## Design

4. **Branding** — A "sapphire & azure" palette derived from a gem-bottle logo: sapphire `#0A1A52`, azure `#1E63C8`, azure-light `#57B8F2`, ice `#F5F9FD`, frost `#E4EEF8`. Typography pairs **Inter** (UI) with **Cormorant** (serif headings) for a premium, editorial feel.
5. **UI** — Built with Tailwind CSS 4 + shadcn/ui (React 19), framer-motion animations (parallax hero, floating bottle), signature utilities like `.eyebrow` and `.btn-shine`, and a live animated glass-bottle preview that updates in real time as the user composes a blend.
6. **Flows and features** — Core flows mapped end-to-end: Explore (note library + house presets) → Builder (layered scent composition with AI Scent Advisor) → Blend detail → Cart → Stripe checkout → Account (saved blends, order history), plus an admin dashboard (`/admin`) for orders, users, and stats, and an AI Concierge for personalised recommendations.

## Build

7. **Code with agents** — Agentic coding drove development velocity. The AI feature itself is agent-structured: a single `POST /api/ai/fragrance` endpoint with a provider chain — **Gemini `gemini-3.5-flash` primary, Groq `gpt-oss-120b` fallback** — returning zod-validated structured actions (`ADD/REMOVE/REPLACE/SET_CONCENTRATION/EXPLAIN`) that are simulated server-side against our note catalog, so domain logic — not the LLM — stays authoritative. A deterministic local fallback covers provider outages.

## Harden

8. **Security** — bcrypt password hashing; DB-backed sessions with random 32-byte tokens and httpOnly/sameSite/secure cookies; stateless HMAC-SHA256 signed admin cookie (12h TTL); Stripe webhook signature verification with event-ID dedup + transactional order transitions; integer-cents money with idempotency keys; redirects built only from a validated `NEXT_PUBLIC_APP_URL` origin. *(Known gap we're fixing: credentials in `lib/app-config.ts` must move to environment variables before production use.)*
9. **Scalability** — SQL indexes on hot query paths, Postgres connection pooling (Neon pooler), immutable order line snapshots so catalog changes never rewrite history, JSONB blend storage to avoid migration churn, and history-capped AI context (`MAX_HISTORY=6`). Rate limiting is currently process-local; multi-instance deployment is planned via Redis/Upstash-backed global limits.
10. **Cost optimisation** — Cheap flash-tier models (Gemini flash, Groq) instead of frontier models; per-mode token (`AI_MAX_OUTPUT_TOKENS`) and timeout (`AI_REQUEST_TIMEOUT_MS`) caps, all env-tunable; per-IP rate limiting (12 builder / 6 concierge req/min) bounds AI spend; money stored as integer cents; unoptimised `next/image` with images served from Wikimedia Commons to avoid image-processing costs.
11. **Testing and QA** — ~1,680 lines of tests: **Vitest** unit suites covering the AI builder/concierge/providers and all payment logic (checkout session, Stripe config, webhook processor), plus **Playwright** e2e specs for smoke, auth, builder, and checkout with auto-botted dev server and teardown. Custom verification scripts validate DB order state and simulate Stripe webhooks.

## Ship

12. **Delivery** — Deployed on **Vercel** with Stripe webhooks wired as a serverless destination. The app ships as a **PWA**: service worker with precache + offline fallback page (`/offline`), web app manifest (standalone, themed), and analytics via `@vercel/analytics` for post-launch insight.
