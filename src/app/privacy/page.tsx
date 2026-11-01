import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, OperatorBlock } from "@/components/LegalPage";
import { config } from "@/lib/config";
import { business } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy", description: `What ${config.appName} collects, why, and your rights.` };

export default function Page() {
  const b = business.brand;
  const g = business.grievanceOfficer;
  return (
    <LegalPage
      path="/privacy"
      title="Privacy Policy"
      intro={<p>
        This policy explains what personal data {b} collects, why, who we share it with and the choices you have. {b} is run by{" "}
        <strong>{business.legalName}</strong>, which is responsible for your data. That makes us the &quot;Data Fiduciary&quot; under India&apos;s Digital
        Personal Data Protection Act, 2023, and the organisation accountable for your data under Canada&apos;s PIPEDA and similar laws elsewhere. We collect as little as we need, we don&apos;t sell personal data, and we don&apos;t use advertising trackers.
      </p>}
      sections={[
        { id: "collect", title: "What we collect", body: <table>
          <thead><tr><th>Data</th><th>When</th><th>Why</th></tr></thead>
          <tbody>
            <tr><td>Name, email address, password (stored only as a secure one-way hash)</td><td>You create an account</td><td>To run your account, sign you in and send account emails</td></tr>
            <tr><td>Email confirmation and password-reset records</td><td>You confirm your email or reset your password</td><td>Security, and to stop fake accounts</td></tr>
            <tr><td>Business listings, logos and screenshots</td><td>You list a business</td><td>To publish your listing. Listings are public by design</td></tr>
            <tr><td>Your upvotes</td><td>You vote</td><td>To count votes and show you what you&apos;ve voted for. Other users can&apos;t see who voted</td></tr>
            <tr><td>Bids, wallet transactions and payment records (amount, status, payment reference)</td><td>You top up, bid or pay a fee</td><td>To run the auction, keep accounts and meet tax and legal duties</td></tr>
            <tr><td>Technical data: IP address, browser type, pages requested</td><td>You visit {b}</td><td>Security, preventing abuse and fixing errors. Kept in short-lived server logs</td></tr>
          </tbody>
        </table> },
        { id: "not-collect", title: "What we don't collect", body: <ul>
          <li><strong>Card and bank details.</strong> Payments are handled by Razorpay or Stripe on their own secure pages. We only receive a payment reference and its status.</li>
          <li><strong>Tracking for ads.</strong> We use no advertising or third-party analytics cookies. Listing view and click counts shown to founders are anonymous daily totals.</li>
          <li><strong>Photo location data.</strong> Uploaded images are re-saved without their hidden metadata (such as GPS location).</li>
        </ul> },
        { id: "cookies", title: "Cookies", body: <p>
          We use one essential cookie, <code>lb_session</code>, to keep you signed in for up to 30 days. It can&apos;t be read by other websites and isn&apos;t
          used for tracking. Payment pages run by our payment partners may set their own cookies under their policies.
        </p> },
        { id: "sharing", title: "Who we share data with", body: <>
          <p>We share data only with service providers that help us run {b}, under contracts that limit their use of it to providing their service:</p>
          <ul>
            <li><strong>Vercel</strong>: website hosting.</li>
            <li><strong>Supabase</strong>: database and image storage (servers in the European Union).</li>
            <li><strong>Resend</strong>: sending account emails.</li>
            <li><strong>Razorpay</strong> and <strong>Stripe</strong>: processing payments.</li>
          </ul>
          <p>We may also disclose data when required by Indian law, a court or a government authority, or to protect users and {b} from fraud or harm.
          If {b} is sold or merged, data may transfer to the new owner under this policy.</p>
        </> },
        { id: "transfers", title: "Where your data is stored", body: <p>
          We serve users in India, Canada and other countries, and our providers store data in the European Union and the United States, so your data
          may be processed outside the country where you live. Privacy laws there may differ from yours. We choose providers with strong security practices,
          bind them by contract to protect your data, and transfer data only as the laws that apply to us allow.
        </p> },
        { id: "retention", title: "How long we keep it", body: <ul>
          <li>Account and listing data: while your account is open. When you ask us to delete your account, we delete or anonymise it within 30 days.</li>
          <li>Payment and wallet records: for 8 years, as required by Indian tax and accounting laws, even after your account is deleted.</li>
          <li>Email confirmation and reset links: they expire within 24 hours and 1 hour respectively.</li>
          <li>Server logs: kept briefly by our hosting provider, usually days to a few weeks.</li>
        </ul> },
        { id: "security", title: "How we protect it", body: <p>
          Passwords are hashed, connections are encrypted (HTTPS), databases are access-controlled, and payment details never reach our servers.
          No system is perfectly secure; if a breach affects your personal data, we will inform you and the authorities as the law requires.
        </p> },
        { id: "rights", title: "Your rights", body: <>
          <p>Wherever you live, you can:</p>
          <ul>
            <li>ask what personal data we hold about you and how it is used;</li>
            <li>correct or update it (most of it you can edit yourself in your dashboard);</li>
            <li>ask us to delete your account and personal data, subject to the legal record-keeping above;</li>
            <li>withdraw your consent at any time (this means closing your account, as we can&apos;t run it without the data);</li>
            <li>nominate someone to exercise these rights if you die or become unable to;</li>
            <li>complain to our Grievance Officer, and then to your data protection authority (see below).</li>
          </ul>
          <p>To use any of these rights, email <a href={`mailto:${g.email}`}>{g.email}</a> from the email address on your account. We reply within 30 days.</p>
        </> },
        { id: "regional", title: "Extra rights where you live", body: <>
          <h3>India</h3>
          <p>You have the rights of a Data Principal under the Digital Personal Data Protection Act, 2023, including nominating someone to act for you.
          If our Grievance Officer doesn&apos;t resolve your complaint, you can approach the Data Protection Board of India.</p>
          <h3>Canada</h3>
          <p>Under the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable provincial laws, we collect, use and disclose
          your personal information only with your consent and for the purposes above. You can access and correct it, and withdraw consent subject to legal
          or contractual limits. Our Grievance Officer is also our privacy contact for Canada. If you&apos;re not satisfied with our answer, you can complain
          to the Office of the Privacy Commissioner of Canada (priv.gc.ca) or your provincial privacy commissioner.</p>
          <h3>European Union and United Kingdom</h3>
          <p>We rely on your consent and on the need to run the service you signed up for (contract), and on our legitimate interest in keeping {b} secure.
          You can also object to processing, ask us to restrict it, receive your data in a portable format, and complain to your local data protection authority.</p>
        </> },
        { id: "children", title: "Children", body: <p>
          {b} is for adults. You must be 18 or older (or the age of majority where you live, if higher) to create an account, and we do not knowingly collect personal data from children.
          If you believe a child has created an account, contact us and we will delete it.
        </p> },
        { id: "changes", title: "Changes to this policy", body: <p>
          If we change this policy in a meaningful way, we will tell you by email or on the site before the change applies. The date at the top
          shows the latest version.
        </p> },
        { id: "contact", title: "Grievance Officer and contact", body: <>
          <p>{g.name}, {g.title}<br />Email: <a href={`mailto:${g.email}`}>{g.email}</a></p>
          <OperatorBlock />
          <p>See also our <Link prefetch={false} href="/terms">Terms of Service</Link>.</p>
        </> },
      ]}
    />
  );
}
