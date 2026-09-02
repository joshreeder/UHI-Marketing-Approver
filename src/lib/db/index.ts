import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "@/lib/env";

/**
 * Neon's HTTP driver in production (serverless-friendly, no connection pooling to manage).
 * Any other Postgres (local dev, CI) goes through node-postgres.
 */
function isNeon(url: string) {
  return /neon\.tech|\.neon\.build/.test(url);
}

function createDb() {
  const url = env.DATABASE_URL;
  if (isNeon(url)) return drizzleNeon(neon(url), { schema });
  return drizzlePg(new Pool({ connectionString: url, max: 5 }), { schema });
}

export const db = createDb();
export type Db = ReturnType<typeof createDb>;
export { schema };
