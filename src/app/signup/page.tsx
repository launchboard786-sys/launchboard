import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create your account" };

export default function Page() {
  return (
    <div className="wrap flex max-w-md flex-col gap-6 pt-14">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-muted">List your startup for free, upvote others and bid for sponsored spots.</p>
      </div>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
