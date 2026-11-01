import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { LogoutButton } from "./LogoutButton";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-line bg-bg">
      <div className="wrap flex h-16 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold tracking-tight tracking-tight sm:text-xl">
          <svg aria-hidden width="22" height="22" viewBox="0 0 22 22"><rect x="1" y="12" width="5" height="9" rx="1" fill="currentColor" opacity=".35"/><rect x="8.5" y="6" width="5" height="15" rx="1" fill="currentColor" opacity=".6"/><rect x="16" y="1" width="5" height="20" rx="1" fill="currentColor"/></svg>
          {config.appName}
        </Link>
        <form action="/search" className="ml-2 hidden flex-1 md:block">
          <label htmlFor="hdr-q" className="sr-only">Search businesses</label>
          <input id="hdr-q" name="q" placeholder="Search startups, tools, founders' cities…" className="input max-w-sm py-1.5" />
        </form>
        <nav className="ml-auto flex items-center gap-3 whitespace-nowrap text-sm font-medium sm:gap-4">
          <Link href="/advertise" className="hidden text-muted hover:text-ink sm:inline">Advertise</Link>
          {user ? (
            <>
              {user.role === "ADMIN" && <Link href="/admin" className="text-muted hover:text-ink">Admin</Link>}
              <Link href="/dashboard" className="text-muted hover:text-ink">Dashboard</Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-ink">Log in</Link>
              <Link href="/dashboard/new" className="btn-primary px-3 sm:px-4"><span className="sm:hidden">List startup</span><span className="hidden sm:inline">List your startup</span></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
