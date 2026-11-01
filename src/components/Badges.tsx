import { zoneLabel } from "@/lib/rules";

export function SponsoredChip({ position }: { position?: number }) {
  return (
    <span className="chip bg-sponsor-soft text-sponsor" title="Paid placement">
      Sponsored{position ? ` · #${position}` : ""}
    </span>
  );
}

export function ZoneChip({ position }: { position: number }) {
  return <span className="chip bg-sponsor-soft text-sponsor">{zoneLabel(position)}</span>;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: "Live", cls: "bg-good/10 text-good" },
  PENDING_REVIEW: { label: "In review", cls: "bg-warn/10 text-warn" },
  PENDING_PAYMENT: { label: "Fee due", cls: "bg-warn/10 text-warn" },
  REJECTED: { label: "Rejected", cls: "bg-bad/10 text-bad" },
};
export function StatusChip({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-line text-muted" };
  return <span className={`chip ${s.cls}`}>{s.label}</span>;
}

export const STAGE_LABEL: Record<string, string> = {
  IDEA: "Idea stage",
  MVP: "MVP",
  EARLY_REVENUE: "Early revenue",
  GROWTH: "Growth",
};
