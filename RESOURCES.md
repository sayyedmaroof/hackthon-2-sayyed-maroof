# ScentBuild Studio resources

This is a practical directory for building, designing, operating, and extending
ScentBuild Studio. “In use” means the project currently has the related package
or provider configuration; it does not necessarily mean every external account,
API, or optional service is configured.

## Fragrance data and LLM research

| Resource | Use in this project | Notes |
| --- | --- | --- |
| [Fragella](https://fragella.com/) | Perfume notes and fragrance catalog API | Evaluate its API coverage, attribution requirements, rate limits, and commercial-use terms before importing data. Keep API credentials server-side. |
| [Perfume Picks MCP](https://perfumepicks.app/mcp) | Fragrance research for an MCP-capable LLM client | Use as a research/assistant resource; verify facts against licensed product data before showing them as catalog facts. |
| [Model Context Protocol](https://modelcontextprotocol.io/) | Standard for connecting AI clients to tools and context | The project includes the MCP SDK; an SDK dependency alone does not mean this MCP endpoint is wired into the app. |

## AI providers

| Resource | Use in this project | Notes |
| --- | --- | --- |
| [Google AI Studio](https://aistudio.google.com/) / [Gemini API docs](https://ai.google.dev/gemini-api/docs) | Primary AI provider for the concierge | The current provider configuration defaults to Gemini. Create and rotate `GEMINI_API_KEY` through the provider account, not in source files. |
| [Groq](https://console.groq.com/) / [Groq API docs](https://console.groq.com/docs) | Alternate/fallback AI provider | The application supports Groq as a fallback and configurable primary. Store `GROQ_API_KEY` as a server-side secret. |

## Product design and media

| Resource | Use in this project | Notes |
| --- | --- | --- |
| [Canva](https://www.canva.com/) | Logo concepts, social graphics, and marketing assets | Export web-ready assets in appropriate sizes and retain editable originals. Check the asset license for the intended use. |
| [Figma](https://www.figma.com/) | UI flows, design system, and clickable prototypes | Useful for aligning the builder, bottle preview, and mobile layouts before implementation. |
| [Pexels](https://www.pexels.com/) | Stock photography | Search for fragrance ingredients, botanicals, and editorial-style product imagery. Review the current license and avoid implying an image depicts an actual product. |
| [Unsplash](https://unsplash.com/) | Alternative stock photography | Another source for editorial and lifestyle imagery; verify the current license and any restrictions for each asset. |
| [SVGOMG](https://jakearchibald.github.io/svgomg/) | Optimizing exported SVG logos and icons | Use to reduce SVG size while checking that appearance and accessibility are preserved. |

## Application stack and data

| Resource | Use in this project | Notes |
| --- | --- | --- |
| [Next.js documentation](https://nextjs.org/docs) | App framework and routing | The project uses the App Router. Follow the documentation for the installed Next.js version when changing framework APIs. |
| [React documentation](https://react.dev/learn) | UI components and state | The project uses React 19. |
| [Tailwind CSS documentation](https://tailwindcss.com/docs) | Styling and responsive layouts | The project uses Tailwind CSS 4. |
| [shadcn/ui](https://ui.shadcn.com/) | Accessible UI component patterns | Components are copied/customized in the app; review changes against the existing component conventions. |
| [Drizzle ORM](https://orm.drizzle.team/docs/overview) | Typed PostgreSQL schema and queries | Schema is in `db/schema.ts`; review migrations and back up data before production schema changes. |
| [PostgreSQL documentation](https://www.postgresql.org/docs/) | Relational database | The app persists accounts, blends, carts, and orders in PostgreSQL. |
| [Neon](https://neon.tech/docs) | Hosted PostgreSQL option | Suitable if choosing Neon for hosting; configure the connection string as a secret and do not commit it. |

## Payments and commerce

| Resource | Use in this project | Notes |
| --- | --- | --- |
| [Stripe](https://stripe.com/) | Checkout and payment processing | The project includes Stripe integration. Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` server-side; configure and test webhooks for each environment. |
| [Stripe API docs](https://docs.stripe.com/api) | API and Checkout reference | Use the project’s server-side checkout flow and verify webhook signatures before treating an event as paid. |
| [Stripe CLI](https://docs.stripe.com/stripe-cli) | Local webhook development | Forward test events to the local webhook endpoint; use test-mode credentials and keep the CLI-generated webhook secret local. |

## Hosting, analytics, and operations

| Resource | Use in this project | Notes |
| --- | --- | --- |
| [Vercel](https://vercel.com/docs) | Suggested deployment platform for the Next.js app | An option, not a requirement. Configure environment variables per deployment environment and verify database/network access before launch. |
| [Vercel Analytics](https://vercel.com/docs/analytics) | Product analytics | The project includes the Vercel Analytics package. Enable it in the chosen hosting setup and review applicable privacy requirements. |
| [Sentry](https://docs.sentry.io/platforms/javascript/guides/nextjs/) | Optional error monitoring | Consider adding only if production error visibility is needed; configure source maps and scrub secrets or personal data from events. |

## Quality and accessibility

| Resource | Use in this project | Notes |
| --- | --- | --- |
| [Vitest](https://vitest.dev/guide/) | Unit and component-level tests | Run the project test script with `npm test`. |
| [Playwright](https://playwright.dev/docs/intro) | Browser end-to-end testing | Covers user flows such as account, builder, and checkout. Run with `npm run test:e2e`. |
| [axe-core](https://github.com/dequelabs/axe-core) | Optional automated accessibility checks | Consider adding to browser tests; automated checks supplement, but do not replace, keyboard and screen-reader testing. |
| [Web Content Accessibility Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/) | Accessibility reference | Check contrast, keyboard access, labels, focus handling, and reduced-motion behavior across the builder and dialogs. |

## Integration checklist

- Treat third-party fragrance data and AI output as separate sources: use a
  licensed catalog for product facts and the AI for assistance and discovery.
- Verify data ownership, attribution, commercial-use rights, freshness, and
  request limits before integrating any external API.
- Keep provider keys, database URLs, webhook secrets, and admin credentials in
  deployment secrets or a local ignored environment file, never in the
  repository or browser bundle.
- Use test-mode payment credentials locally, verify webhook signatures, and
  test the complete checkout-to-order flow before enabling live payments.
- Optimize and compress images, provide useful alt text, and honor each source's
  license and removal requirements.
- Recheck provider pricing, terms, API versions, and model availability before
  launch; these can change independently of the application code.
