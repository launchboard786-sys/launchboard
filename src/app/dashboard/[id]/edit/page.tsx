import type { Metadata } from "next";
import { ListingForm } from "@/components/ListingForm";
import { PageHeader } from "@/components/PageHeader";
import { orNotFound, requireUserOrRedirect } from "@/lib/guards";
import { getOwnedBusiness, listCategories } from "@/lib/listings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserOrRedirect(`/dashboard/${id}/edit`);
  const [{ business: b }, cats] = await Promise.all([orNotFound(getOwnedBusiness(user.id, id)), listCategories()]);
  return (
    <div className="wrap flex max-w-3xl flex-col gap-6 pt-10">
      <PageHeader size="md" kicker="Edit listing" title={b.name} />
      <ListingForm
        categories={cats.map((c) => ({ id: c.id, name: c.name }))}
        initial={{ ...b, logoUrl: b.logoUrl ?? "" }}
      />
    </div>
  );
}
