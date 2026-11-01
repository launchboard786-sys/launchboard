import Link from "next/link";
import type { Business } from "@/db/schema";
import { Logo } from "./Logo";
import { SponsoredChip, STAGE_LABEL } from "./Badges";
import { VoteButton } from "./VoteButton";
import { StaggerItem } from "./motion/Reveal";

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
    <StaggerItem
      as="li"
      className={`group relative flex items-center gap-3 px-3 py-3.5 transition-colors duration-300 sm:gap-4 sm:px-5 ${
        sponsored ? "bg-gradient-to-r from-sponsor-soft/80 to-sponsor-soft/20" : "hover:bg-raised"
      }`}
    >
      {rank !== undefined && (
        <span className={`hidden w-7 shrink-0 text-right font-mono text-sm tabular-nums sm:block ${rank === 1 ? "text-sponsor" : "text-muted"}`}>
          {String(rank).padStart(2, "0")}
        </span>
      )}
      <span className="shrink-0 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.04]">
        <Logo name={business.name} url={business.logoUrl} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link prefetch={false}
            href={`/b/${business.slug}${sponsored ? "?s=1" : ""}`}
            className="text-[16.5px] font-semibold leading-tight tracking-tight after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ink/30"
          >
            {business.name}
          </Link>
          {sponsored && <SponsoredChip position={sponsoredPosition} />}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[14.5px] text-ink/70">{business.tagline}</p>
        <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted [&>span+span]:before:mr-2 [&>span+span]:before:content-['·']">
          {categoryName && <span>{categoryName}</span>}
          <span>{business.location}</span>
          <span>{STAGE_LABEL[business.stage]}</span>
        </p>
      </div>
      {/* Sits above the full-row link so voting doesn't navigate. */}
      <div className="relative z-[1]">
        <VoteButton businessId={business.id} count={business.voteCount} voted={voted} compact />
      </div>
      <svg className="hidden shrink-0 text-muted/40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-ink sm:block" width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </StaggerItem>
  );
}
