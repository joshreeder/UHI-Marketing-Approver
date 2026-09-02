/**
 * Runtime env access with helpful errors. Only DATABASE_URL and SESSION_SECRET are
 * hard requirements; email and blob degrade to console logging / errors at call time.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  }
  return v;
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get SESSION_SECRET() {
    return required("SESSION_SECRET");
  },
  get APP_URL() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get RESEND_API_KEY() {
    return process.env.RESEND_API_KEY ?? "";
  },
  get EMAIL_FROM() {
    return process.env.EMAIL_FROM || "Approval Hub <onboarding@resend.dev>";
  },
  get CRON_SECRET() {
    return process.env.CRON_SECRET ?? "";
  },
  get RESEND_WEBHOOK_SECRET() {
    return process.env.RESEND_WEBHOOK_SECRET ?? "";
  },
  get BLOB_READ_WRITE_TOKEN() {
    return process.env.BLOB_READ_WRITE_TOKEN ?? "";
  },
};
