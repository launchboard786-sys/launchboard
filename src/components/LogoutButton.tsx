"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm font-medium text-muted hover:text-ink"
      onClick={async () => {
        await api("/api/auth/logout");
        router.push("/");
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
