import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { geist, geistMono } from "./fonts";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { NavProgress } from "@/components/NavProgress";
import { Crown } from "@/components/Crown";
import { MotionProvider } from "@/components/motion/Provider";
import { config } from "@/lib/config";
import { business } from "@/lib/legal";

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
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
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
                <nav className="grid grid-cols-2 gap-x-12 gap-y-0.5 text-sm">
                  <Link prefetch={false} href="/search" className="inline-block py-1.5 text-muted transition-colors hover:text-ink">Explore</Link>
                  <Link prefetch={false} href="/advertise" className="inline-block py-1.5 text-muted transition-colors hover:text-ink">Advertise</Link>
                  <Link prefetch={false} href="/dashboard/new" className="inline-block py-1.5 text-muted transition-colors hover:text-ink">List your startup</Link>
                  <Link prefetch={false} href="/dashboard" className="inline-block py-1.5 text-muted transition-colors hover:text-ink">Dashboard</Link>
                </nav>
              </div>
              <div className="flex flex-col gap-3 border-t border-line pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
                <p>© {year} {business.legalName}. {config.appName} is operated by {business.legalName}.</p>
                <nav aria-label="Legal" className="flex flex-wrap gap-x-4">
                  {[["/terms", "Terms"], ["/privacy", "Privacy"], ["/refunds", "Refunds"], ["/delivery", "Delivery"], ["/contact", "Contact"]].map(([href, label]) => (
                    <Link key={href} prefetch={false} href={href!} className="inline-block py-1.5 transition-colors hover:text-ink">{label}</Link>
                  ))}
                </nav>
              </div>
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
