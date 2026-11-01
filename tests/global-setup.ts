import { Pool } from "pg";
import { runMigrations } from "../src/db/migrate";

/** Fresh schema for every test run. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/launchboard_test";
  const pool = new Pool({ connectionString: url, max: 1 });
  await pool.query("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await pool.end();
  await runMigrations(url);
}
