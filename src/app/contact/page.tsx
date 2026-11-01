import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { config } from "@/lib/config";
import { business } from "@/lib/legal";

export const metadata: Metadata = { title: "Contact us", description: `How to reach the ${config.appName} team.` };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-line bg-surface p-5">
      <div className="kicker">{title}</div>
      <div className="mt-2 text-[15px] leading-relaxed text-ink/85 [&_p]:mt-1">{children}</div>
    </div>
  );
}

export default function Page() {
  const g = business.grievanceOfficer;
  return (
    <LegalPage
      path="/contact"
      title="Contact us"
      intro={<p>Questions about a listing, a payment, a refund, or something that looks wrong? We&apos;re happy to help.</p>}
      sections={[
        { id: "reach", title: "Reach us", body: (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Card title="Email">
              <a href={`mailto:${business.email}`} className="font-semibold">{business.email}</a>
              <p className="mt-1 text-sm text-muted">We reply within 1 working day. {business.supportHours}.</p>
            </Card>
            {business.offices.map((o, i) => (
              <Card key={o.label} title={o.label}>
                {i === 0 && <><strong>{business.legalName}</strong><br /></>}
                {o.lines.map((l) => <span key={l}>{l}<br /></span>)}
                {o.phone && <a href={`tel:${o.phone.replace(/\s/g, "")}`} className="mt-1 inline-block font-semibold">{o.phone}</a>}
                {i === 0 && (business.cin || business.gstin) && (
                  <p className="text-sm text-muted">{business.cin && <>CIN: {business.cin}<br /></>}{business.gstin && <>GSTIN: {business.gstin}</>}</p>
                )}
              </Card>
            ))}
            <Card title="Grievance Officer">
              <strong>{g.name}</strong><br />
              <a href={`mailto:${g.email}`}>{g.email}</a>
              <p className="mt-1 text-sm text-muted">Complaints acknowledged within 48 hours, resolved within one month.</p>
            </Card>
          </div>
        ) },
        { id: "faster", title: "Get a faster answer", body: <ul>
          <li>Write from the email address on your {business.brand} account.</li>
          <li>Include your business name and, for payments, the payment reference from your dashboard.</li>
          <li>For refunds, see the <Link prefetch={false} href="/refunds">Refund Policy</Link> first. It answers most questions.</li>
        </ul> },
      ]}
    />
  );
}
