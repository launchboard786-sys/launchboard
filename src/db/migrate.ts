import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { poolConfig } from "./connection";

/** Apply SQL migrations in ./drizzle. Usage: npm run db:migrate */
export async function runMigrations(url = process.env.DATABASE_URL) {
  const pool = new Pool(poolConfig(url, 1));
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  runMigrations()
    .then(() => console.log("Migrations applied."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
