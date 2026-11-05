/**
 * Demo data: categories, an admin, a demo founder, ~60 fictional startups, votes,
 * a settled auction for the current week and open bids for next week.
 * Usage: npm run db:seed   (safe to re-run: wipes and recreates demo data)
 */
import { sql } from "drizzle-orm";
import { closeDb, db } from "./index";
import { businesses, categories, dailyStats, payments, users, votes } from "./schema";
import { hashPassword } from "../lib/auth";
import { placeBid, settleWeek } from "../lib/auction";
import { markPaymentPaid } from "../lib/payments";
import { addWeeks, currentWeek, istDay } from "../lib/week";

const CATS = [
  ["ai", "AI & Machine Learning", "Assistants, agents and models that do real work.", 150_000],
  ["saas", "SaaS & Productivity", "Software that helps teams get more done.", 100_000],
  ["fintech", "Fintech", "Payments, lending, wealth and money tools.", 150_000],
  ["d2c", "D2C & Consumer Brands", "New brands selling straight to you.", 80_000],
  ["health", "HealthTech", "Care, fitness and wellbeing, built better.", 100_000],
  ["edtech", "EdTech", "New ways to learn and teach.", 80_000],
  ["climate", "Climate & Energy", "Clean energy, recycling and sustainability.", 80_000],
  ["food", "Food & Beverage", "Kitchens, snacks, drinks and food delivery.", 50_000],
  ["mobility", "Mobility & Logistics", "Moving people and things, faster and cheaper.", 80_000],
  ["devtools", "Developer Tools", "APIs, infra and tools for builders.", 100_000],
  ["agritech", "Agritech", "Technology for farms and food supply chains.", 50_000],
  ["creator", "Creator Economy", "Tools and platforms for creators.", 50_000],
] as const;

