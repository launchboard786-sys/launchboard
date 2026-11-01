import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { ForgotForm } from "@/components/AccountForms";

export const metadata: Metadata = { title: "Forgot password" };

export default function Page() {
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we'll send you a link to choose a new one.">
      <ForgotForm />
    </AuthShell>
  );
}
