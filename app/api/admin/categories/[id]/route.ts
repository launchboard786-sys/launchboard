import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { conflict, notFound } from "@/lib/errors";
import { parseJson, route } from "@/lib/http";
import { categorySchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** Reserve price changes apply to new bids; existing bids are never invalidated. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const input = await parseJson(req, categorySchema);
  const [clash] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.slug, input.slug), ne(categories.id, id)));
  if (clash) throw conflict("A category with this slug already exists.");
  const [row] = await db
    .update(categories)
    .set({ name: input.name, slug: input.slug, description: input.description, sortOrder: input.sortOrder, reservePaise: input.reserveRupees * 100 })
    .where(eq(categories.id, id))
    .returning();
  if (!row) throw notFound();
  return NextResponse.json(row);
});
