import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { googleEnabled } from "@/lib/google";

export const metadata: Metadata = { title: "Sign up" };

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AuthShell title="Create your account" subtitle="List your startup for free, upvote others and compete for the throne.">
      <Suspense>
        <AuthForm mode="signup" google={googleEnabled()} />
      </Suspense>
    </AuthShell>
  );
}
