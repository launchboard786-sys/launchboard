import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { conflict } from "@/lib/errors";
import { parseJson, route } from "@/lib/http";
import { categorySchema } from "@/lib/validation";

export const POST = route(async (req) => {
  await requireAdmin();
  const input = await parseJson(req, categorySchema);
  const rows = await db
    .insert(categories)
    .values({ name: input.name, slug: input.slug, description: input.description, sortOrder: input.sortOrder, reservePaise: input.reserveRupees * 100 })
    .onConflictDoNothing({ target: categories.slug })
    .returning();
  if (!rows[0]) throw conflict("A category with this slug already exists.");
  return NextResponse.json(rows[0], { status: 201 });
});
