import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { NavProgress } from "@/components/NavProgress";
import { Crown } from "@/components/Crown";
import { MotionProvider } from "@/components/motion/Provider";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: `${config.appName}: discover what's launching`, template: `%s · ${config.appName}` },
  description: "Discover new startups and businesses before everyone else. Upvote what you like. Bid for the top spots.",
  metadataBase: new URL(config.appUrl),
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <MotionProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded focus:bg-surface focus:px-3 focus:py-2">
            Skip to content
          </a>
          <Suspense>
            <NavProgress />
          </Suspense>
          <Header />
          <main id="main" className="flex-1">{children}</main>
          <footer className="relative mt-24 overflow-hidden border-t border-line pb-24 sm:pb-0">
            <div className="wrap flex flex-col gap-10 pt-14">
              <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-sm">
                  <div className="flex items-center gap-2 text-sponsor">
                    <Crown size={20} />
                    <span className="text-[15px] font-semibold tracking-[0.2em] text-ink">{config.appName.toUpperCase()}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    Where new businesses rise. Organic rankings are decided by votes and are never for sale. Sponsored spots are always labelled.
                  </p>
                </div>
                <nav className="grid grid-cols-2 gap-x-12 gap-y-2.5 text-sm">
                  <Link href="/search" className="text-muted transition-colors hover:text-ink">Explore</Link>
                  <Link href="/advertise" className="text-muted transition-colors hover:text-ink">Advertise</Link>
                  <Link href="/dashboard/new" className="text-muted transition-colors hover:text-ink">List your startup</Link>
                  <Link href="/dashboard" className="text-muted transition-colors hover:text-ink">Dashboard</Link>
                </nav>
              </div>
              <p className="text-xs text-muted">© {year} {config.appName}</p>
            </div>
            <div aria-hidden className="pointer-events-none mt-6 select-none overflow-hidden">
              <p
                className="wrap translate-y-[18%] text-[clamp(5rem,22vw,17rem)] font-semibold leading-none tracking-[-0.05em]"
                style={{ color: "transparent", WebkitTextStroke: "1px rgb(var(--line))" }}
              >
                {config.appName.toUpperCase()}
              </p>
            </div>
          </footer>
        </MotionProvider>
      </body>
    </html>
  );
}