type Seed = [name: string, tagline: string, city: string, stage: "IDEA" | "MVP" | "EARLY_REVENUE" | "GROWTH"];
const BIZ: Record<string, Seed[]> = {
  ai: [
    ["Saarthi AI", "A Hindi and English voice agent that answers your shop's phone calls", "Bangalore", "EARLY_REVENUE"],
    ["Lekha", "Turns messy invoices into clean GST-ready books in seconds", "Pune", "GROWTH"],
    ["Nuvo Vision", "Shelf-scanning AI that tells kirana stores what to restock", "Hyderabad", "MVP"],
    ["Tutorly", "An AI tutor that explains maths the way your teacher does", "Chennai", "EARLY_REVENUE"],
    ["PromptDesk", "Shared prompt library and evaluation for product teams", "Edmonton", "MVP"],
    ["Draftwise Legal", "Reviews rental and vendor contracts and flags risky clauses", "Mumbai", "IDEA"],
  ],
  saas: [
    ["Rotaboard", "Shift scheduling for clinics and restaurants, on WhatsApp", "Bangalore", "GROWTH"],
    ["Quotient CRM", "A simple CRM for agencies that live in email", "Kochi", "EARLY_REVENUE"],
    ["Ledgerly", "Approvals and spend tracking for 10–200 person teams", "Gurugram", "EARLY_REVENUE"],
    ["Formcraft", "Forms that fill themselves from your customer's last order", "Jaipur", "MVP"],
    ["Standup Bot", "Async standups in Slack with zero meetings", "Toronto", "GROWTH"],
  ],
  fintech: [
    ["Paisa Pocket", "Round-up savings into gold and index funds for first jobbers", "Mumbai", "GROWTH"],
    ["KhataPay", "Collect udhaar from customers with UPI reminders", "Indore", "EARLY_REVENUE"],
    ["Cred Circle", "Small-business credit lines based on your UPI history", "Bangalore", "MVP"],
    ["TaxNest", "Freelancer tax filing that takes ten minutes", "Delhi", "EARLY_REVENUE"],
    ["RemitEase", "Send money from Canada to India at the mid-market rate", "Edmonton", "MVP"],
  ],
  d2c: [
    ["Kora Living", "Handwoven cotton bedding direct from Kerala weavers", "Kochi", "GROWTH"],
    ["Mitti Clay Co", "Terracotta cookware made for modern kitchens", "Jaipur", "EARLY_REVENUE"],
    ["Bare Grain", "Millet breakfast cereals with no added sugar", "Bangalore", "EARLY_REVENUE"],
    ["Stride Lab", "Running shoes designed for Indian roads and feet", "Pune", "MVP"],
    ["Ghar Scents", "Incense and candles inspired by Indian monsoons", "Lucknow", "MVP"],
  ],
  health: [
    ["CareLoop", "Follow-up reminders and reports for clinics, on WhatsApp", "Bangalore", "GROWTH"],
    ["Physiq", "Guided physiotherapy at home with posture tracking", "Chennai", "EARLY_REVENUE"],
    ["SugarSense", "Diabetes coaching with a nutritionist in your language", "Ahmedabad", "MVP"],
    ["MedQueue", "Live OPD queue status so patients wait at home, not in the hall", "Hyderabad", "EARLY_REVENUE"],
    ["Calm Desi", "Therapy sessions in 9 Indian languages", "Delhi", "MVP"],
  ],
  edtech: [
    ["CodeChaupal", "Coding bootcamp for tier-2 cities, taught in Hindi", "Bhopal", "GROWTH"],
    ["Viva Prep", "Mock interviews with instant feedback for campus placements", "Pune", "EARLY_REVENUE"],
    ["Little Labs", "Science kits that ship monthly for ages 6–12", "Bangalore", "EARLY_REVENUE"],
    ["Bhasha Buddy", "Learn a new Indian language in 10 minutes a day", "Kolkata", "MVP"],
    ["ExamPulse", "Adaptive practice tests for state board exams", "Patna", "MVP"],
  ],
  climate: [
    ["SolarSathi", "Rooftop solar for homes with EMI and subsidy paperwork done for you", "Ahmedabad", "GROWTH"],
    ["ReLoop", "Doorstep recycling pickup that pays you per kilo", "Bangalore", "EARLY_REVENUE"],
    ["CoolRoof", "Heat-reflecting roof coating that cuts indoor temperature by 5°C", "Nagpur", "MVP"],
    ["Charge Grid", "Find and book EV chargers across India", "Delhi", "EARLY_REVENUE"],
    ["Carbon Khata", "Carbon accounting for small manufacturers", "Coimbatore", "IDEA"],
  ],
  food: [
    ["Tiffin Tales", "Home-cooked meal subscriptions from local home chefs", "Mumbai", "GROWTH"],
    ["Brew Brothers", "Single-origin Indian coffee, roasted to order", "Chikmagalur", "EARLY_REVENUE"],
    ["Cloud Dosa", "A delivery-only South Indian kitchen chain", "Bangalore", "EARLY_REVENUE"],
    ["Snackraft", "Healthy namkeen baked, not fried", "Indore", "MVP"],
    ["Chai Point Zero", "Sugar-free ready-to-drink masala chai", "Hyderabad", "MVP"],
  ],
  mobility: [
    ["Shiplane", "Same-day intercity delivery for D2C brands", "Bangalore", "GROWTH"],
    ["Ride Buddy", "Office carpooling with verified colleagues", "Pune", "EARLY_REVENUE"],
    ["FleetPulse", "GPS and fuel tracking for small truck fleets", "Chennai", "EARLY_REVENUE"],
    ["Pedal Hub", "E-bike rentals at metro stations", "Delhi", "MVP"],
    ["ColdChain Co", "Refrigerated last-mile delivery for pharmacies", "Hyderabad", "MVP"],
  ],
  devtools: [
    ["Deploydesk", "One-click deploys for Laravel and Node apps on Indian clouds", "Bangalore", "EARLY_REVENUE"],
    ["APIgate", "UPI, GST and Aadhaar-verification APIs with one key", "Mumbai", "GROWTH"],
    ["Logsmith", "Log search that costs a tenth of the big names", "Pune", "MVP"],
    ["TestPilot QA", "Record a user flow once, test it on 30 Android phones", "Noida", "EARLY_REVENUE"],
    ["Schema Studio", "Visual database design that writes your migrations", "Edmonton", "MVP"],
  ],
  agritech: [
    ["KisanLink", "Sell produce directly to restaurants at fair prices", "Nashik", "GROWTH"],
    ["SoilScan", "₹99 soil test results on your phone in 48 hours", "Ludhiana", "EARLY_REVENUE"],
    ["DroneKrishi", "Drone spraying on demand for small farms", "Guntur", "MVP"],
    ["Mandi Rates", "Live crop prices from 2,000 mandis in your language", "Rajkot", "EARLY_REVENUE"],
    ["AquaSense", "Water-quality sensors for fish and shrimp farms", "Nellore", "MVP"],
  ],
  creator: [
    ["ReelKit", "Turn one long video into 10 captioned reels automatically", "Mumbai", "GROWTH"],
    ["FanPass", "Paid communities and courses for regional creators", "Bangalore", "EARLY_REVENUE"],
    ["BrandMatch", "Matches micro-influencers with local brands", "Delhi", "EARLY_REVENUE"],
    ["PodYatra", "Podcast hosting and analytics built for Indian languages", "Chennai", "MVP"],
    ["ThumbStudio", "Thumbnail A/B testing for YouTube channels", "Hyderabad", "MVP"],
  ],
};

