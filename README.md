# Launchboard

A discovery platform for new startups and businesses. Visitors browse, search and upvote.
Businesses list for free (the first 2,000), then bid each week for **sponsored positions
(Top 10 / Top 50 / Top 100)** in their category. Paid spots are always labelled, and the
organic ranking is decided only by votes.

> "Launchboard" is a placeholder name. Change `NEXT_PUBLIC_APP_NAME` to rename the whole site.

**Built by Zyon Tech Solutions.** See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design:
data model, auction rules, wallet and ledger, payment flows, and security.

## What's included

| Area | Features |
|---|---|
| Public site | Home (featured, categories, trending, newest), category pages with Top 10 featured cards and labelled sponsored rows, business profiles, search, "Advertise" explainer, mobile-ready, light and dark |
| Accounts | Sign up, log in, sessions (httpOnly JWT cookie), rate-limited login |
| Founders | List a business (free quota, then a listing fee), edit, live/in-review status, 28-day analytics (views, impressions, clicks, CTR) |
| Auction | Weekly auction per category, live board with what it costs to reach each zone, raise-only bids, automatic settlement every Monday 00:00 IST |
| Money | Ad wallet with available and held balances, full ledger, Razorpay + Stripe + test-mode payments, idempotent webhooks |
| Admin | Review queue (approve/reject with reason), revenue overview, categories and minimum bids, manual settlement, refunds |

## Run it locally

Requires Node 20+ and PostgreSQL 14+.

```bash
npm install
cp .env.example .env        # then fill AUTH_SECRET and CRON_SECRET
createdb launchboard
npm run db:migrate
npm run db:seed             # demo data (optional)
npm run dev                 # http://localhost:3000
```

Demo logins after seeding:

| Role | Email | Password |
|---|---|---|
| Admin | admin@launchboard.dev | admin12345 |
| Founder (owns Saarthi AI and Ghar Scents) | founder@launchboard.dev | founder12345 |

## Tests

```bash
createdb launchboard_test
npm test            # 83 unit + integration tests on real Postgres
# Browser tests: start the app with a dev outbox so tests can read the emails it sends
EMAIL_DEV_OUTBOX=$PWD/.e2e-outbox npm start &
npm run test:e2e    # 34 browser tests (needs a seeded DB and a running app)
npm run typecheck && npm run lint
```

What the tests prove includes:
* concurrent bids can't overspend a wallet
* parallel settlement runs charge exactly once
* duplicate webhooks credit exactly once
* bids can't land in an already-settled week
* losing bidders get every rupee back
* the full founder journey, from listing to bidding, works in a browser
* the CSRF and authorization checks hold
* reset and verification links work once, expire, and resetting a password signs out other devices

## Deploy (Vercel + Supabase)

**Supabase database**
1. Create a project (region: South Asia, Mumbai). Use a database password with only letters and numbers.
2. SQL Editor → paste `setup.sql` → Run. This creates the tables and categories, and turns on Row Level Security,
   so Supabase's public Data API can't read your data.
3. Click **Connect** → **Transaction pooler** (port 6543) and copy the URI. Replace `[YOUR-PASSWORD]`. That's `DATABASE_URL`.
   SSL is handled automatically; no need to add `sslmode`.
4. Later schema changes ship as SQL files to paste the same way (or run `npm run db:migrate` from a computer
   once the drizzle migrations table exists).

**Email (password reset + verification)**
1. Sign up at resend.com → **Domains** → add your domain and add the DNS records it shows.
2. **API Keys** → create a key. In Vercel set `RESEND_API_KEY` and `EMAIL_FROM` (for example `REIGN <hello@yourdomain.com>`).
3. Redeploy. New accounts now get a confirmation email and must confirm before voting or listing.
   Accounts that existed before the upgrade are treated as confirmed.

Upgrading a database created before this feature: run `upgrade-1-email.sql` once in the SQL Editor.

## Deploy (general)

1. Create a Postgres database (Supabase, Neon or RDS) and set `DATABASE_URL`.
2. Import the repo into Vercel and add every variable from `.env.example`.
   Set `PAYMENTS_MOCK=false` and `NEXT_PUBLIC_APP_URL` to your domain.
3. Run `npm run db:migrate` once against the production database.
4. `vercel.json` schedules `/api/cron/settle` daily at 00:05 IST (works on Vercel's free plan; the Monday run closes the auction). Settlement also runs automatically on the first page visit after Monday 00:00 IST. Vercel sends `CRON_SECRET` automatically.
   On other hosts, call `GET /api/cron/settle` hourly with `Authorization: Bearer <CRON_SECRET>`.
5. Payments:
   * **Razorpay:** add live keys and a webhook to `https://<domain>/api/webhooks/razorpay` (event `order.paid`).
     Turn on automatic capture.
   * **Stripe:** add the secret key and a webhook to `https://<domain>/api/webhooks/stripe`
     (events `checkout.session.completed`, `checkout.session.async_payment_succeeded`).
6. Create your admin account: sign up, then run
   `update users set role='ADMIN' where email='you@yourdomain.com';`

## Project layout

```
src/app/            pages and API routes (Next.js App Router)
src/components/     UI components
src/lib/            business logic: auction, wallet, payments, listings, rules, auth
src/db/             Drizzle schema, migrations runner, seed
drizzle/            SQL migrations
tests/              unit + integration (Vitest)
e2e/                browser tests (Playwright)
```

## Before a public launch

* Terms of service and a refund policy (needed for Razorpay and Stripe activation).
* Email verification and password reset (e.g. Resend or SES). Not included yet.
* Logo uploads (currently a logo URL). Add S3 or Cloudinary.
* Move rate limiting to Redis if you run more than one server.
