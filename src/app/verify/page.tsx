import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentUser } from "@/lib/auth";
import { verifyEmailWithToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirm email", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const email = token ? await verifyEmailWithToken(token) : null;
  const user = await getCurrentUser();

  if (email || user?.emailVerifiedAt) {
    return (
      <AuthShell title="Email confirmed" subtitle={email ? `${email} is verified. You can now upvote and list your business.` : "Your email is already verified."}>
        <Link prefetch={false} href={user ? "/dashboard" : "/login?next=/dashboard"} className="btn-primary py-3 text-[15px]">
          {user ? "Go to your dashboard" : "Log in"}
        </Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="This link didn't work" subtitle="It may have expired (links last 24 hours) or been used already.">
      <p className="text-muted">
        {user ? <>Open your <Link prefetch={false} href="/dashboard" className="font-semibold text-accent">dashboard</Link> and tap <b>Resend email</b> to get a new link.</>
          : <><Link prefetch={false} href="/login?next=/dashboard" className="font-semibold text-accent">Log in</Link> and we&apos;ll offer to send a new link.</>}
      </p>
    </AuthShell>
  );
}
