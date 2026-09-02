import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireTeam } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Help" };

const sections = [
  { id: "overview", title: "What Approval Hub does" },
  { id: "roles", title: "Who does what" },
  { id: "project", title: "1. Create a project" },
  { id: "version", title: "2. Add a version: file or copy" },
  { id: "send", title: "3. Send for approval" },
  { id: "approver", title: "4. What approvers see" },
  { id: "changes", title: "5. Handle change requests" },
  { id: "reminders", title: "6. Reminders and nudges" },
  { id: "status", title: "7. Statuses, due dates and the timeline" },
  { id: "finish", title: "8. Finish and archive" },
  { id: "settings", title: "Settings" },
  { id: "faq", title: "Common questions" },
];

export default async function HelpPage() {
  await requireTeam();
  return (
    <>
      <PageHeader title="How to use Approval Hub" description="Everything the team needs, on one page. Approvers never need this: their email link does it all." />
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
          <ol className="space-y-1 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-md px-2 py-1 text-slate hover:bg-white hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="prose-uh max-w-3xl space-y-10 rounded-xl border border-line bg-white px-6 py-8 text-[15px] leading-7 text-ink sm:px-10">
          <Section id="overview" title="What Approval Hub does">
            <p>
              Every marketing piece gets one home, one current version, and a clear yes or no from everyone who needs to sign off.
              You create a <b>project</b>, add the <b>item</b> being reviewed (a flyer, a postcard, an email), upload <b>versions</b> of it,
              and send each version to <b>approvers</b>. They click a link in their email, see the piece, and either approve it or tell you what to change.
              Everything that happens is recorded in the activity log.
            </p>
          </Section>

          <Section id="roles" title="Who does what">
            <ul>
              <li>
                <b>Owner</b> (marketing manager): everything below, plus Settings. Signs in with an emailed link.
              </li>
              <li>
                <b>Designer</b>: creates projects, uploads versions, sends for approval, nudges, marks change requests addressed. Signs in with an emailed link.
              </li>
              <li>
                <b>Approver</b> (executives, compliance, agents): never signs in. They get an email with a personal link, review, and click Approve or Request changes.
                Anyone with an email address can be an approver; they are created automatically the first time you add them.
              </li>
            </ul>
          </Section>

          <Section id="project" title="1. Create a project">
            <p>
              Dashboard → <b>New project</b>. Give it a name, dates, an estimate in hours and a designer. The <b>review plan</b> fields set how many rounds you expect,
              how many days approvers get per round, and how many days the designer needs between rounds. The schedule on the right updates as you type and warns
              you when the rounds will not fit before the due date.
            </p>
            <p>
              <b>First item</b> is optional: type “Postcard PDF” or “Announcement email” to create the piece right away and land on its page. Leave it blank for a
              tracker-only project (dates and status, nothing to review yet). You can add items later from the project page.
            </p>
          </Section>

          <Section id="version" title="2. Add a version: file or copy">
            <p>
              On an item page click <b>Add v1</b> (later <b>New version</b>). The dialog has two tabs:
            </p>
            <ul>
              <li>
                <b>Upload a file</b>: drag a PDF or image onto the box, or click it to choose one. PDF, JPG, PNG, GIF and WebP up to 50 MB. PDFs show every page; images zoom.
              </li>
              <li>
                <b>Paste copy</b>: for emails and any text that needs sign-off. Paste the copy into the big box, add an optional subject line and from name, and save.
                Approvers see it formatted like a page. Blank lines start new paragraphs. The next version opens pre-filled with the current text so you edit rather than retype.
              </li>
            </ul>
            <p>
              Add a short <b>version note</b> (“Fixed logo size, updated dates”). It is shown to approvers and in the history.
            </p>
            <p>
              Word documents: for now export to PDF and upload that, or paste the text into the copy tab. Direct Word preview is on the list for a later phase.
            </p>
          </Section>

          <Section id="send" title="3. Send for approval">
            <p>
              After the first version is saved, the panel on the right shows <b>Send for approval</b>. Enter one or more emails (commas between them; click a past
              approver to add them), set the review window in days, add an optional personal note, and click Send.
            </p>
            <p>
              Each approver gets an email with their own link. The link signs them in automatically and is scoped to this one item, so they cannot see anything else.
              It keeps working until a new version replaces this one or 30 days pass. Replies to the email go to you, not to the app.
            </p>
          </Section>

          <Section id="approver" title="4. What approvers see">
            <p>
              A clean page with the piece front and centre, the version note, who else is reviewing, and two buttons at the bottom: <b>Approve</b> and{" "}
              <b>Request changes</b>. Request changes asks for a comment (required) so the designer knows what to do. It works well on a phone.
            </p>
            <p>
              You and the designer are emailed every decision. When the last approver approves, everyone on the team gets a “Fully approved” email and the version is marked Approved.
            </p>
            <p>
              To see exactly what an approver sees, open any item and view <b>/review/item/…</b>; team members can view it but only assigned approvers get the buttons.
            </p>
          </Section>

          <Section id="changes" title="5. Handle change requests">
            <p>
              A single Request changes flips the round to <b>Changes requested</b>. Other approvers can still weigh in. The comments appear on the item page under the version.
            </p>
            <p>
              Fix the piece and add a <b>New version</b>. The old round is closed as <b>Superseded</b>, all its approvers are copied to the new round and emailed “New version ready”,
              and the clock restarts. Under the old version, each comment has <b>Mark addressed</b> so you can tick them off. Old versions stay in the history forever.
            </p>
          </Section>

          <Section id="reminders" title="6. Reminders and nudges">
            <ul>
              <li>
                <b>Automatic</b>: a reminder halfway through the review window and another on the due date. Both can be turned off in Settings. They go out once a day at 8 am Mountain.
              </li>
              <li>
                <b>Nudge</b>: next to any waiting approver on the item page. Sends a reminder now and logs it (“Nudged 2× · last 2 h ago”). Limited to once per hour per person so nobody is spammed.
              </li>
            </ul>
          </Section>

          <Section id="status" title="7. Statuses, due dates and the timeline">
            <p>Project status is worked out automatically from its items:</p>
            <ul>
              <li><b>Not started</b>: start date is in the future and nothing has been uploaded.</li>
              <li><b>In progress</b>: work has begun; nothing is currently out for review.</li>
              <li><b>In review</b>: at least one version is waiting on approvers.</li>
              <li><b>Changes requested</b>: an approver asked for changes; a new version is needed.</li>
              <li><b>Approved</b>: every item’s current version is fully approved.</li>
              <li><b>Done / On hold / Cancelled</b>: set by hand in the Status box on the project page. Choose “Active (derived)” to hand control back to the app.</li>
            </ul>
            <p>
              A red <b>Overdue</b> badge appears when the project due date or a review round’s due date has passed. The Dashboard’s <b>Overdue</b> filter lists them all.
              The <b>Planned schedule</b> strip on each project shows design → review → revise → … → approved, with today marked in red.
            </p>
          </Section>

          <Section id="finish" title="8. Finish and archive">
            <p>
              When the piece is approved, click <b>Mark complete</b> on the project page (or turn on auto-complete in Settings). Then <b>Archive project</b> to move it off the
              Dashboard; it stays under Archive, searchable, with its full history. Restore it any time.
            </p>
          </Section>

          <Section id="settings" title="Settings (owner only)">
            <ul>
              <li><b>Team members</b>: add designers or owners by email. Remove drops them back to approver-only access.</li>
              <li><b>Defaults</b>: review window, planned rounds and revision days for new projects.</li>
              <li><b>Reminders</b>: toggle the halfway and due-date reminders; auto-complete projects when everything is approved.</li>
              <li><b>Integrations</b>: shows whether email sending and file storage are configured.</li>
            </ul>
          </Section>

          <Section id="faq" title="Common questions">
            <dl className="space-y-4">
              <Q q="An approver says the link expired.">
                Links stop working when a newer version replaces the one they were sent, or after 30 days. The expired page lets them enter their email to get a fresh link to the current version.
                You can also just Nudge them, which sends a new link.
              </Q>
              <Q q="Can I approve on behalf of someone?">
                Not directly, by design: the audit log records who clicked. Ask them to click their link, or remove them from the round by sending a new version to a different list.
              </Q>
              <Q q="Can one project have several pieces?">
                Yes. Add as many items as you need from the project page (a postcard, an email, a web banner). Each has its own versions and rounds. The project is Approved when all of them are.
              </Q>
              <Q q="Where do the files live?">
                In private cloud storage. Nothing is publicly downloadable; every file request checks that you are signed in and allowed to see that item.
              </Q>
              <Q q="I did not get my sign-in email.">
                Check spam the first time; mark it “Not spam” and later mails arrive normally. Links expire after 15 minutes, so request a new one if needed.
              </Q>
            </dl>
          </Section>

          <p className="text-sm text-slate">
            Technical setup and deployment notes are in the repository under <code>docs/</code>. Back to the{" "}
            <Link href="/" className="text-navy underline">
              Dashboard
            </Link>
            .
          </p>
        </article>
      </div>
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_b]:font-medium">
      <h2 className="text-lg text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-ink">{q}</dt>
      <dd className="mt-1 text-slate">{children}</dd>
    </div>
  );
}
