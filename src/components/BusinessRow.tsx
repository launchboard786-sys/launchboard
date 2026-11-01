import Link from "next/link";
import type { Business } from "@/db/schema";
import { Logo } from "./Logo";
import { SponsoredChip, STAGE_LABEL } from "./Badges";
import { VoteButton } from "./VoteButton";

export function BusinessRow({
  business,
  categoryName,
  voted,
  sponsoredPosition,
  rank,
}: {
  business: Business;
  categoryName?: string;
  voted: boolean;
  sponsoredPosition?: number;
  rank?: number;
}) {
  const sponsored = sponsoredPosition !== undefined;
  return (
    <li className={`flex items-center gap-3 px-3 py-3.5 sm:gap-4 sm:px-5 ${sponsored ? "bg-sponsor-soft/45" : ""}`}>
      {rank !== undefined && <span className="hidden w-7 shrink-0 text-right font-mono text-sm tabular-nums text-muted/70 sm:block">{rank}</span>}
      <Logo name={business.name} url={business.logoUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/b/${business.slug}${sponsored ? "?s=1" : ""}`} className="font-display text-[17px] font-semibold leading-tight hover:underline hover:decoration-1 hover:underline-offset-4">
            {business.name}
          </Link>
          {sponsored && <SponsoredChip position={sponsoredPosition} />}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[14.5px] text-ink/75">{business.tagline}</p>
        <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted [&>span+span]:before:mr-2 [&>span+span]:before:content-['·']">
          {categoryName && <span>{categoryName}</span>}
          <span>{business.location}</span>
          <span>{STAGE_LABEL[business.stage]}</span>
        </p>
      </div>
      <VoteButton businessId={business.id} count={business.voteCount} voted={voted} compact />
    </li>
  );
}