function rng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

async function main() {
  const rand = rng(42);
  console.log("Resetting tables…");
  await db.execute(sql`truncate table notifications, auth_tokens, users, categories, businesses, votes, wallets, ledger_entries, bids, settlements, placements, payments, daily_stats cascade`);

  const [admin] = await db.insert(users).values({ email: "admin@launchboard.dev", name: "Admin", passwordHash: await hashPassword("admin12345"), role: "ADMIN", emailVerifiedAt: new Date() }).returning();
  const [founder] = await db.insert(users).values({ email: "founder@launchboard.dev", name: "Demo Founder", passwordHash: await hashPassword("founder12345"), emailVerifiedAt: new Date() }).returning();
  const voterHash = await hashPassword("voter12345");
  const voters = await db
    .insert(users)
    .values(Array.from({ length: 80 }, (_, i) => ({ email: `voter${i + 1}@launchboard.dev`, name: `Voter ${i + 1}`, passwordHash: voterHash, emailVerifiedAt: new Date() })))
    .returning();
  const owners = await db
    .insert(users)
    .values(Array.from({ length: 30 }, (_, i) => ({ email: `owner${i + 1}@launchboard.dev`, name: `Owner ${i + 1}`, passwordHash: voterHash, emailVerifiedAt: new Date() })))
    .returning();
  console.log(`Users: admin, founder, ${voters.length} voters, ${owners.length} owners`);

  const cats = await db
    .insert(categories)
    .values(CATS.map(([slug, name, description, reservePaise], i) => ({ slug, name, description, reservePaise, sortOrder: i })))
    .returning();
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));

  const now = new Date();
  const created: { id: string; ownerId: string; categoryId: string; slug: string }[] = [];
  let ownerIdx = 0;
  for (const [catSlug, list] of Object.entries(BIZ)) {
    const cat = catBySlug.get(catSlug)!;
    for (const [i, [name, tagline, city, stage]] of list.entries()) {
      // The demo founder owns Saarthi AI and Ghar Scents so the dashboard has something to show.
      const ownerId = name === "Saarthi AI" || name === "Ghar Scents" ? founder!.id : owners[ownerIdx++ % owners.length]!.id;
      const daysAgo = Math.floor(rand() * 40) + (i === list.length - 1 ? 0 : 1);
      const approvedAt = new Date(now.getTime() - daysAgo * 86_400_000 - Math.floor(rand() * 20) * 3_600_000);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const [b] = await db
        .insert(businesses)
        .values({
          slug,
          ownerId,
          categoryId: cat.id,
          name,
          tagline,
          description: `${tagline}.\n\n${name} started in ${city} in ${2024 + Math.floor(rand() * 3)} after the founders saw the problem first-hand. ${
            stage === "GROWTH" ? "Thousands of customers use it every week, and the team is hiring." : stage === "EARLY_REVENUE" ? "It already has paying customers and is growing month on month." : "It's in early access. Join the waitlist to try it first."
          }\n\nThis is a demo listing with a fictional business.`,
          websiteUrl: `https://example.com/${slug}`,
          location: city,
          foundedYear: 2024 + Math.floor(rand() * 3),
          stage,
          status: "APPROVED",
          approvedAt,
        })
        .returning();
      created.push({ id: b!.id, ownerId, categoryId: cat.id, slug });
    }
  }
  // A couple of listings waiting for review, for the admin queue.
  for (const [name, tagline] of [["Bolt Notes", "Meeting notes that write your follow-up emails"], ["Kirana Cloud", "Inventory and billing for neighbourhood stores"]] as const) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await db.insert(businesses).values({
      slug, ownerId: owners[0]!.id, categoryId: catBySlug.get("saas")!.id, name, tagline,
      description: `${tagline}. A demo listing waiting for admin review.`, websiteUrl: `https://example.com/${slug}`,
      location: "Bangalore", foundedYear: 2026, stage: "MVP", status: "PENDING_REVIEW",
    });
  }
  console.log(`Businesses: ${created.length} live + 2 in review`);

  // Votes: skewed so some clearly trend.
  // Spread over the last five weeks so the Hall of Fame has past Startups of the Week.
  // Dates use their own random sequence so the rest of the demo data (bids, stats) stays the same.
  const when = rng(7);
  const voteRows: { userId: string; businessId: string; createdAt: Date }[] = [];
  for (const b of created) {
    const n = Math.floor(Math.pow(rand(), 2) * voters.length);
    const shuffled = [...voters].sort(() => rand() - 0.5).slice(0, n);
    const lean = when(); // some startups got most of their votes recently, others early on
    for (const v of shuffled) voteRows.push({ userId: v.id, businessId: b.id, createdAt: new Date(Date.now() - Math.pow(when(), 0.5 + lean * 2) * 35 * 86400_000) });
  }
  for (let i = 0; i < voteRows.length; i += 1000) await db.insert(votes).values(voteRows.slice(i, i + 1000));
  await db.execute(sql`update businesses b set vote_count = (select count(*) from votes v where v.business_id = b.id)`);
  console.log(`Votes: ${voteRows.length}`);

  // Fund every wallet through a real (mock) paid top-up so the ledger and admin totals are consistent.
  for (const b of created) {
    const [p] = await db
      .insert(payments)
      .values({ businessId: b.id, provider: "MOCK", purpose: "WALLET_TOPUP", amountPaise: 2_500_000, providerOrderId: `seed_${b.id}` })
      .returning();
    await markPaymentPaid({ provider: "MOCK", providerOrderId: p!.providerOrderId!, providerPaymentId: `seed_${b.id}`, amountMinor: 2_500_000 });
  }

  // Current week: bid as if it were last week, then settle, so placements are live now.
  const thisWeek = currentWeek(now);
  const lastWeekTime = new Date(addWeeks(thisWeek, -1).getTime() + 3 * 86_400_000);
  const nextWeekTime = new Date(Math.max(now.getTime(), thisWeek.getTime() + 60_000));
  let bidsPlaced = 0;
  for (const cat of cats) {
    const inCat = created.filter((b) => b.categoryId === cat.id);
    const bidders = inCat.filter(() => rand() < 0.8);
    for (const b of bidders) {
      const steps = Math.floor(rand() * 40);
      await placeBid({ userId: b.ownerId, businessId: b.id, amountPaise: cat.reservePaise + steps * 10_000, now: lastWeekTime });
      bidsPlaced++;
    }
  }
  const settled = await settleWeek(thisWeek, now);
  console.log(`This week: ${bidsPlaced} bids → ${settled.winners} placements, ₹${settled.revenuePaise / 100} revenue`);

  // Next week: open bids (demo founder's Saarthi AI is mid-table so the bid panel is interesting).
  let open = 0;
  for (const cat of cats) {
    for (const b of created.filter((x) => x.categoryId === cat.id && rand() < 0.6)) {
      const steps = Math.floor(rand() * 45);
      await placeBid({ userId: b.ownerId, businessId: b.id, amountPaise: cat.reservePaise + steps * 10_000, now: nextWeekTime });
      open++;
    }
  }
  console.log(`Next week: ${open} open bids`);

  // 28 days of stats.
  const statRows = [];
  for (const b of created) {
    const base = 20 + Math.floor(rand() * 120);
    for (let d = 0; d < 28; d++) {
      const day = istDay(new Date(now.getTime() - d * 86_400_000));
      const sponsoredDay = d < 7 && rand() < 0.9;
      const views = Math.floor(base * (0.6 + rand() * 0.8));
      statRows.push({
        businessId: b.id,
        day,
        pageViews: views,
        websiteClicks: Math.floor(views * (0.05 + rand() * 0.1)),
        sponsoredImpressions: sponsoredDay ? Math.floor(base * 8 * (0.7 + rand())) : 0,
        sponsoredClicks: sponsoredDay ? Math.floor(base * 0.4 * (0.5 + rand())) : 0,
      });
    }
  }
  for (let i = 0; i < statRows.length; i += 500) await db.insert(dailyStats).values(statRows.slice(i, i + 500));

  console.log("\nDemo logins:\n  admin@launchboard.dev / admin12345\n  founder@launchboard.dev / founder12345");
  void admin;
}

main()
  .then(() => closeDb())
  .catch(async (e) => {
    console.error(e);
    await closeDb();
    process.exit(1);
  });
