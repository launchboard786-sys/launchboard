import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { Header } from "@/components/Header";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: `${config.appName}: discover new startups`, template: `%s · ${config.appName}` },
  description: "Discover new startups and businesses before everyone else. Upvote what you like.",
  metadataBase: new URL(config.appUrl),
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#11161e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-line">
          <div className="wrap flex flex-col gap-3 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {config.appName}. Sponsored listings are always labelled. Organic rankings are never for sale.
            </p>
            <nav className="flex gap-4">
              <Link href="/advertise" className="hover:text-ink">Advertise</Link>
              <Link href="/dashboard/new" className="hover:text-ink">List your startup</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
