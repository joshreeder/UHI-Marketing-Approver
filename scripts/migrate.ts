import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { scriptDb } from "./db";

async function main() {
  if (!process.env.DATABASE_URL) {
    // Lets `pnpm build` run without a database (CI, forks). Production always has DATABASE_URL.
    console.warn("DATABASE_URL is not set; skipping migrations.");
    process.exit(0);
  }
  const { db, kind } = scriptDb();
  if (kind === "neon") await migrateNeon(db as Parameters<typeof migrateNeon>[0], { migrationsFolder: "./drizzle" });
  else await migratePg(db as Parameters<typeof migratePg>[0], { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
