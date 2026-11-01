import Link from "next/link";
import { business, registeredOffice } from "@/lib/legal";

export type Section = { id: string; title: string; body: React.ReactNode };

const PAGES = [
  ["/terms", "Terms of Service"],
  ["/privacy", "Privacy Policy"],
  ["/refunds", "Refunds & Cancellations"],
  ["/delivery", "Delivery Policy"],
  ["/contact", "Contact us"],
] as const;

/** Shared layout for policy pages: readable column, a contents list, and links between policies. */
export function LegalPage({ path, title, intro, sections }: { path: string; title: string; intro: React.ReactNode; sections: Section[] }) {
  return (
    <div className="wrap max-w-5xl pt-12">
      <p className="kicker">Legal</p>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.04em]">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {business.lastUpdated}</p>

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <article className="legal min-w-0 [overflow-wrap:anywhere]">
          <div className="text-[17px] leading-relaxed text-ink/85">{intro}</div>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2>{i + 1}. {s.title}</h2>
              {s.body}
            </section>
          ))}
        </article>

        <aside className="order-first flex min-w-0 flex-col gap-6 self-start text-sm lg:sticky lg:top-24 lg:order-none">
          {sections.length > 3 && (
            <nav aria-label="On this page" className="hidden rounded-[14px] border border-line bg-surface p-4 lg:block">
              <p className="kicker mb-2">On this page</p>
              <ol className="flex flex-col">
                {sections.map((s, i) => (
                  <li key={s.id}><a href={`#${s.id}`} className="block py-1 text-muted hover:text-ink">{i + 1}. {s.title}</a></li>
                ))}
              </ol>
            </nav>
          )}
          <nav aria-label="Policies" className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0 lg:px-0">
            {PAGES.map(([href, label]) => (
              <Link
                key={href}
                prefetch={false}
                href={href}
                aria-current={href === path ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 lg:rounded-none lg:border-0 lg:px-0 lg:py-1.5 ${href === path ? "border-ink bg-ink text-bg lg:bg-transparent lg:font-semibold lg:text-ink" : "border-line text-muted hover:text-ink"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}

/** The operator's identity block, used at the end of several policies. */
export function OperatorBlock() {
  const ro = registeredOffice;
  return (
    <address className="not-italic">
      <strong>{business.legalName}</strong> ({business.brand})<br />
      Registered office: {ro.lines.join(", ")}<br />
      {business.cin && <>CIN: {business.cin}<br /></>}
      {business.gstin && <>GSTIN: {business.gstin}<br /></>}
      Email: <a href={`mailto:${business.email}`}>{business.email}</a>
      {ro.phone && <><br />Phone: <a href={`tel:${ro.phone.replace(/\s/g, "")}`}>{ro.phone}</a></>}
    </address>
  );
}
