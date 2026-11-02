import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { readUnsubscribeToken } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email alerts", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await searchParams;
  const valid = !!(await readUnsubscribeToken(t));
  if (!valid) {
    return (
      <AuthShell title="This link didn't work" subtitle="You can turn alerts on or off any time from your dashboard.">
        <Link prefetch={false} href="/dashboard" className="btn-primary py-3 text-[15px]">Go to your dashboard</Link>
      </AuthShell>
    );
  }
  if (done) {
    return (
      <AuthShell title="Alerts turned off" subtitle="You won't get outbid or upvote-milestone emails any more. We'll still email you about payments, auction results and your listing's review.">
        <Link prefetch={false} href="/dashboard" className="btn-ghost py-3 text-[15px]">Turn them back on from your dashboard</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Turn off email alerts?" subtitle="You'll stop getting outbid and upvote-milestone emails. Payment, auction-result and listing-review emails still arrive.">
      <form method="post" action={`/api/unsubscribe?t=${encodeURIComponent(t!)}`}>
        <button className="btn-primary w-full py-3 text-[15px]">Turn off alerts</button>
      </form>
    </AuthShell>
  );
}
