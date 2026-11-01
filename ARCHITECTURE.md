# Launchboard — Architecture & Business Rules

Launchboard is a discovery platform for startups and new businesses. Visitors browse,
search and upvote businesses. Businesses bid weekly for **Sponsored** positions
(Top 10 / Top 50 / Top 100) in their category. Organic rankings are never for sale.

> "Launchboard" is a placeholder. The display name comes from `NEXT_PUBLIC_APP_NAME`.

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Web + API | Next.js 15 (App Router, TypeScript) | One codebase for pages and API; server components read the DB directly |
| Database | PostgreSQL + Drizzle ORM (`pg` driver) | Relational data with transactions, needed for money and auctions |
| Auth | Email + password, bcrypt hashes, signed JWT in an httpOnly cookie (`jose`) | No third-party dependency; easy to swap for Clerk/Auth.js later |
| Payments | Razorpay (India) + Stripe (international) + a Mock provider for local/demo | Both gateways behind one interface |
| Styling | Tailwind CSS | Fast, consistent UI |
| Tests | Vitest (unit + integration on real Postgres), Playwright (end-to-end) | |

## 2. Core concepts

### Users and roles
* `USER`: any signed-up person. Can upvote, and can create and own businesses.
* `ADMIN`: moderates listings, manages categories, sees revenue, runs settlement.

### Listings (Business)
Lifecycle: `PENDING_PAYMENT → PENDING_REVIEW → APPROVED | REJECTED`.

* The first `FREE_LISTING_LIMIT` listings (default **2,000**) are free and go straight
  to `PENDING_REVIEW`. After that, a new listing starts in `PENDING_PAYMENT` and moves
  to review once the listing fee (`LISTING_FEE_PAISE`, default ₹999) is paid.
* Only `APPROVED` listings are public, can be voted on, and can bid.
* Editing an approved listing's **name or website** sends it back to review (tagline and description edits go live),
  so a reviewed listing can't be swapped for different content.

### Organic ranking (not for sale)
* **Trending**: `(votes + 1) / (hours since approval + 2) ^ 1.5`, i.e. Hacker-News-style gravity.
  New businesses with early traction rise; old ones decay.
* **Top**: by total votes. **New**: by approval date.
* One vote per user per business (DB primary key). Owners can't vote for their own listing.

### Sponsored positions (for sale)
* Every category has positions **1–100** per **auction week**.
  * Positions 1–10 = **Top 10** zone (featured cards at the top of the category page).
  * Positions 11–50 = **Top 50**, 51–100 = **Top 100**: shown as labelled "Sponsored"
    rows mixed into the organic list (1 sponsored row after every 4 organic rows), in position order.
* A business can bid only in its own category, and has one bid per week.

## 3. Auction rules

**Auction week:** Monday 00:00 to next Monday 00:00 IST (`Asia/Kolkata`, UTC+5:30, no DST).

**Bidding window:** during week *N*, businesses bid for week *N+1*. The auction for
week *N+1* closes at its start, when it is settled.

**Bid rules** (all enforced on the server):
1. Amount ≥ the category's reserve price (default ₹500) and a multiple of `BID_STEP_PAISE` (₹100).
2. Bids can only be **raised**, by at least one step, never lowered or withdrawn. This stops
   a business from bidding high to push others down and then pulling out at the last minute.
3. The bid amount is **held** from the business wallet when placed. Raising holds only the difference.
4. Maximum single bid: `MAX_BID_PAISE` (default ₹50,00,000), as a sanity cap.

**Ranking at settlement:** amount descending → earliest time the amount was set
(the first to commit to a price wins ties) → bid id.

**Pricing: first-price.** Winners pay their own bid, exactly the model in the plan:
"whoever pays more stays on top".

**Settlement** (runs at week start; idempotent):
* Top 100 bids → `WON`, `Placement` rows created, held money is **charged** (revenue).
* Remaining bids → `LOST`, held money is **released** back to the wallet's available balance.
* Bids from businesses that are no longer approved → `LOST` and released.
* Idempotent: a `Settlement` row (unique per week) is inserted in the same transaction,
  so running settlement twice, or at the same time on two servers, can't double-charge.
