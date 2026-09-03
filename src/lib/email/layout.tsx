import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

const navy = "#004888";
const ink = "#1F2933";
const slate = "#52606D";
const line = "#E4E7EB";
const canvas = "#F7F8FA";

export const emailStyles = {
  body: { backgroundColor: canvas, fontFamily: "Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif", margin: 0, padding: "24px 0" },
  container: { backgroundColor: "#FFFFFF", border: `1px solid ${line}`, borderRadius: 12, maxWidth: 560, margin: "0 auto", padding: "28px 32px" },
  logo: { display: "block", height: 72, width: "auto" },
  h1: { color: ink, fontSize: 20, fontWeight: 500, lineHeight: "28px", margin: "20px 0 8px" },
  p: { color: ink, fontSize: 15, lineHeight: "24px", margin: "0 0 12px" },
  muted: { color: slate, fontSize: 13, lineHeight: "20px", margin: "0 0 8px" },
  note: { backgroundColor: canvas, borderLeft: `3px solid ${navy}`, borderRadius: 6, color: ink, fontSize: 14, lineHeight: "22px", margin: "16px 0", padding: "12px 16px", whiteSpace: "pre-wrap" as const },
  button: { backgroundColor: navy, borderRadius: 8, color: "#FFFFFF", display: "inline-block", fontSize: 15, fontWeight: 500, padding: "12px 20px", textDecoration: "none" },
  hr: { borderColor: line, margin: "24px 0 16px" },
  footer: { color: "#9AA5B1", fontSize: 12, lineHeight: "18px", margin: 0 },
  meta: { color: slate, fontSize: 13, lineHeight: "20px", margin: "0 0 4px" },
  metaStrong: { color: ink, fontWeight: 500 },
};

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Img
            src={`${env.APP_URL}/brand/united-heritage-logo.png`}
            alt="United Heritage Insurance"
            height={72}
            style={emailStyles.logo}
          />
          {children}
          <Hr style={emailStyles.hr} />
          <Text style={emailStyles.footer}>
            Approval Hub · United Heritage Insurance. You received this because a teammate added you as an
            approver or you signed in. Replies go to the person who sent the request.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function CtaButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "20px 0 8px" }}>
      <Button href={href} style={emailStyles.button}>
        {children}
      </Button>
      <Text style={{ ...emailStyles.muted, marginTop: 12 }}>
        Or copy this link: <span style={{ color: slate, wordBreak: "break-all" }}>{href}</span>
      </Text>
    </Section>
  );
}
