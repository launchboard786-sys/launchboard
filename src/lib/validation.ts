import { z } from "zod";
import { config } from "./config";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

export const httpUrl = z
  .string()
  .trim()
  .max(300)
  .url("Enter a full URL starting with https://")
  .refine((u) => /^https?:\/\//i.test(u), "The URL must start with http:// or https://");

export const signupSchema = z.object({
  name: trimmed(2, 80, "Name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const currentYear = new Date().getFullYear();

export const listingSchema = z.object({
  name: trimmed(2, 80, "Business name"),
  tagline: trimmed(10, 120, "Tagline"),
  description: trimmed(40, 3000, "Description"),
  websiteUrl: httpUrl,
  logoUrl: z.union([httpUrl, z.literal("")]).optional().transform((v) => v || null),
  location: trimmed(2, 80, "Location"),
  foundedYear: z.coerce.number().int().min(1990, "Founded year looks too early.").max(currentYear, "Founded year can't be in the future."),
  stage: z.enum(["IDEA", "MVP", "EARLY_REVENUE", "GROWTH"]),
  categoryId: z.string().min(1, "Choose a category."),
});
export type ListingInput = z.infer<typeof listingSchema>;

export const bidSchema = z.object({
  businessId: z.string().min(1),
  /** Rupees from the form; converted to paise on the server. */
  amountRupees: z.coerce.number().positive("Enter a bid amount.").max(5_000_000),
});

export const checkoutSchema = z.object({
  businessId: z.string().min(1),
  purpose: z.enum(["WALLET_TOPUP", "LISTING_FEE"]),
  provider: z.enum(["RAZORPAY", "STRIPE", "MOCK"]),
  amountRupees: z.coerce.number().positive().max(5_000_000).optional(),
});

export const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

export const categorySchema = z.object({
  name: trimmed(2, 60, "Name"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, "Slug can use lowercase letters, numbers and dashes."),
  description: trimmed(5, 200, "Description"),
  reserveRupees: z.coerce
    .number()
    .int()
    .min(100, "Minimum bid must be at least ₹100.")
    .max(1_000_000)
    .refine((r) => (r * 100) % config.bidStepPaise === 0, `Minimum bid must be a multiple of the bid step (₹${config.bidStepPaise / 100}).`),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const refundSchema = z.object({
  businessId: z.string().min(1),
  amountRupees: z.coerce.number().positive(),
  note: trimmed(3, 200, "Note"),
});
