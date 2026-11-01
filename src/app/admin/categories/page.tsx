import type { Metadata } from "next";
import Link from "next/link";
import { CategoryForm } from "@/components/AdminActions";
import { PageHeader } from "@/components/PageHeader";
import { requireAdminOrRedirect } from "@/lib/guards";
import { listCategories } from "@/lib/listings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategories() {
  await requireAdminOrRedirect();
  const cats = await listCategories();
  return (
    <div className="wrap flex flex-col gap-6 pt-10">
      <nav className="text-sm text-muted"><Link href="/admin" className="hover:text-ink">Admin</Link> / Categories</nav>
      <PageHeader size="md" kicker="Admin" title="Categories" />
      <section className="card flex flex-col gap-3 p-6">
        <h2 className="font-display text-lg font-bold">Add category</h2>
        <CategoryForm />
      </section>
      <section className="card flex flex-col gap-5 p-6">
        <h2 className="font-display text-lg font-bold">Existing ({cats.length})</h2>
        <p className="text-sm text-muted">A new minimum bid applies to new bids only. Bids already placed stay valid.</p>
        {cats.map((c) => (
          <div key={c.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
            <CategoryForm initial={{ id: c.id, name: c.name, slug: c.slug, description: c.description, reserveRupees: c.reservePaise / 100, sortOrder: c.sortOrder }} />
          </div>
        ))}
      </section>
    </div>
  );
}
