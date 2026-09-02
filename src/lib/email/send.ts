import "server-only";
import { Resend } from "resend";
import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { env } from "@/lib/env";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string | string[];
  /** Resend tags, echoed back in webhooks (e.g. approval_id) so opens can be attributed. */
  tags?: Record<string, string>;
};

export type SendResult = { ok: true; id: string | null; skipped?: boolean } | { ok: false; error: string };

let client: Resend | null = null;
function resend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  client ??= new Resend(env.RESEND_API_KEY);
  return client;
}

/**
 * Sends a branded email through Resend. Without RESEND_API_KEY it renders the message
 * to the server log instead so the full flow works in local development.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  const text = await render(input.react, { plainText: true });
  const api = resend();
  if (!api) {
    console.info(`\n[email:dev] To: ${to.join(", ")}\n[email:dev] Subject: ${input.subject}\n${text}\n`);
    return { ok: true, id: null, skipped: true };
  }
  const html = await render(input.react);
  const { data, error } = await api.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: input.subject,
    html,
    text,
    replyTo: input.replyTo,
    tags: input.tags ? Object.entries(input.tags).map(([name, value]) => ({ name, value: value.replace(/[^a-zA-Z0-9_-]/g, "_") })) : undefined,
  });
  if (error) {
    console.error("[email] send failed", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data?.id ?? null };
}

/** Sends pre-rendered HTML (a copy version) as a test to one recipient. */
export async function sendCopyTest(input: { to: string; subject: string; fromName?: string | null; html: string }): Promise<SendResult> {
  const api = resend();
  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1F2933;max-width:640px;margin:0 auto;padding:24px">${input.html}</body></html>`;
  if (!api) {
    console.info(`\n[email:dev] TEST To: ${input.to}\n[email:dev] Subject: ${input.subject}\n${input.html}\n`);
    return { ok: true, id: null, skipped: true };
  }
  const fromAddress = env.EMAIL_FROM.match(/<([^>]+)>/)?.[1] ?? env.EMAIL_FROM;
  const { data, error } = await api.emails.send({
    from: input.fromName ? `${input.fromName.replace(/[<>"]/g, "")} <${fromAddress}>` : env.EMAIL_FROM,
    to: [input.to],
    subject: `[Test] ${input.subject}`,
    html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id ?? null };
}
