import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { scriptDb } from "./db";

async function main() {
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
