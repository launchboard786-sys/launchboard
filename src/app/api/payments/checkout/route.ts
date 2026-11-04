import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseJson, route } from "@/lib/http";
import { rupeesToPaise } from "@/lib/money";
import { createCheckout } from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";
import { checkoutSchema } from "@/lib/validation";

export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`checkout:${user.id}`, 20, 60_000);
  const input = await parseJson(req, checkoutSchema);
  const result = await createCheckout({
    userId: user.id,
    userEmail: user.email,
    businessId: input.businessId,
    purpose: input.purpose,
    provider: input.provider,
    currency: input.currency,
    amountPaise: input.amountRupees != null ? rupeesToPaise(input.amountRupees) : undefined,
    amountCents: input.amountUsd != null ? Math.round(input.amountUsd * 100) : undefined,
  });
  return NextResponse.json(result);
});
