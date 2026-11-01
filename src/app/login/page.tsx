import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Log in" };

export default function Page() {
  return (
    <div className="wrap flex max-w-md flex-col gap-6 pt-14">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-1 text-muted">Welcome back.</p>
      </div>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
