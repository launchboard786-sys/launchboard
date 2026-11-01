import type { Metadata } from "next";
import { ListingForm } from "@/components/ListingForm";
import { config } from "@/lib/config";
import { requireUserOrRedirect } from "@/lib/guards";
import { listCategories, listingsUsedCount } from "@/lib/listings";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "List your startup" };

export default async function NewListing() {
  await requireUserOrRedirect("/dashboard/new");
  const [cats, used] = await Promise.all([listCategories(), listingsUsedCount()]);
  const free = used < config.freeListingLimit;
  return (
    <div className="wrap flex max-w-3xl flex-col gap-6 pt-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">List your startup</h1>
        <p className="mt-1 text-muted">
          {free
            ? `Free for the first ${config.freeListingLimit.toLocaleString("en-IN")} businesses, and ${(config.freeListingLimit - used).toLocaleString("en-IN")} spots are left. We review every listing, usually within a day.`
            : `The free spots are taken. A one-time listing fee of ${formatINR(config.listingFeePaise)} applies, paid after you submit. We review every listing, usually within a day.`}
        </p>
      </div>
      <ListingForm categories={cats.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
