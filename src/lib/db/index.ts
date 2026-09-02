import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "@/lib/env";

/**
 * Neon's HTTP driver in production (serverless-friendly, no connection pooling to manage).
 * Any other Postgres (local dev, CI) goes through node-postgres.
 *
 * The client is created lazily on first use so importing this module during `next build`
 * (page-data collection) does not require DATABASE_URL.
 */
function isNeon(url: string) {
  return /neon\.tech|\.neon\.build/.test(url);
}

type Db = ReturnType<typeof drizzleNeon<typeof schema>>;

function createDb(): Db {
  const url = env.DATABASE_URL;
  if (isNeon(url)) return drizzleNeon(neon(url), { schema });
  // Same query API; the node-postgres instance is structurally compatible for our usage.
  return drizzlePg(new Pool({ connectionString: url, max: 5 }), { schema }) as unknown as Db;
}

let instance: Db | null = null;

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    instance ??= createDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export type { Db };
export { schema };
