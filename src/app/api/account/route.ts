import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseJson, route } from "@/lib/http";
import { setEmailAlerts } from "@/lib/notify";

const schema = z.object({ emailAlerts: z.boolean() });

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const { emailAlerts } = await parseJson(req, schema);
  await setEmailAlerts(user.id, emailAlerts);
  return NextResponse.json({ emailAlerts });
});
