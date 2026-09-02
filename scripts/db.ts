import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/lib/db/schema";

/** Same driver selection as src/lib/db, for scripts run outside Next. */
export function scriptDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (/neon\.tech|\.neon\.build/.test(url)) return { db: drizzleNeon(neon(url), { schema }), kind: "neon" as const };
  return { db: drizzlePg(new Pool({ connectionString: url, max: 2 }), { schema }), kind: "pg" as const };
}
export { schema };
