# xSender — Build Progress

**Last updated:** 25 September 2026
**Status:** 5 of 11 phases complete · **~55%**
**Verification:** 128 unit tests · 59 live end-to-end checks · 13 demo checks · typecheck clean · lint 0 errors · build clean

---

## What xSender is

Businesses — restaurants, clinics, salons, agents, shops — take orders, bookings and
enquiries through WhatsApp, Instagram and Messenger, and pay people to sit in those
inboxes answering the same things all day.

xSender automates that work. **Not an AI agent and not a chatbot in the LLM sense** — a
deterministic visual flow engine the business configures once, which then handles
inbound messages across all three Meta channels, captures orders and bookings as real
records, pushes status updates, and hands over to a human when it genuinely cannot
proceed.

Every feature has to trace back to *hours saved* or *money saved on staff*. That is why
the ROI panel is a product feature and not a nice-to-have.

---

## Where it stands in one paragraph

The engine is finished and proven. A conversation can go from "hi" to a confirmed order
or booking with zero human involvement, producing real records staff can act on. There
is a public marketing site with a **genuinely live demo** a stranger can order from. The
WhatsApp path is now built end to end — webhook, adapter, unified inbox, human handoff,
24-hour window enforcement — and there is a **real ROI dashboard** computed from actual
conversation records, plus a go-live checklist for onboarding pilot clients by hand.

What remains before a paying client: **credentials in the environment and one verified
conversation on a real Meta test number**. Every line of code for that path exists and is
tested; none of it has yet met Meta's servers. Payments, self-serve onboarding and the
other two channels are deliberately untouched until pilot clients are live and retained.

---

## Phase status

| Phase | Scope | Status |
|---|---|---|
| **0** | Foundations — auth, multi-tenancy, schema, worker | ✅ Done |
| **1** | Flow engine + Simulator | ✅ Done |
| **2** | Flow builder canvas + templates | ✅ Done |
| **3** | Commerce — menu, orders, bookings | ✅ Done |
| **4** | Public surface — marketing site, live demo | ✅ Done |
| **5a** | WhatsApp — webhook, adapter, unified inbox, handoff | ✅ Built, unverified against Meta |
| **5b** | ROI dashboard + shareable report | ✅ Done |
| **6** | Manual pilot onboarding — go-live checklist | ✅ Done |
| **7** | Instagram + Messenger adapters | ⏸ Deliberately deferred |
| **8** | Money — Stripe subscriptions, regional pricing | ⏸ Deliberately deferred |
| **9** | Self-serve onboarding — Tech Provider, Embedded Signup | ⏸ Deliberately deferred |
| **10** | Lifecycle automation, customer payments, scale | ⏸ Deliberately deferred |

> **Note on numbering.** Phases were renumbered twice: once when the plan was rewritten
> for a global, revenue-first launch, and again when Phase 5 was split so the ROI
> dashboard could ship immediately after WhatsApp rather than waiting behind billing and
> self-serve onboarding. The reasoning: the ROI figure is what the product is sold on, so
> it should exist before anything that only matters once there are customers to charge.

> **On "⏸ Deliberately deferred".** These are not forgotten. Each one waits on the same
> gate: three to five pilot businesses live, retained, and giving feedback. Building a
> second channel or a billing system before that risks polishing things nobody has asked
> for while the first real conversation is still ahead of us.

---

# Part 1 — What is done, and how

## Phase 0 · Foundations

**The problem:** a good-looking frontend with no backend. Ten screens of static JSX, no
state, no data, no auth, no database.

**What was built**

- **Schema v1** (`supabase/migrations/0001`–`0006`) — workspaces, members, channels,
  contacts, contact identities, conversations, messages, a job queue, an events table.
- **Multi-tenancy with a single chokepoint.** Server code uses the Supabase
  service-role key, which bypasses RLS, so isolation is enforced in application code:
  `src/server/db/tenancy.ts` exposes `ctx.table('contacts')`, which auto-scopes every
  query and auto-injects `workspace_id`. RLS is still enabled on every table as
  defence-in-depth, because the browser talks directly to Realtime.
- **Auth** — Supabase Auth, route groups, `src/proxy.ts` as the gate (Next.js 16
  renamed `middleware` to `proxy`), login/signup/onboarding/OAuth callback, workspace
  switcher.
