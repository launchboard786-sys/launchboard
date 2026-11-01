import { describe, expect, it } from "vitest";
import { categorySchema, listingSchema, signupSchema } from "@/lib/validation";

const listing = {
  name: "Acme", tagline: "Robots that sort recycling", description: "x".repeat(50), websiteUrl: "https://acme.example",
  location: "Pune", foundedYear: 2025, stage: "MVP", categoryId: "c1",
};

describe("validation", () => {
  it("rejects non-http website URLs (javascript:, ftp:)", () => {
    expect(listingSchema.safeParse({ ...listing, websiteUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...listing, websiteUrl: "ftp://x.y" }).success).toBe(false);
    expect(listingSchema.safeParse(listing).success).toBe(true);
  });
  it("turns an empty logo URL into null", () => {
    const r = listingSchema.parse({ ...listing, logoUrl: "" });
    expect(r.logoUrl).toBeNull();
  });
  it("rejects future founded years", () => {
    expect(listingSchema.safeParse({ ...listing, foundedYear: new Date().getFullYear() + 1 }).success).toBe(false);
  });
  it("normalises signup email", () => {
    expect(signupSchema.parse({ name: "Ab", email: "  A@B.CO ", password: "12345678" }).email).toBe("a@b.co");
  });
  it("requires category minimum bid to be a multiple of the step", () => {
    const base = { name: "AI", slug: "ai", description: "Artificial intelligence", sortOrder: 0 };
    expect(categorySchema.safeParse({ ...base, reserveRupees: 750 }).success).toBe(false);
    expect(categorySchema.safeParse({ ...base, reserveRupees: 800 }).success).toBe(true);
  });
});
