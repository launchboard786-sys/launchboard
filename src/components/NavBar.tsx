"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, m, useMotionValueEvent, useScroll } from "motion/react";
import { api } from "@/lib/client";
import { Crown } from "./Crown";
import { Magnetic } from "./motion/Magnetic";

type User = { name: string; role: string } | null;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function NavBar({ appName, user }: { appName: string; user: User }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  // On the home page the header floats over the dark hero until you scroll.
  const overHero = pathname === "/" && !scrolled;

  const links = [
    { href: "/search", label: "Explore" },
    { href: "/hall-of-fame", label: "Hall of Fame" },
    { href: "/advertise", label: "Advertise" },
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
    ...(user ? [{ href: "/saved", label: "Saved" }, { href: "/dashboard", label: "Dashboard" }] : []),
  ];

  async function logout() {
    await api("/api/auth/logout");
    // Full load so no signed-in page stays cached in the browser.
    window.location.assign("/");
  }

  return (
    <>
      <m.header
        className={`sticky top-0 z-50 transition-colors duration-300 ${
          overHero ? "border-b border-transparent text-white" : "glass border-b border-line/70 text-ink"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className={`wrap flex items-center gap-5 transition-[height] duration-300 ease-out ${scrolled ? "h-14" : "h-[68px]"}`}>
          <Link prefetch={false} href="/" className="group flex shrink-0 items-center gap-2" aria-label={`${appName} home`}>
            <m.span whileHover={{ rotate: -8, scale: 1.08 }} transition={{ type: "spring", stiffness: 400, damping: 12 }} className={overHero ? "text-gold-hi" : "text-sponsor"}>
              <Crown size={22} />
            </m.span>
            <span className="text-[17px] font-semibold tracking-[0.2em]">{appName.toUpperCase()}</span>
          </Link>

          <form action="/search" className="ml-3 hidden flex-1 md:block" role="search">
            <label htmlFor="hdr-q" className="sr-only">Search businesses</label>
            <div className="relative max-w-sm">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-50" width="15" height="15" viewBox="0 0 16 16" aria-hidden>
                <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                id="hdr-q"
                name="q"
                placeholder="Search startups, ideas, cities…"
                className={`w-full rounded-full border py-2 pl-9 pr-4 text-sm outline-none transition-[background-color,border-color,box-shadow] duration-200 ${
                  overHero
                    ? "border-white/15 bg-white/[0.06] text-white placeholder:text-white/45 focus:border-white/40 focus:bg-white/[0.1]"
                    : "border-line bg-surface/80 text-ink placeholder:text-muted/70 focus:border-ink/40 focus:shadow-[0_0_0_4px_rgb(var(--ink)/0.06)]"
                }`}
              />
            </div>
          </form>

          <nav className="ml-auto flex items-center gap-1 text-sm font-medium" onMouseLeave={() => setHovered(null)}>
            {links.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link prefetch={false}
                  key={l.href}
                  href={l.href}
                  onMouseEnter={() => setHovered(l.href)}
                  className={`relative hidden rounded-full px-3 py-1.5 sm:block ${active ? "" : overHero ? "text-white/70 hover:text-white" : "text-ink/75 hover:text-ink"}`}
                  aria-current={active ? "page" : undefined}
                >
                  {(hovered === l.href || (active && !hovered)) && (
                    <m.span
                      layoutId="nav-pill"
                      className={`absolute inset-0 -z-10 rounded-full ${overHero ? "bg-white/10" : "bg-ink/[0.06]"}`}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {l.label}
                </Link>
              );
            })}
            {user ? (
              <button type="button" onClick={logout} className={`ml-1 rounded-full px-3 py-1.5 ${overHero ? "text-white/70 hover:text-white" : "text-ink/75 hover:text-ink"}`}>
                Log out
              </button>
            ) : (
              <>
                <Link prefetch={false} href="/login" className={`hidden rounded-full px-3 py-1.5 sm:block ${overHero ? "text-white/70 hover:text-white" : "text-ink/75 hover:text-ink"}`}>
                  Log in
                </Link>
                <Magnetic className="ml-1">
                  <Link prefetch={false}
                    href="/dashboard/new"
                    className={overHero ? "btn rounded-full bg-white px-4 text-[rgb(var(--obsidian))] hover:bg-white/90" : "btn-primary rounded-full px-4"}
                  >
                    <span className="sm:hidden">List startup</span>
                    <span className="hidden sm:inline">List your startup</span>
                  </Link>
                </Magnetic>
              </>
            )}
          </nav>
        </div>
      </m.header>
      <BottomNav pathname={pathname} signedIn={!!user} />
    </>
  );
}

/** Phone tab bar: the four places people go most, with a sliding active marker. */
function BottomNav({ pathname, signedIn }: { pathname: string; signedIn: boolean }) {
  const tabs = [
    { href: "/", label: "Home", icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> },
    { href: "/search", label: "Explore", icon: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></> },
    { href: "/advertise", label: "Rank up", icon: <path d="M4 18 5.6 8.2l3.6 3.6L12 5l2.8 6.8 3.6-3.6L20 18z" /> },
    {
      href: signedIn ? "/dashboard" : "/login",
      label: signedIn ? "You" : "Account",
      icon: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" /></>,
    },
  ];
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line/70 bg-bg/95 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-4">
        {tabs.map((t) => {
          const active = isActive(pathname, t.href) || (t.href === "/login" && pathname === "/signup") || (t.href === "/dashboard" && pathname === "/saved");
          return (
            <li key={t.label}>
              <Link prefetch={false} href={t.href} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${active ? "text-ink" : "text-muted"}`} aria-current={active ? "page" : undefined}>
                <AnimatePresence>
                  {active && (
                    <m.span layoutId="tab-marker" className="absolute top-0 h-[2px] w-8 rounded-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 36 }} />
                  )}
                </AnimatePresence>
                <m.svg whileTap={{ scale: 0.85 }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {t.icon}
                </m.svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
