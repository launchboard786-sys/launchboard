import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, OperatorBlock } from "@/components/LegalPage";
import { config } from "@/lib/config";
import { business } from "@/lib/legal";
import { formatINR } from "@/lib/money";

export const metadata: Metadata = { title: "Terms of Service", description: `The rules for using ${config.appName}.` };

export default function Page() {
  const b = business.brand;
  const L = (href: string, t: string) => <Link prefetch={false} href={href}>{t}</Link>;
  return (
    <LegalPage
      path="/terms"
      title="Terms of Service"
      intro={<p>
        These terms are an agreement between you and <strong>{business.legalName}</strong>, {business.entityType}
        (&quot;we&quot;, &quot;us&quot;), which runs {b} for users in India, Canada and worldwide. By creating an account or using {b} you agree to them.
        Please also read our {L("/privacy", "Privacy Policy")} and {L("/refunds", "Refund Policy")}, which are part of these terms.
      </p>}
      sections={[
        { id: "service", title: "What " + b + " is", body: <>
          <p>{b} is a website where new startups and businesses are listed so people can discover them. Visitors can upvote listings.
          Businesses can also bid each week for clearly labelled <strong>Sponsored</strong> positions in a category.</p>
          <p><strong>Organic rankings are decided by votes and are never for sale.</strong> Paying for a sponsored position never changes a
          business&apos;s organic rank, and every paid position is labelled &quot;Sponsored&quot;.</p>
        </> },
        { id: "accounts", title: "Your account", body: <ul>
          <li>You must be at least 18 years old (or the age of majority where you live, if higher) and able to enter a binding contract.</li>
          <li>Give accurate details and keep your password private. You are responsible for activity on your account.</li>
          <li>One person may hold one account. Accounts may not be sold or transferred.</li>
          <li>We may ask you to confirm your email address before you can vote or list a business.</li>
        </ul> },
        { id: "listings", title: "Listing a business", body: <>
          <ul>
            <li>You may list only a business you own or are authorised to represent.</li>
            <li>Everything in a listing (name, description, links, logo and screenshots) must be accurate, lawful and yours to use.</li>
            <li>The first {config.freeListingLimit.toLocaleString("en-IN")} listings on {b} are free. After that a one-time listing fee of{" "}
              {formatINR(config.listingFeePaise)} applies, shown before you pay.</li>
            <li>We review every listing before it appears publicly, and may reject or remove a listing that breaks these terms. If we reject a
              listing whose fee you paid, we refund the fee as described in the {L("/refunds", "Refund Policy")}.</li>
            <li>Changing an approved listing&apos;s name or website sends it back for a quick review.</li>
          </ul>
          <p>You keep ownership of your content. You give us a non-exclusive, royalty-free, worldwide licence to host, display, resize and
          share it on {b} and in promoting {b}, for as long as it is listed and for a reasonable time after removal.</p>
        </> },
        { id: "votes", title: "Votes and fair play", body: <>
          <p>Each account can upvote a business once and can remove its vote. Votes must reflect real interest. You must not:</p>
          <ul>
            <li>use bots, scripts, fake or duplicate accounts to vote;</li>
            <li>buy, sell or trade votes, or offer rewards for votes;</li>
            <li>vote for your own business (this is blocked) or coordinate others to manipulate rankings.</li>
          </ul>
          <p>We may remove votes we believe are not genuine, and suspend accounts or listings involved.</p>
        </> },
        { id: "sponsored", title: "Sponsored positions and bidding", body: <>
          <ul>
            <li><strong>Weekly auctions.</strong> Each category has Sponsored Top 10, Top 50 and Top 100 positions. A week runs from Monday 00:00
              to Sunday 23:59 India Standard Time. Bids placed during one week compete for the <em>next</em> week&apos;s positions, and that
              auction closes when the next week begins (Monday 00:00 IST).</li>
            <li><strong>Bids.</strong> A bid is the amount you pay for the whole week if you win. Bids are in steps of{" "}
              {formatINR(config.bidStepPaise)}, must meet the category&apos;s minimum, and can only be raised, not lowered or withdrawn, while the
              auction is open.</li>
            <li><strong>Funds.</strong> Bids are paid from your business wallet. Placing a bid holds that amount. When the auction closes, the highest
              bids win positions in order (ties go to the earlier bid); winners are charged their own bid and every other held amount is released
              to the wallet in full.</li>
            <li><strong>Display.</strong> Winning businesses appear as labelled sponsored placements in their category for that week.
              We do not guarantee any number of views, clicks, votes or customers.</li>
            <li>If we fail to show a placement you paid for because of our error, we will credit your wallet for the time it was missing.</li>
          </ul>
        </> },
        { id: "wallet", title: "Wallet and payments", body: <ul>
          <li>Wallet top-ups are prepaid credit for {b} only. The minimum top-up is {formatINR(config.minTopupPaise)}.
            Wallet balances earn no interest and cannot be transferred to another business or person.</li>
          <li>Payments are processed by our payment partners (Razorpay, and Stripe for some cards). We never see or store your full card or
            bank details.</li>
          <li>Prices are in Indian Rupees (₹) and include any applicable taxes unless stated otherwise at checkout. If you pay in another currency,
            your bank or card issuer sets the exchange rate and may add its own fees.</li>
          <li>Refunds of unused balance and listing fees follow the {L("/refunds", "Refund Policy")}.</li>
        </ul> },
        { id: "prohibited", title: "Things you must not do", body: <ul>
          <li>List or upload anything illegal, misleading, defamatory, obscene, hateful, infringing, or that promotes gambling, weapons,
            drugs, adult content, pyramid schemes or financial fraud.</li>
          <li>Upload malware, or try to break, overload, scrape at scale, or get around the security or limits of {b}.</li>
          <li>Impersonate another person or business, or use another business&apos;s name or trademarks without permission.</li>
          <li>Use {b} to send spam or collect other users&apos; personal data.</li>
        </ul> },
        { id: "ip", title: "Our content and brand", body: <p>
          The {b} name, logo, design and software belong to us. You may link to {b} and share listing pages, but you may not copy the site
          or use our brand in a way that suggests we endorse you.
        </p> },
        { id: "disclaimer", title: "No endorsement or advice", body: <p>
          Listings are written by the businesses themselves. We review them for obvious problems but do not verify every claim, and a listing,
          rank or sponsored placement is not our endorsement. Do your own checks before buying from, investing in or working with any business
          you find on {b}. {b} is provided &quot;as is&quot;, and we do not promise it will always be available or error-free.
        </p> },
        { id: "liability", title: "Limits on our liability", body: <>
          <p>To the extent the law allows, we are not liable for indirect or consequential losses such as lost profits, revenue or data, and our
          total liability to you for any claim is limited to the amount you paid us in the 12 months before the claim.</p>
          <p>Nothing in these terms limits liability that cannot legally be limited, or takes away rights you have under consumer protection laws
          that apply to you, such as India&apos;s Consumer Protection Act, 2019 or the consumer protection laws of your Canadian province.</p>
          <p>You agree to compensate us for losses caused by content you post or by your breach of these terms.</p>
        </> },
        { id: "termination", title: "Suspension and closing your account", body: <p>
          You can stop using {b} at any time and ask us to delete your account (see the {L("/privacy", "Privacy Policy")}). We may suspend or close
          accounts and remove listings that break these terms or the law, telling you why where we can. If we close your account without you
          having broken these terms, we will refund any unused wallet balance.
        </p> },
        { id: "changes", title: "Changes to these terms", body: <p>
          We may update these terms. If a change is significant we will tell you by email or on the site before it takes effect. Continuing to use
          {" "}{b} after that means you accept the new terms.
        </p> },
        { id: "law", title: "Governing law and disputes", body: <>
          <p>These terms are governed by the laws of India. Please contact us first so we can try to resolve any problem. If we can&apos;t, the courts at{" "}
          {business.jurisdiction} have jurisdiction.</p>
          <p><strong>If you live outside India</strong> (for example in Canada), you keep the protection of any mandatory consumer laws of where you live,
          and you may bring a claim in your local courts or consumer bodies where those laws allow it. Nothing in this section takes those rights away.</p>
        </> },
        { id: "contact", title: "Contact and grievances", body: <>
          <p>Questions or complaints about these terms or any content on {b} can be sent to our Grievance Officer,{" "}
          {business.grievanceOfficer.name}, at <a href={`mailto:${business.grievanceOfficer.email}`}>{business.grievanceOfficer.email}</a>.
          We acknowledge complaints within 48 hours and aim to resolve them within one month.</p>
          <OperatorBlock />
        </> },
      ]}
    />
  );
}