* Triggered by `POST /api/cron/settle` (with `CRON_SECRET`, run hourly by a scheduler)
  **and** lazily on the first page view after a week starts, so placements show
  even if the cron is late.

## 4. Money: wallet + ledger

Each business has a **wallet** with `available` and `held` balances in **paise (integers)**.
Floating-point is never used for money.

| Event | available | held | Ledger type |
|---|---|---|---|
| Wallet top-up paid | +x | | `TOPUP` |
| Bid placed / raised by Δ | −Δ | +Δ | `BID_HOLD` |
| Bid won at settlement | | −bid | `BID_CHARGE` (revenue) |
| Bid lost at settlement | +bid | −bid | `BID_RELEASE` |
| Admin manual refund | −x | | `REFUND` |

Every balance change writes a ledger row in the same DB transaction. Holds use a
conditional atomic update (`UPDATE … WHERE available >= Δ`), so two simultaneous bids
can't overspend a wallet (covered by a concurrency test).

**Why a wallet instead of charging per bid?** Bids change often, and most lose. With a
wallet, losing bids are released instantly at no cost; charging and refunding the card
every time would mean gateway fees, delays and failed refunds.

## 5. Payments

One interface (`lib/payments`), three providers:

| Provider | Create | Confirm (credit the wallet) |
|---|---|---|
| Razorpay | Orders API (`POST /v1/orders`) → Checkout.js on the client | (a) client callback verified with HMAC-SHA256 of `order_id|payment_id`; (b) `order.paid` webhook verified with HMAC of the raw body |
| Stripe | Checkout Session → redirect | (a) return page retrieves the session and checks `payment_status = paid`; (b) `checkout.session.completed` webhook verified with `stripe.webhooks.constructEvent` |
| Mock | Internal page with "Pay" button | Only when `PAYMENTS_MOCK=true` (never in production unless set on purpose) |

`markPaymentPaid()` is the single place money enters. It is idempotent
(`UPDATE payment SET status=PAID WHERE id=? AND status=CREATED`) and checks that the
paid amount matches the order, so a webhook and a client callback arriving together
credit exactly once.

Currency: the auction runs in one currency (`INR`), so bids are comparable. Stripe charges in
INR as well (Stripe accepts international cards for INR charges).

## 6. Analytics for advertisers

`DailyStat(businessId, day)` counters: page views, website clicks, sponsored
impressions and sponsored clicks. Website clicks go through `/go/[slug]` (a 302 redirect)
so they can be counted. Known bots are ignored by user agent. The business dashboard
shows impressions, clicks and CTR per day, so a business can see what its bid bought.

## 7. Security

* Passwords hashed with bcrypt (cost 12). Sessions are HS256 JWTs (`AUTH_SECRET`) in
  `httpOnly`, `SameSite=Lax`, `Secure` (prod) cookies.
* Mutating API routes check the `Origin` header (CSRF) and validate input with Zod.
* Authorization on the server for every action: owner-only for business edits, bids and
  top-ups; admin-only for `/api/admin/*`.
* Rate limits on signup, login, voting and bidding (in-memory; swap for Redis when running
  several servers).
* Website URLs must be `http(s)`. All user text is rendered by React (escaped).
* Webhooks verify signatures against the raw request body.

## 8. Directory map

```
drizzle/         SQL migrations (generated by drizzle-kit)
src/db/          schema.ts, client, migrate + seed scripts
src/app/         pages (public, dashboard, admin) and api/ route handlers
src/lib/         config, db, auth, auction, wallet, payments, ranking, stats, validation
src/components/  UI components
tests/unit       pure logic (week math, ranking, interleave, validation)
tests/integration  real Postgres: bidding, concurrency, settlement, payments idempotency
e2e/             Playwright browser flows
```

## 9. Scaling notes (for later)
* Move rate limiting and the lazy-settle cache to Redis when running more than one instance.
* Search uses `ILIKE`. Switch to Postgres full-text search (`tsvector`) or Meilisearch past ~100k listings.
* Stats counters are upserts. Batch them through a queue at very high traffic.
