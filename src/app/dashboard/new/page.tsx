import type { Metadata } from "next";
import { ListingForm } from "@/components/ListingForm";
import { PageHeader } from "@/components/PageHeader";
import { config, uploadsEnabled } from "@/lib/config";
import { requireUserOrRedirect } from "@/lib/guards";
import { needsVerification } from "@/lib/auth";
import { VerifyBanner } from "@/components/AccountForms";
import { listCategories, listingsUsedCount } from "@/lib/listings";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "List your startup" };

export default async function NewListing() {
  const user = await requireUserOrRedirect("/dashboard/new");
  const [cats, used] = await Promise.all([listCategories(), listingsUsedCount()]);
  const free = used < config.freeListingLimit;
  return (
    <div className="wrap flex max-w-3xl flex-col gap-8 pt-12">
      <PageHeader size="md" kicker="Takes two minutes" title="List your startup" description={<>
          {free
            ? `Free for the first ${config.freeListingLimit.toLocaleString("en-IN")} businesses, and ${(config.freeListingLimit - used).toLocaleString("en-IN")} spots are left. We review every listing, usually within a day.`
            : `The free spots are taken. A one-time listing fee of ${formatINR(config.listingFeePaise)} applies, paid after you submit. We review every listing, usually within a day.`}
      </>} />
      {needsVerification(user) && <VerifyBanner email={user.email} />}
      <ListingForm uploads={uploadsEnabled()} categories={cats.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
