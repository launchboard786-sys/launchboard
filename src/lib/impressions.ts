import { headers } from "next/headers";
import { isBot } from "./http";
import { bump } from "./stats";

/** Count sponsored impressions for a server-rendered page view (bots skipped). */
export async function recordSponsoredImpressions(businessIds: string[]) {
  if (!businessIds.length) return;
  const h = await headers();
  if (h.get("purpose") === "prefetch" || h.get("next-router-prefetch")) return;
  if (isBot(h.get("user-agent"))) return;
  await bump(businessIds, "sponsoredImpressions");
}

export async function recordPageView(businessId: string) {
  const h = await headers();
  if (h.get("purpose") === "prefetch" || h.get("next-router-prefetch")) return;
  if (isBot(h.get("user-agent"))) return;
  await bump([businessId], "pageViews");
}
