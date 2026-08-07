# xSender — local setup

## 1. Create a Supabase project

xSender needs its own project. `auth.users` is scoped per project, so sharing
one with another app would mean a signup on that app becomes an xSender user.

1. <https://supabase.com/dashboard> → **New project**
2. Name it `xsender`, region **Mumbai (ap-south-1)** or whichever is nearest
3. Generate a **fresh** database password and store it in a password manager —
   don't reuse one that has been typed into a terminal or chat
4. Wait for provisioning (~2 minutes)

## 2. Fill in `.env`

Copy `.env.example` to `.env`, then from **Project Settings → API**:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key — **server only**, never `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` in development |
| `ENCRYPTION_KEY` | generate below |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`ENCRYPTION_KEY` encrypts channel access tokens at rest (AES-256-GCM). Losing it
means every connected channel has to be reconnected, so back it up.

`.env` is gitignored. Keep it that way.

## 3. Apply the database schema

```bash
npx supabase db push \
  --db-url "postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres" \
  --include-all
```

If that host fails to connect, it resolves to IPv6 only. Use the session-mode
pooler instead (note the different username format):

```bash
npx supabase db push \
  --db-url "postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres" \
  --include-all
```

Verify with `npx supabase migration list --db-url "..."` — all seven migrations
should show a remote version.

## 4. Run it

```bash
npm run dev      # app on http://localhost:3000
npm run worker   # background jobs: delays, reminders, retries
```

The worker is a separate process on purpose: Vercel functions cannot hold work
open, so anything delayed, scheduled, retried, or batched goes through the
Postgres job queue instead.

## 5. First run

1. Open <http://localhost:3000> → redirected to `/signup`
2. Create an account; the workspace, owner membership, and a Simulator channel
   are created together in one transaction
3. Go to **Simulator** → **Install restaurant demo**
4. Say "hi" and work through the ordering flow

The Simulator drives the real engine — the same inbound pipeline, router, and
executor that WhatsApp will use. The run inspector on the right shows every node
the engine entered and which branch it took.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run worker` | Background job worker (watch mode) |
| `npm run build` | Production build |
| `npm test` | Unit tests |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |

## Notes

- **Next.js 16**: `params`/`searchParams`/`cookies()`/`headers()` are async only;
  post-response work uses `after()` from `next/server`; the auth gate lives in
  `src/proxy.ts` (the `middleware` convention is deprecated).
- **Tenancy**: server code uses the service-role key, which bypasses RLS.
  Isolation is enforced in `src/server/db/tenancy.ts` — always go through
  `ctx.table(...)`, never `supabaseAdmin()` directly in feature code.
- **Migrations** are numbered `0001`–`0007`. Add new ones with the next number;
  never edit an applied migration.
