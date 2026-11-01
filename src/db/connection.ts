import type { PoolConfig } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "host.docker.internal"]);

/**
 * Build pg pool settings from DATABASE_URL.
 * Hosted Postgres (Supabase, Neon, RDS) needs SSL; their certificate chains often aren't in
 * Node's trust store, so for remote hosts we encrypt the connection without verifying the chain.
 * Set DATABASE_SSL=verify to require full verification (e.g. with NODE_EXTRA_CA_CERTS),
 * or DATABASE_SSL=off for a private network database.
 */
export function poolConfig(url = process.env.DATABASE_URL, max = Number(process.env.DB_POOL_MAX || 5)): PoolConfig {
  if (!url) throw new Error("DATABASE_URL is not set");
  const u = new URL(url);
  const mode = (process.env.DATABASE_SSL || "").toLowerCase();
  // sslmode in the URL would override our ssl settings inside pg, so we strip it and decide here.
  u.searchParams.delete("sslmode");
  u.searchParams.delete("sslrootcert");
  const isLocal = LOCAL_HOSTS.has(u.hostname);
  let ssl: PoolConfig["ssl"] = false;
  if (mode === "verify") ssl = { rejectUnauthorized: true };
  else if (mode !== "off" && !isLocal) ssl = { rejectUnauthorized: false };
  return { connectionString: u.toString(), ssl, max };
}
