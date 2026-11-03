import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { googleEnabled } from "@/lib/google";

export const metadata: Metadata = { title: "Log in" };

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage your listings, bids and wallet.">
      <Suspense>
        <AuthForm mode="login" google={googleEnabled()} />
      </Suspense>
    </AuthShell>
  );
}
