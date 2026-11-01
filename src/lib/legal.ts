import { config } from "./config";

/**
 * Business details shown on the legal and contact pages.
 * These must match the details on your company registration and payment gateway (Razorpay/Stripe) KYC exactly.
 * Edit them here; every policy page picks them up. Empty values are simply not shown.
 */
export const business = {
  brand: config.appName,
  legalName: "Zyon Tech Solutions Private Limited",
  entityType: "a private limited company incorporated in India",
  /** Corporate Identity Number (MCA). Required on the website of every Indian company. */
  cin: "",
  gstin: "",
  email: "contact@zyontechsolutions.com",
  /** Offices shown on the Contact page. The first one is the registered office. */
  offices: [
    { label: "Registered office (India)", lines: ["Bengaluru, Karnataka", "India"], phone: "" },
    { label: "Canada", lines: ["Edmonton, Alberta", "Canada"], phone: "" },
  ],
  grievanceOfficer: { name: "Abdul Azeem", title: "Grievance Officer", email: "contact@zyontechsolutions.com" },
  /** Courts with jurisdiction over disputes. */
  jurisdiction: "Bengaluru, Karnataka, India",
  supportHours: "Monday to Saturday, 10:00 to 18:00 IST",
  /** Shown as "Last updated" on every policy. Change it whenever a policy changes. */
  lastUpdated: "2 November 2026",
};

export const registeredOffice = business.offices[0]!;