- **A background worker** (`worker/index.ts`) draining a Postgres job queue with
  `FOR UPDATE SKIP LOCKED`. Vercel cannot hold work open, so anything delayed,
  scheduled, retried or batched goes through the queue.

**Decisions worth remembering**

- **Column-level revoke on channel tokens.** RLS filters *rows*, not columns, so a
  read policy on `channels` would have handed the encrypted access token to any
  workspace member's browser. `revoke select (access_token_ciphertext) … from
  authenticated` closes that.
- **`create_workspace()` lives in the database.** supabase-js has no transaction API,
  and creating a workspace means three rows that must all exist or none.
- **Recursion-safe membership check.** An RLS policy on `workspace_members` that
  queries `workspace_members` recurses forever. `is_workspace_member()` is
  `SECURITY DEFINER` to break the cycle.

**Also found here:** the repo's `.gitignore` had no `.env*` rule — the comment existed
but the pattern had been deleted, so the first `.env.local` would have been committed.

---

## Phase 1 · The flow engine

**The heart of the product.** A deterministic state machine over a JSON graph.

**What was built**

- **`ChannelAdapter`** — one interface every messaging surface implements. This is why
  adding WhatsApp later is a new adapter rather than a change to the engine.
- **A Simulator channel** — a WhatsApp-styled chat inside the app that drives the *real*
  engine. The whole ordering flow was built and debugged before any Meta account
  existed.
- **Ten node types** — trigger, send_message, ask_question (8 answer kinds with
  validation, retry limits and a fallback branch), condition, set_variable,
  update_contact, delay, http_request, handoff_to_human, end.
- **The executor** (`src/server/flow/executor.ts`) — walks nodes until it must park,
  sleep, finish or fail. Guards: 50 steps per tick, 500 per run, idempotency on
  `(conversation, inbound message)`.
- **A run inspector** — every step written to `flow_run_steps`, so "why did the bot say
  that?" is answerable.

**Decisions worth remembering**

- **Runs are pinned to the flow version they started on.** Publishing mid-conversation
  must not move a customer to a different graph half-way through checkout.
- **The 24-hour service window is enforced in the send path**, not deferred. Meta only
  allows free-form messages within 24 hours of the customer's last message; outside it,
  only an approved template. This is the most common silent failure in WhatsApp
  products, so it raises a typed error that surfaces in the inspector as *"the service
  window has closed"* rather than a mystery.
- **Capability degradation.** A 3-button prompt becomes a numbered text list on channels
  without buttons, and `matchNumberedChoice` maps "2" back to the option id. Instagram
  works on day one without editing any flow.

---

## Phase 2 · The flow builder

**What was built**

- **A real canvas** — React Flow (`@xyflow/react`, MIT), replacing the static
  absolutely-positioned mockup.
- **Four templates** — Order Flow, Booking Flow, Lead Capture, FAQ.
- **Draft/publish versioning** with fork-on-edit.
- **A first-run setup wizard** that seeds starter flows as **drafts**.
- **Hand-written config forms per node type**, not schema-generated.

**Decisions worth remembering**

- **Every branch is a visible, labelled exit on the node.** A question with three
  buttons literally has four handles on its right edge (three options plus
  `fallback`), so a non-technical owner can see where each answer leads.
- **Editing a published version forks a new draft.** Published graphs are immutable
  because live conversations are pinned to them.
- **Publishing is refused if any branch is unconnected.** A customer cannot reach a step
  that goes nowhere, because such a flow will not go live. This turned out to be a
  genuine selling point.
- **Hand-written forms, not generated ones.** A schema-generated form would ask a cafe
  owner to fill in a discriminated union. These ask them to type the message their
  customer reads.

**Removed:** the static `/automation` canvas and an "AI Agents" screen — the latter
contradicted the positioning, and leaving it in a demo would invite exactly the wrong
question from a prospect.

---

## Phase 3 · Commerce

**What was built**

- **Schema** (`0009`) — catalog categories and items, orders and order items, resources,
  availability rules and exceptions, bookings.
- **Six commerce nodes** — catalog_browse (reads the live menu), cart_review,
  create_order, order_status, booking_slots, create_booking.
- **Three screens** — Menu & Services, Orders (with one-tap status advance), Bookings.
- **Seeding** — first-run setup creates a menu and bookable resources before installing
  flows.

**Decisions worth remembering**

- **Money is integer minor units, never floats.** `0.1 + 0.2 !== 0.3`, and an order total
  a paisa out is a support ticket.
- **Order items snapshot name and price.** Editing the menu never rewrites past orders.
- **The cart lives in `flow_run.variables`, not a table.** A half-finished order is not
  an order.
- **Double-booking is prevented by the database**, via an `EXCLUDE USING gist`
  constraint — a check that survives two customers confirming the same slot at the same
  instant, which application code cannot win.
- **`create_booking` has a `taken` exit** wired back to the times step, so losing that
  race is a branch in the flow rather than an error.

---

## Phase 4 · The public surface

**The problem:** there was no public page at all. `/` was the dashboard and every
anonymous visitor was bounced to `/login`. A prospect could not see what xSender was
without an account.

**What was built**

- **Routing move** — dashboard from `/` to `/app`; the proxy gate inverted to protect
  only `/app/**`.
- **A marketing site**, all statically rendered: homepage, pricing, how-it-works, demo,
  setup-service, about, contact, legal, 6 vertical landing pages, sitemap, robots,
  FAQ schema, OG images.
- **A genuinely live demo** — anonymous visitors order from the real engine.
- **An ROI calculator** — country-aware, subtracting both our cost and Meta's.
- **Analytics** — provider-agnostic, Plausible by default.

### How the live demo works

It is **not a special code path**. It is a real workspace with a real published flow, and
visitors reach it through the same pipeline a paying customer will use.

```
Visitor clicks  →  POST /api/demo
                        │
                   no cookie? → createSession()
                        │         ├ limit: 8 sessions/hour per IP
                        │         ├ ensureDemoWorkspace()   ← self-provisioning
                        │         └ throwaway contact + conversation + cookie
                        ▼
                   sendDemoMessage()  ── limit: 15 messages/minute
                        ▼
              receiveInboundMessage()   ←── the SAME function the Simulator uses,
                        │                   and WhatsApp will in Phase 5
                        ▼
                   router → executor → catalog_browse reads the real menu
                        ▼
                   writes an actual `orders` row
```

Bounded because it is an unauthenticated write path: 40 messages per session, 15 per
minute, 8 sessions per hour per IP (hashed and salted, never stored raw). Session
identity is an **httpOnly cookie**, so nobody can claim another visitor's conversation.
A reaper job deletes sessions after 2 hours idle.

**Decisions worth remembering**

- **The demo workspace provisions itself** on first request. A marketing site whose
  central proof depends on someone remembering to run a seed script will eventually
  show an error to a prospect.
- **No testimonials, logos, case studies or awards anywhere.** There are zero customers,
  so all of it would have been invented, and B2B buyers verify. The live demo, real
  product screenshots and a public changelog carry credibility instead.
- **The ROI calculator subtracts Meta's charge openly** and pins the automation rate at a
  deliberately conservative 70%. A calculator that only shows upside gets checked once
  and disbelieved forever.
- **Plausible over GA4** — cookieless, so no consent banner on the page whose entire job
  is one conversion, and consistent with what `/legal/privacy` claims.

---

## Corrections forced by going global

Four things worked only because the server and the customers shared a timezone, a
currency and a language.

| | Problem | Status |
|---|---|---|
| **D1** | Timezone | ✅ Fixed |
| **D2** | Ambiguous date parsing | ✅ Fixed |
| **D3** | Vertical taxonomy | ✅ Fixed |
| **D4** | Currency and bot language | ⚠️ **Half done** |
| **D5** | Routing | ✅ Fixed |

### D1 — Timezone *(silent data corruption)*

`availableSlots()` computed against **server** local time while `workspaces.timezone`
sat unused. On Vercel (UTC), a Karachi restaurant's 12:00–23:00 opening hours would
generate slots at 17:00–04:00 PKT. No error — just wrong times for every customer
outside the server's zone.

Fixed with `src/lib/timezone.ts`, doing the arithmetic through `Intl` (full IANA data,
no dependency). The subtle part is a **two-pass offset lookup**: a single pass reads the
offset at a guessed instant and lands an hour out across a DST boundary. A test pins
03:00 on 8 March 2026 in New York to 07:00 UTC, which only passes with the correction.

The smoke test now creates its workspace in `America/New_York` deliberately, so the
opening-hour assertion fails on *any* machine if server-local time creeps back in.

### D2 — Date parsing *(wrong bookings)*

`new Date("03/04/2026")` reads 4 March regardless of who typed it. Most of the world
means 3 April. A customer would get an appointment a month away and nothing would look
broken.

`src/lib/parse-date.ts` decides day/month order from the workspace locale and handles
what people actually type — `tomorrow`, `next friday`, `14 Aug`, `15:30`, `7.45pm`. When
a reading is genuinely ambiguous the bot **reads the date back**: *"Got it — Friday 3
April 2026."*

### D3 — Vertical taxonomy

`business_vertical` was a Postgres enum with five values, so every new industry needed a
migration. Now `text`, with the canonical list of 11 industries in
`src/lib/verticals.ts`. Adding a vertical is shipping a template.

### D4 — Currency ✅ / bot language ❌

**Currency is done.** `formatMoney` now uses `Intl`, which also fixes Indian lakh
grouping (`₹1,25,000`).

**But not for the storage exponent.** `Intl` reports PKR as **0** decimals — that is
CLDR's *display* convention, since paisa are effectively out of use. ISO 4217 says 2.
Using the display value for storage would have divided **every rupee price in the
database by a hundred**. Decimals therefore come from an ISO 4217 table, which also gets
the three-decimal Gulf currencies right (KWD, BHD, OMR) and matches what Stripe expects.

**The bot's own phrases are still hardcoded English.** Strings like *"Please pick one of
the options above"*, *"Your cart is empty"* and the order status labels are literals in
`messaging.ts`, `commerce.ts`, `booking.ts` and `orders.ts`. Customers read those, so a
Dubai clinic cannot yet run in Arabic. Needs a per-workspace message pack.

### D5 — Routing

Dashboard moved to `/app`; the proxy gate inverted. While there, an **open redirect** was
closed: post-login used `next.startsWith('/')`, which also accepts `//evil.com` — a
protocol-relative URL to another host.

---

## Security incident — resolved in code, action still needed

`eslint.config.mjs` contained **~5.3 KB of obfuscated malware** appended after the
legitimate config. Decoded statically (string permutation only, never executed), it is a
**remote-code loader with hidden persistence**:

- Reads its command-and-control address from **TRON** and **Aptos** blockchain accounts
  — a "dead-drop resolver", used because blockchain config channels cannot be taken down.
- Fetches a next-stage payload over JSON-RPC and runs it via `eval`.
- Falls back to `spawn(…)` with `{ detached: true, windowsHide: true }`.

It ran on **every ESLint invocation**, including the VS Code extension's continuous
background runs. That is why `npm run lint` hung for 5+ minutes — it was blocking on its
C2.

**Introduced by commit `6e6d819` ("MVP", 2026-05-21).** The parent commit is clean.
`node_modules` was swept and is clean, so this was a file-level injection into the repo,
not a compromised dependency.

**Removed from the working tree. Still outstanding:**

1. **Rotate the `service_role` key on the marketing Supabase project** (`stuamoozecavlfrtgkiz`).
2. **Commit the removal** — it is still uncommitted, and the payload remains in git
   history at `6e6d819`.
3. Warn anyone who cloned the repo or opened it with the ESLint extension.

---

## Performance work

Measured rather than guessed. Every Supabase round trip costs **~265 ms** from a laptop
in Pakistan to the Mumbai region.

| | Before | After |
|---|---|---|
| Simulator page data | 1046 ms | **517 ms** |
| Bot reply per tap | 2450 ms | **~1650 ms** |

The fixes were all about **round-trip count**, not query speed:

- Auth was asking the same question ~10 times per page load. Wrapped in React's
  `cache()` and rebuilt from membership rows already in hand. **~10 trips → 2.**
- The executor wrote one `flow_run_steps` row per step, sequentially. Now buffered and
  written once.
- Outbound messages cost two trips (insert `queued`, update `sent`). Now one.
- Embedded joins replaced separate lookups.
- Optimistic UI so the customer's own message appears instantly.

**Worth knowing:** most of this latency is a **dev artifact**. In production, Vercel
`bom1` and Supabase `ap-south-1` are both in Mumbai — single-digit milliseconds.

---

## Phase 5a · WhatsApp

Built end to end. Every piece is unit-tested and the whole path typechecks and builds,
but **none of it has spoken to Meta's servers yet** — that needs credentials.

| Piece | File |
|---|---|
| Token encryption at rest (AES-256-GCM) | `src/server/crypto/secrets.ts` |
| Graph API client + error classification | `src/server/meta/graph.ts` |
| Webhook verification, signature check, dispatch | `src/server/meta/webhook.ts` |
| Route: `hub.challenge`, HMAC, 200 then `after()` | `src/app/api/webhooks/meta/route.ts` |
| WhatsApp adapter — send, normalise, capabilities | `src/server/channels/whatsapp.ts` |
| Unified Inbox on real data, Supabase Realtime | `src/app/app/inbox/` |
| Human handoff, take over / hand back | `src/app/app/inbox/actions.ts` |
| Connect a number, verify token, re-check | `src/app/app/channels/` |
| Run inspector, shared with the Simulator | `src/components/RunInspector/` |

**The 24-hour window** is enforced in the send path (`assertWithinServiceWindow`) and
surfaced in three places rather than failing silently: the composer is disabled with a
banner explaining why, a rejected agent send returns plain language rather than a Graph
code, and the inspector calls it out in amber as a WhatsApp rule rather than red as a
fault.

**Instagram and Messenger are deliberately absent from the adapter registry**, and there
is no "connect Instagram" anywhere in the product. See the comment in
`src/server/channels/registry.ts`.

## Phase 5b · ROI dashboard

The screen the product is sold on. `/app` was a set of hard-coded widgets — "1,234
conversations today", a leaderboard of invented agents — and those are gone.

- `supabase/migrations/0013_roi_summary.sql` — `roi_summary()`, `roi_daily()`,
  `roi_turns()`. Server-only; `execute` revoked from `anon` and `authenticated`.
- `src/server/roi/summary.ts` — the calculation and its one assumption.
- `/app` — hero hours-saved figure, proof cards, daily chart, and the arithmetic
  written out in full.
- `/app/reports` — a one-page document that prints to PDF, plus a CSV of daily figures.

**The unit of work is a turn, not a message.** One inbound customer message plus
everything sent back before they wrote again. This matters: a flow often replies in three
bubbles where a person would type one, so counting outbound bot messages would inflate
the headline roughly threefold. `npm run roi:check` asserts exactly this against the live
database.

**The one assumption** — minutes of staff time per customer message — defaults to a
deliberately low 3 minutes, is displayed on the hero itself, and is editable in two
clicks. An owner who can see and move the assumption has a reason to believe the result.

## Phase 6 · Manual pilot onboarding

`/app/setup` — nine steps from empty account to a real customer answered automatically.
Seven are **derived from data** rather than ticked, so they turn green when they are
actually true: the webhook step needs a correctly signed payload from Meta, the "first
real conversation" step needs a conversation on a non-simulator channel. Only two are
manual — whether the owner was actually walked through the product, and whether a
follow-up is booked — and those are labelled as such.

No Embedded Signup, no Tech Provider self-serve. Those wait until this has been done by
hand enough times to know where people get stuck.

---

## Deliberately deferred

Each waits on the same gate: **three to five pilot businesses live, retained, and giving
feedback.**

- **Phase 7 — Instagram + Messenger.** The `ChannelAdapter` interface supports them and
  the work is mostly wiring. Connecting three channels before one has a retained client
  only delays the first real conversation.
- **Phase 8 — Money.** `PaymentProvider` interface, Stripe first, PPP regional pricing,
  plan limits, invoices.
- **Phase 9 — Self-serve onboarding.** Meta Tech Provider registration and App Review
  *(long lead time — worth starting the paperwork early even while the code waits)*,
  Embedded Signup.
- **Phase 10 — Lifecycle automation, customer payments, scale.** Booking reminders,
  abandoned cart, win-back, campaigns on real segments, template approval sync,
  Stripe Checkout / JazzCash / Easypaisa, n8n side-car, GDPR posture.

---

## Screens still showing fake data

| Screen | State |
|---|---|
| Contacts | Static — needs wiring to the real `contacts` table |
| Campaigns | Static — Phase 10 |
| Templates | Static — Phase 10 |
| Billing | **Static, and shows an invented plan and invoices** — Phase 8 |
| Settings | Static — team invites and roles not wired |
| Payments | Placeholder — Phase 10 |

**Wired to real data:** Dashboard (ROI), Reports, Inbox, Channels, Go-live checklist,
Flows, Flow builder, Simulator, Menu & Services, Orders, Bookings, Setup wizard.

> **Billing is worth flagging.** It is the last screen in the product that presents
> fabricated numbers as real — a plan the client is not on and invoices that do not exist.
> The ROI dashboard's whole job is to be believed; a fake invoice two clicks away works
> against that. Building billing is out of scope, but hiding the nav entry is one line.

---

## Also still open

- **n8n** was deliberately deferred and kept **out of the client-facing path**. It ships
  under the Sustainable Use License, which restricts self-hosting it as part of a product
  sold to third parties; embedding the editor needs a paid Embed licence. The canvas is
  React Flow (MIT) instead, owned outright.
- **The marketing site claims Instagram and Facebook Messenger** alongside WhatsApp. That
  is a positioning decision, not a bug, but it will be true only after Phase 7 — worth
  softening to "WhatsApp today, Instagram and Messenger next" before the first sales
  conversation.
- **Contact identity across channels** is WhatsApp-only for now, which is correct while
  WhatsApp is the only live channel. Merging one person across three channels is Phase 7.

---

# Part 3 — Running it

```bash
npm run dev          # app + marketing site on http://localhost:3000
npm run worker       # background jobs: delays, reminders, retries

npm test             # 128 unit tests
npm run smoke        # 59 live end-to-end checks against Supabase
npm run demo:check   # 13 checks on the public demo
npm run seed         # seed a workspace's catalog and resources
npm run build        # production build
npx tsc --noEmit     # typecheck
```

### Architecture in one diagram

```
                      ┌──────────────────────────────────────────┐
  Meta Graph API ────▶│  /api/webhooks/meta        (Phase 5)     │
  (WA / IG / FB)      │  verify HMAC → 200 → after(){ process }  │
         ▲            └──────────────────┬───────────────────────┘
         │                               │
  ┌──────┴────────┐             ┌────────▼─────────┐
  │ ChannelAdapter│◀────────────│   FLOW ENGINE    │
  │  simulator ✅ │    send     │  load graph      │
  │  whatsapp  ❌ │             │  exec node       │
  │  instagram ❌ │             │  park / advance  │
  │  messenger ❌ │             └────┬────────┬────┘
  └───────────────┘                  │        │
                              ┌──────▼──┐  ┌──▼───────────┐
                              │ Domain  │  │  jobs queue  │
                              │ orders  │  │  (Postgres,  │
                              │ bookings│  │  SKIP LOCKED)│
                              │ catalog │  └──┬───────────┘
                              └─────────┘     │
   Next.js UI ◀── Supabase Realtime ──┐   ┌───▼──────────────┐
   /app  (dashboard)                   └───│  worker process  │
   /     (marketing + live demo)           │ delays·reminders │
                                           └──────────────────┘
```

### Key files

| Concern | File |
|---|---|
| Tenant isolation | `src/server/db/tenancy.ts` |
| Flow execution | `src/server/flow/executor.ts` |
| Graph validation | `src/server/flow/validate.ts` |
| Channel interface | `src/server/channels/types.ts` |
| Inbound pipeline | `src/server/messaging/inbound.ts` |
| Outbound + 24h window | `src/server/messaging/outbound.ts` |
| Availability engine | `src/server/domain/bookings.ts` |
| Timezone arithmetic | `src/lib/timezone.ts` |
| Date parsing | `src/lib/parse-date.ts` |
| Money | `src/lib/money.ts` |
| Public demo | `src/server/demo/service.ts` |
| Auth gate | `src/proxy.ts` |
| Routes | `src/lib/routes.ts` |
| Verticals | `src/lib/verticals.ts` |

---

## Honest summary

**What works:** the engine, the builder, the commerce layer, the WhatsApp path, the ROI
dashboard, the pilot checklist, and a public site with a demo that genuinely proves the
product. A stranger can find xSender, understand it in five seconds, order from it, and
sign up. An owner can see, and check, exactly how many hours the automation saved them.

**What is built but unproven:** every line of the WhatsApp path. It is unit-tested, it
typechecks, it builds — and it has never met Meta's servers. Until one message goes out
and one comes back on a real test number, treat this as code that should work rather than
code that does.

**What does not exist:** payments, self-serve onboarding, Instagram, Messenger. All
deliberate.

**Next, in order:**

1. Create a Meta app, get a test WhatsApp number, put `META_APP_SECRET` and
   `META_WEBHOOK_VERIFY_TOKEN` in the environment.
2. Connect that number on the **Channels** screen and point Meta's webhook at
   `/api/webhooks/meta`.
3. Send one message from a phone. Watch it land in the Inbox, watch the flow answer it,
   watch the hours-saved figure move off zero.
4. Only then: pilot clients, and whatever they ask for.
