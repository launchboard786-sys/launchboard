import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ResetForm } from "@/components/AccountForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password" subtitle="Once saved, you'll be signed in here and signed out everywhere else.">
      {token ? (
        <ResetForm token={token} />
      ) : (
        <p className="text-muted">This link is missing its code. <Link prefetch={false} href="/forgot" className="font-semibold text-accent">Ask for a new reset link</Link>.</p>
      )}
    </AuthShell>
  );
}
