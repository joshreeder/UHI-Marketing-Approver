import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** URL-safe random token. 32 bytes = 43 chars base64url. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Keyed hash so a leaked database cannot be used to forge sessions or links. */
export function hashToken(token: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}

export function tokensMatch(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
