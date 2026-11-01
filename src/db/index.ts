import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { poolConfig } from "./connection";

export type DB = NodePgDatabase<typeof schema>;
/** A transaction handle has the same query API as the db. */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DBOrTx = DB | Tx;

const globalForDb = globalThis as unknown as { __lbPool?: Pool; __lbDb?: DB };

function create(): DB {
  const pool =
    globalForDb.__lbPool ??
    new Pool(poolConfig());
  globalForDb.__lbPool = pool;
  return drizzle(pool, { schema });
}

/** Reused across hot reloads in development so connections don't leak. */
export const db: DB = globalForDb.__lbDb ?? create();
globalForDb.__lbDb = db;

export async function closeDb() {
  await globalForDb.__lbPool?.end();
  globalForDb.__lbPool = undefined;
  globalForDb.__lbDb = undefined;
}

export { schema };
