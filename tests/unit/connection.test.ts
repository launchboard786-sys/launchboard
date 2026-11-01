import { afterEach, describe, expect, it } from "vitest";
import { poolConfig } from "@/db/connection";

afterEach(() => { delete process.env.DATABASE_SSL; });

describe("poolConfig", () => {
  it("no SSL for a local database", () => {
    expect(poolConfig("postgresql://u:p@localhost:5432/db").ssl).toBe(false);
  });
  it("encrypted, unverified SSL for Supabase pooler and strips sslmode", () => {
    const c = poolConfig("postgresql://postgres.abc:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require");
    expect(c.ssl).toEqual({ rejectUnauthorized: false });
    expect(c.connectionString).not.toContain("sslmode");
    expect(c.connectionString).toContain(":6543/postgres");
  });
  it("DATABASE_SSL=verify forces full verification; off disables", () => {
    process.env.DATABASE_SSL = "verify";
    expect(poolConfig("postgresql://u:p@db.example.com/x").ssl).toEqual({ rejectUnauthorized: true });
    process.env.DATABASE_SSL = "off";
    expect(poolConfig("postgresql://u:p@db.example.com/x").ssl).toBe(false);
  });
  it("keeps URL-encoded passwords intact", () => {
    const c = poolConfig("postgresql://u:p%40ss%23word@db.example.com/x");
    expect(c.connectionString).toContain("p%40ss%23word");
  });
});
