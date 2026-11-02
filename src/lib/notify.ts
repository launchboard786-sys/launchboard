import { after } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, notifications, users } from "@/db/schema";
import { config, emailEnabled } from "./config";
import { layout, sendEmail } from "./email";
import { formatINR } from "./money";
import { priceToReach, zoneFor } from "./rules";
import { formatWeek } from "./week";

/**
 * Alert emails. Two kinds:
 *  - account & money (listing review, auction results): always sent;
 *  - optional alerts (outbid, vote milestones): only if the owner keeps "email alerts" on.
 * Every send is logged in `notifications`, which de-duplicates and throttles.
 */
export const OUTBID_THROTTLE_MS = 3 * 3600_000;
export const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

const pending = new Set<Promise<unknown>>();
/** Run work after the response is sent (in a request), or right away (cron, scripts, tests). */
export function defer(fn: () => Promise<unknown>) {
  const run = () => fn().catch((e) => console.error("[notify] failed", e));
  try {
    after(run);
  } catch {
    const p = run();
    pending.add(p);
    void p.finally(() => pending.delete(p));
  }
}
/** Wait for alerts started outside a request (used by tests and scripts). */
export async function flushNotifications() {
  while (pending.size) await Promise.all([...pending]);
}

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "");
export async function unsubscribeToken(userId: string) {
  return new SignJWT({ p: "unsub" }).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().sign(secret());
}
export async function readUnsubscribeToken(token: string | null | undefined) {
  if (!token || token.length > 600) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.p === "unsub" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
const url = (p: string) => `${config.appUrl}${p}`;

async function ownerOf(businessId: string) {
  const [r] = await db
    .select({ business: businesses, category: categories, user: { id: users.id, email: users.email, name: users.name, emailAlerts: users.emailAlerts } })
    .from(businesses)
    .innerJoin(users, eq(users.id, businesses.ownerId))
    .innerJoin(categories, eq(categories.id, businesses.categoryId))
    .where(eq(businesses.id, businessId));
  return r ?? null;
}

/** Records the send first (so concurrent triggers can't double-send). Returns false if already sent. */
async function claim(userId: string, businessId: string | null, kind: string, dedupeKey: string | null) {
  const rows = await db.insert(notifications).values({ userId, businessId, kind, dedupeKey }).onConflictDoNothing().returning({ id: notifications.id });
  return rows.length === 1;
}

async function send(o: NonNullable<Awaited<ReturnType<typeof ownerOf>>>, subject: string, parts: { heading: string; body: string; cta: string; path: string; footnote: string }, optional: boolean) {
  const unsubscribeUrl = optional ? url(`/api/unsubscribe?t=${await unsubscribeToken(o.user.id)}`) : undefined;
  const { html, text } = layout({ ...parts, url: url(parts.path), unsubscribeUrl });
  return sendEmail({
    to: o.user.email,
    subject,
    html,
    text,
    headers: unsubscribeUrl ? { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined,
  });
}

// ---------------------------------------------------------------- outbid

export type Displaced = { businessId: string; from: number; to: number; amountPaise: number };
export type RankedBid = { businessId: string; amountPaise: number };

/**
 * Which other bidders a new or raised bid hurt enough to tell them:
 * they lost #1, or dropped into a lower zone (Top 10 → Top 50, …, or out of the paid positions).
 */
export function significantDrops(before: RankedBid[], after: RankedBid[], bidderId: string): Displaced[] {
  const pos = (list: RankedBid[]) => new Map(list.map((b, i) => [b.businessId, i + 1]));
  const pb = pos(before), pa = pos(after);
  const out: Displaced[] = [];
  for (const b of before) {
    if (b.businessId === bidderId) continue;
    const from = pb.get(b.businessId)!, to = pa.get(b.businessId)!;
    if (to <= from) continue;
    const lostTop = from === 1;
    const zoneDrop = zoneFor(from)?.key !== zoneFor(to)?.key;
    if (lostTop || zoneDrop) out.push({ businessId: b.businessId, from, to, amountPaise: b.amountPaise });
  }
  return out;
}

export async function notifyOutbid(params: { weekStart: Date; reservePaise: number; ranked: RankedBid[]; displaced: Displaced[]; now?: Date }) {
  if (!emailEnabled()) return;
  const now = params.now ?? new Date();
  for (const d of params.displaced) {
    const o = await ownerOf(d.businessId);
    if (!o || !o.user.emailAlerts) continue;
    const [recent] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.businessId, d.businessId), eq(notifications.kind, "outbid"), gt(notifications.createdAt, new Date(now.getTime() - OUTBID_THROTTLE_MS))));
    if (recent) continue;
    if (!(await claim(o.user.id, d.businessId, "outbid", null))) continue;
    const others = params.ranked.filter((b) => b.businessId !== d.businessId);
    const target = Math.min(d.from, others.length + 1);
    const price = priceToReach(target, others, params.reservePaise);
    const zone = zoneFor(d.to);
    const where = zone ? `#${d.to} (${zone.label})` : "outside the sponsored positions";
    await send(o, `You've been outbid in ${o.category.name}`, {
      heading: `Someone just passed ${o.business.name}`,
      body: `Your bid of ${formatINR(d.amountPaise)} for ${formatWeek(params.weekStart)} has dropped from #${d.from} to ${where}. Bid ${formatINR(price)} to take back #${target}. The auction closes Monday 00:00 IST.`,
      cta: "Raise your bid",
      path: `/dashboard/${o.business.id}`,
      footnote: "Losing bids are always released back to your wallet in full when the auction closes.",
    }, true);
  }
}

