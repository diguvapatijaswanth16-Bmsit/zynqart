# Zynqart — find the right product, not just any product

An AI shopping platform for laptops, phones, headphones, smartwatches, cameras, home appliances **and clothing**.
Describe what you need in your own words — in English, Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali or Marathi —
and get ranked products with a match score and a plain-language reason for every recommendation.

Built for **ETC project: AI in E-Commerce**.

## Live demo

**https://zynqart-46o3xf-preview.freebuff.page**

Deployed on Freebuff Sites (Cloudflare Workers + D1). The site is fully usable without an AI key:
the rule-based matcher answers every request, and the assistant/verdict/vision endpoints upgrade to the
LLM automatically once `OPENAI_API_KEY` is set on the deployment.

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 18 + TypeScript, Tailwind CSS, shadcn-style components (Radix primitives), Framer Motion |
| Routing | React Router |
| API | Hono running on a Cloudflare Worker (`worker/index.ts`) |
| Database | Cloudflare D1 (SQLite) — `products`, `users`, `profiles`, `sessions`, `wishlist_items`, `price_alerts`, `chat_sessions` |
| AI | OpenAI-compatible chat completions called **only** from the Worker (`worker/ai.ts`), streamed to the browser as SSE |
| Auth | Email + password (PBKDF2-SHA256, 100k iterations) with HttpOnly session cookies, plus optional Google OAuth |

There is no API key in the frontend bundle. The browser talks to `/api/*`; the Worker holds `OPENAI_API_KEY` as a secret.

## Run it

```bash
npm install
npx vite build                # builds the SPA into dist/
npx wrangler dev --port 8787   # serves dist/ + the API on one origin (local D1)
```

Open http://localhost:8787.

For HMR while developing the UI, run the Worker and Vite side by side — Vite proxies `/api` to 8787:

```bash
npx wrangler dev --port 8787   # terminal 1 (API + local D1)
npx vite                       # terminal 2 (UI on :3000)
```

### Configuration

Set these as Worker secrets/vars (never in the frontend):

| Name | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Enables the LLM assistant, AI verdicts and image search. Without it the app stays fully usable on the rule-based matcher. |
| `OPENAI_BASE_URL` | Defaults to the Freebuff OpenAI-compatible endpoint; set it for any OpenAI-compatible provider. |
| `OPENAI_MODEL` / `OPENAI_VISION_MODEL` | Default `gpt-4o-mini`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables “Continue with Google”. Redirect URI: `<origin>/api/auth/google/callback`. |
| `APP_ORIGIN` | Public origin used to build OAuth redirects (e.g. `https://zynqart.example.com`). |

```bash
npx wrangler secret put OPENAI_API_KEY
```

### Deploy

```bash
npx wrangler d1 create zynqart          # copy the id into wrangler.jsonc
npx vite build
npx wrangler deploy
```

Tables are created and the 66-product catalogue is seeded automatically on the first request (`worker/db.ts`),
so there is no migration step to run by hand.

## How the match score works (`shared/scoring.ts`)

Every product gets a deterministic 0–100 score from four weighted parts:

| Part | Weight | What it measures |
| --- | --- | --- |
| Needs | 35% | Category match (100 same category, 62 when no category is known, 18 otherwise) |
| Use-case fit | 25% | Share of the shopper's tags the product carries, plus keyword hits in name/specs |
| Budget | 30% | Under budget: 72–100 (closer to the limit scores higher). Over budget: falls steeply, hitting 0 at ~31% over |
| Rating | 10% | Normalised store rating, 3.5★ → 0, 5★ → 100 |

The Budget page also computes a **value score** = 70% match + 30% affordability, so budget pages rank
"most product per rupee" rather than just the cheapest item.

Reasons are generated from the shopper's own words plus concrete specs — e.g. for `coding` it quotes the
RAM and processor ("16 GB DDR5 with Intel Core i5-13420H keeps IDEs, Docker and dozens of browser tabs from
stuttering"), for `battery` the rated hours, for clothing the fabric and fit. Every recommendation carries
2–4 reasons; the UI refuses to render a card without at least one, and the “Why this?” panel adds
needs/budget/rating fit bars.

## How the assistant works (`worker/ai.ts`)

1. The client posts the conversation (last 10 turns), the reply language and the carried-over needs.
2. The Worker sends a system prompt containing the **entire catalogue as compact lines** (id, name, brand,
   category, price, rating, tags, key specs), the language rule and the output contract:
   a short markdown reply, then a fenced JSON block with `needs`, up to 3 `recommendations` (`id` + `reason`),
   and an optional `followUp`.
3. The LLM response is streamed. Text before the JSON fence is forwarded token-by-token as SSE `delta`
   events; anything from the fence onwards is buffered, parsed, validated against the real catalogue
   (unknown ids are dropped) and sent as a single `result` event containing scored, explained products.
4. Client-side, the reply types out live and product cards render inline when `result` arrives.

Failure handling is layered:

* No key, network error, non-200, malformed JSON → the **rule-based matcher** answers instead
  (`extractNeeds` → `rankProducts`), still localized and still explained.
* Vague requests (no category, no use case) produce one clarifying question instead of guesses.
* Follow-ups like “something cheaper” reuse the stored needs and shave 20% off the budget.

**Language:** the prompt requires every sentence and reason in the selected language (Telugu, Hindi, Tamil,
Kannada, Malayalam, Bengali, Marathi, English). The offline matcher localizes its headings and notes, and its
reason text stays English because specs are English.

## Features

- **Assistant** — cinematic hero, prompt chips, streaming replies, inline product cards, “Why this?” panels, New chat.
- **Voice shopping** — Web Speech API with per-language recognition; spoken replies via `speechSynthesis`.
- **Image search** — photo is downscaled client-side, sent to `/api/vision`; the vision model extracts
  category/tags and the catalogue is ranked locally.
- **Explore** — filters for category, price, brand, rating; sort by best match, price or rating; score rings.
- **Compare** — 2–4 products, sticky table of price + every spec, best value highlighted per row, AI verdict
  (pros/cons + a pick) with a rule-based fallback.
- **Budget** — category + slider/input, within-budget ranking by value, “just above budget” (≤10% over) with
  the price difference, and an SVG price-vs-rating scatter chart.
- **Wishlist & alerts** — optimistic hearts, guest list in `localStorage` merged into the account on sign-in,
  sortable wishlist, per-product price-drop targets compared against the listed price and the 30-day low.
- **Polish** — dark/light theme, glassmorphism, film grain, skeleton/empty/error states, toasts, keyboard
  focus rings, skip link, reduced-motion support.

## Security notes

- D1 has no row-level security, so every wishlist/alert/chat query is scoped in the Worker by the session
  user id (`WHERE user_id = ?` after `currentUser()`); guest rows are scoped by a signed-in-less HttpOnly
  guest cookie. Verified: an authenticated user cannot read another user's or a guest's chat session (404).
- Passwords are PBKDF2-SHA256 with per-user salts; session tokens are random 24-byte values with 30-day expiry.
- Chat, vision and auth endpoints are rate-limited per IP.
- Prices in `priceHistory` are deterministic per product id, so the “30-day low” is stable across devices —
  it is illustrative demo data, not a live price feed.
