import { Text } from "@react-email/components";
import { CtaButton, EmailLayout, emailStyles as s } from "./layout";

type PieceInfo = {
  projectName: string;
  itemTitle: string;
  versionNumber: number;
  requesterName: string;
  dueText: string;
  reviewUrl: string;
  note?: string | null;
};

export function ApprovalRequestEmail(p: PieceInfo) {
  return (
    <EmailLayout preview={`${p.requesterName} needs your approval on ${p.itemTitle}. Due ${p.dueText}.`}>
      <Text style={s.h1}>{p.requesterName} needs your approval</Text>
      <Text style={s.p}>
        Please review <span style={s.metaStrong}>{p.itemTitle}</span> (v{p.versionNumber}) for the project{" "}
        <span style={s.metaStrong}>{p.projectName}</span>.
      </Text>
      <Text style={s.meta}>
        Due <span style={s.metaStrong}>{p.dueText}</span>
      </Text>
      {p.note ? <Text style={s.note}>{p.note}</Text> : null}
      <CtaButton href={p.reviewUrl}>Review now</CtaButton>
      <Text style={s.muted}>The link signs you in automatically. No account or password needed.</Text>
    </EmailLayout>
  );
}

export function NewVersionEmail(p: PieceInfo) {
  return (
    <EmailLayout preview={`New version ready — v${p.versionNumber} of ${p.itemTitle}`}>
      <Text style={s.h1}>New version ready — v{p.versionNumber}</Text>
      <Text style={s.p}>
        {p.requesterName} uploaded a new version of <span style={s.metaStrong}>{p.itemTitle}</span> (
        {p.projectName}). The previous round is closed; please review this one.
      </Text>
      {p.note ? (
        <>
          <Text style={s.meta}>What changed</Text>
          <Text style={s.note}>{p.note}</Text>
        </>
      ) : null}
      <Text style={s.meta}>
        Due <span style={s.metaStrong}>{p.dueText}</span>
      </Text>
      <CtaButton href={p.reviewUrl}>Review now</CtaButton>
    </EmailLayout>
  );
}

export function ReminderEmail(p: PieceInfo & { overdue: boolean; nudgedBy?: string | null }) {
  const heading = p.overdue ? "Overdue: your approval is needed" : "Reminder: your approval is needed";
  return (
    <EmailLayout preview={`${heading} — ${p.itemTitle}`}>
      <Text style={s.h1}>{heading}</Text>
      <Text style={s.p}>
        {p.nudgedBy ? `${p.nudgedBy} is waiting on your review of ` : "Just a friendly reminder to review "}
        <span style={s.metaStrong}>{p.itemTitle}</span> (v{p.versionNumber}) for {p.projectName}.
      </Text>
      <Text style={s.meta}>
        {p.overdue ? "Was due" : "Due"} <span style={s.metaStrong}>{p.dueText}</span>
      </Text>
      <CtaButton href={p.reviewUrl}>Review now</CtaButton>
    </EmailLayout>
  );
}

export function DecisionEmail(p: {
  approverName: string;
  decision: "approved" | "changes_requested";
  projectName: string;
  itemTitle: string;
  versionNumber: number;
  comments: string[];
  itemUrl: string;
  progress: string;
}) {
  const approved = p.decision === "approved";
  return (
    <EmailLayout
      preview={`${p.approverName} ${approved ? "approved" : "requested changes on"} ${p.itemTitle} v${p.versionNumber}`}
    >
      <Text style={s.h1}>
        {p.approverName} {approved ? "approved" : "requested changes"}
      </Text>
      <Text style={s.p}>
        <span style={s.metaStrong}>{p.itemTitle}</span> v{p.versionNumber} · {p.projectName}
      </Text>
      <Text style={s.meta}>Progress: {p.progress}</Text>
      {p.comments.length ? (
        <>
          <Text style={{ ...s.meta, marginTop: 12 }}>Comments</Text>
          {p.comments.map((c, i) => (
            <Text key={i} style={s.note}>
              {c}
            </Text>
          ))}
        </>
      ) : null}
      <CtaButton href={p.itemUrl}>Open in Approval Hub</CtaButton>
    </EmailLayout>
  );
}

export function AllApprovedEmail(p: {
  projectName: string;
  itemTitle: string;
  versionNumber: number;
  approvers: string[];
  itemUrl: string;
}) {
  return (
    <EmailLayout preview={`${p.itemTitle} v${p.versionNumber} is fully approved`}>
      <Text style={s.h1}>Fully approved</Text>
      <Text style={s.p}>
        Everyone has signed off on <span style={s.metaStrong}>{p.itemTitle}</span> v{p.versionNumber} for{" "}
        {p.projectName}.
      </Text>
      <Text style={s.meta}>Approved by {p.approvers.join(", ")}</Text>
      <CtaButton href={p.itemUrl}>Open in Approval Hub</CtaButton>
    </EmailLayout>
  );
}

export function SignInEmail(p: { url: string }) {
  return (
    <EmailLayout preview="Your Approval Hub sign-in link">
      <Text style={s.h1}>Sign in to Approval Hub</Text>
      <Text style={s.p}>Click the button below to sign in. This link works once and expires in 15 minutes.</Text>
      <CtaButton href={p.url}>Sign in</CtaButton>
      <Text style={s.muted}>If you did not request this, you can ignore this email.</Text>
    </EmailLayout>
  );
}