// ---------------------------------------------------------------- auction results

export type Outcome = { businessId: string; position: number | null; amountPaise: number };

export async function notifySettlement(weekStart: Date, outcomes: Outcome[]) {
  if (!emailEnabled()) return;
  const week = formatWeek(weekStart);
  for (const r of outcomes) {
    const o = await ownerOf(r.businessId);
    if (!o) continue;
    if (!(await claim(o.user.id, r.businessId, "result", `result:${weekStart.toISOString()}:${r.businessId}`))) continue;
    if (r.position) {
      const zone = zoneFor(r.position);
      await send(o, `🏆 ${o.business.name} won #${r.position} in ${o.category.name}`, {
        heading: `You won Sponsored #${r.position}`,
        body: `${o.business.name} won position #${r.position}${zone ? ` (${zone.label})` : ""} in ${o.category.name} for ${week}. ${formatINR(r.amountPaise)} was charged from your wallet. Your placement is live now and labelled Sponsored.`,
        cta: "See it live",
        path: `/c/${o.category.slug}`,
        footnote: "Bidding for next week is already open. Keep your spot by bidding again from your dashboard.",
      }, false);
    } else {
      await send(o, `Your bid for ${week} didn't place`, {
        heading: `${formatINR(r.amountPaise)} is back in your wallet`,
        body: `${o.business.name}'s bid for ${week} in ${o.category.name} didn't win a sponsored position, so the full amount has been released to your wallet. You can use it for next week's auction or ask for a refund.`,
        cta: "Bid for next week",
        path: `/dashboard/${o.business.id}`,
        footnote: "Organic rankings aren't affected by bidding. They're decided by votes only.",
      }, false);
    }
  }
}

// ---------------------------------------------------------------- listing review

export async function notifyReview(businessId: string, action: "approve" | "reject", reason?: string) {
  if (!emailEnabled()) return;
  const o = await ownerOf(businessId);
  if (!o) return;
  if (action === "approve") {
    if (!(await claim(o.user.id, businessId, "approved", `approved:${businessId}`))) return;
    await send(o, `${o.business.name} is live on ${config.appName} 🎉`, {
      heading: "Your listing is live",
      body: `${o.business.name} passed review and is now public in ${o.category.name}. Share it to collect your first upvotes. Every vote moves you up the organic ranking, which is never for sale.`,
      cta: "View your listing",
      path: `/b/${o.business.slug}`,
      footnote: "Want more visibility? You can also bid for a labelled Sponsored spot from your dashboard.",
    }, false);
  } else {
    await claim(o.user.id, businessId, "rejected", null);
    await send(o, `Your listing needs changes`, {
      heading: `We couldn't approve ${o.business.name}`,
      body: `Reason: ${reason ?? "it doesn't meet our listing guidelines"}. If you paid a listing fee, it will be refunded in full. Reply to this email or contact us and we'll help you fix it.`,
      cta: "Contact us",
      path: "/contact",
      footnote: "Our Terms explain what can be listed on REIGN.",
    }, false);
  }
}

// ---------------------------------------------------------------- vote milestones

export async function notifyMilestone(businessId: string, voteCount: number) {
  if (!emailEnabled() || !MILESTONES.includes(voteCount)) return;
  const o = await ownerOf(businessId);
  if (!o || !o.user.emailAlerts) return;
  if (!(await claim(o.user.id, businessId, "milestone", `milestone:${businessId}:${voteCount}`))) return;
  await send(o, `${o.business.name} just hit ${voteCount.toLocaleString("en-IN")} upvotes 🎉`, {
    heading: `${voteCount.toLocaleString("en-IN")} upvotes`,
    body: `People are noticing ${o.business.name}. Share your listing to keep climbing the ${o.category.name} ranking.`,
    cta: "Share your listing",
    path: `/b/${o.business.slug}`,
    footnote: "Votes decide the organic ranking. It can't be bought.",
  }, true);
}

export async function setEmailAlerts(userId: string, on: boolean) {
  await db.update(users).set({ emailAlerts: on }).where(eq(users.id, userId));
}
