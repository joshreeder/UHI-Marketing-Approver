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
  { id: "word", title: "Letters and Word documents" },
  { id: "send", title: "3. Send for approval" },
  { id: "approver", title: "4. What approvers see" },
  { id: "changes", title: "5. Handle change requests" },
  { id: "reminders", title: "6. Reminders and nudges" },
  { id: "status", title: "7. Statuses and due dates" },
  { id: "timeline", title: "8. The Timeline (Gantt)" },
  { id: "finish", title: "9. Finish and archive" },
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
              You create a <b>project</b>, add the <b>item</b> being reviewed (a flyer, a postcard, an email, a letter), upload <b>versions</b> of it,
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
              Click <b>Create project and add the piece</b>. You land on the project page with a big drop zone: drag in the artwork, PDF or Word document, or switch to
              <b> Paste email or copy</b>. The piece is created for you, named after the project. Leave the drop zone alone if it is a tracker-only project for now.
            </p>
          </Section>

          <Section id="version" title="2. Add a version: file or copy">
            <p>
              The first version goes in right on the project page. Later versions use <b>New version</b> on the piece’s page. Both offer two tabs:
            </p>
            <ul>
              <li>
                <b>Upload a file</b>: drag a PDF, image, Word or PowerPoint file onto the box, or click it to choose one. Up to 500 MB, so print-ready PDFs are fine. PDFs show every page; images zoom.
                Word files are converted to an approximate preview and the original stays downloadable. PowerPoint files are download-only for now, so export to PDF when approvers need to see slides in the browser.
              </li>
              <li>
                <b>Write copy</b>: for letters, emails and any text that needs sign-off. A proper editor with headings, bold, italic, underline, bulleted and numbered lists, links and quotes.
                Paste from Word, Outlook or a web page and the structure comes along. Add an optional subject line and from name for emails. Approvers see it formatted like a page.
                The next version opens pre-filled with the current text so you edit rather than retype.
              </li>
            </ul>
            <p>
              Add a short <b>note for approvers</b> (“Fixed logo size, updated dates”). It is shown in the email and in the history. Most projects are one piece; if a
              campaign has several (a postcard and a follow-up email), use <b>Add another piece</b> at the bottom of the project page.
            </p>
            <h3 className="text-base text-ink">Word files with tracked changes or comments</h3>
            <p>
              Before a Word file is uploaded the app looks inside it. If it still contains <b>tracked changes</b> (insertions, deletions, moves, formatting) or <b>open comments</b>, you get a
              warning with the counts and who made them. The preview approvers see shows the text as if every change were accepted and every comment deleted, so they would be approving
              wording nobody has settled on.
            </p>
            <p>
              Fix it in Word: <b>Review → Accept → Accept All Changes and Stop Tracking</b>, then <b>Review → Delete → Delete All Comments in Document</b>, save, and upload that file.
              If you must upload anyway, tick <b>Upload anyway</b>. The markup stays flagged on the item page with the list of changes, in the version history, and <b>Send for approval</b>
              requires <b>Send anyway</b> before it goes out. Approvers see a note that the file contains markup and a link to the original. A clean file shows “Clean Word file”.
            </p>
            <h3 className="text-base text-ink">Copy versions: test, compare, download as Word</h3>
            <ul>
              <li>
                <b>Send me a test</b> emails you the copy as a real email so you can check it in an inbox before approvers do.
              </li>
              <li>
                <b>What changed since vN</b> appears under the preview from the second version on: added words in green, removed words in red with a strike-through, plus any subject or
                from-name change. Approvers see the same comparison, opened by default, so on a revision they can read only what moved.
              </li>
              <li>
                <b>Download Word</b> turns the copy into a .docx. With a letterhead uploaded in Settings the download uses its header, footer and styles; the menu also offers a plain document.
                Approvers can download it too. Headings, bold, lists and links carry over; lists are written as indented paragraphs with bullets or numbers.
              </li>
            </ul>
          </Section>

          <Section id="word" title="Letters and Word documents: the recommended flow">
            <p>Word documents that go out as the communication itself (a letter to customers, the board or the sales agents) work best like this:</p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Create the item and <b>write the copy in the app</b>, or paste the draft from Word. The words are what needs approval, so the words are what gets versioned.</li>
              <li>
                <b>Send for approval.</b> Approvers read it, pin notes to paragraphs and approve or request changes. They comment; they do not edit, so an approval always refers to exactly the text on that version.
              </li>
              <li>Make the edits as a <b>New version</b>. The old round is superseded, approvers are re-emailed, and the comparison shows them precisely what changed.</li>
              <li>
                When it is approved, <b>Download Word</b> on the letterhead, do any final layout in Word, and send it out. The approved text stays in the app as the record.
              </li>
            </ol>
            <p>
              Uploading the Word file itself is fine when the file is the deliverable and the text is settled; just make sure it is clean of tracked changes first. What the app deliberately does
              not do is watch a shared OneDrive document: a version here is frozen the moment it is saved, which is the only way “everyone approved this” can mean anything.
            </p>
          </Section>

          <Section id="send" title="3. Send for approval">
            <p>
              After the first version is saved, the panel on the right shows <b>Send for approval</b>. Type an email and press Enter to add it; past approvers appear as
              suggestions while you type, and you can paste a whole list. Set the review window in days, add an optional personal note, and click Send.
            </p>
            <p>
              Each approver gets an email with their own link. The link signs them in automatically and is scoped to this one item, so they cannot see anything else.
              It keeps working until a new version replaces this one or 30 days pass. Replies to the email go to you, not to the app.
            </p>
          </Section>

          <Section id="approver" title="4. What approvers see">
            <p>
              A clean page with the piece front and centre, the version note, who else is reviewing, and two buttons at the bottom: <b>Approve</b> and{" "}
              <b>Request changes</b>. They can also <b>click anywhere on the preview to pin a numbered note</b> to that exact spot (on a PDF page, an image, or a paragraph of copy).
              Request changes asks for a summary comment, which becomes optional once they have pinned notes. It works well on a phone.
            </p>
            <p>
              You and the designer are emailed every decision. When the last approver approves, everyone on the team gets a “Fully approved” email and the version is marked Approved.
            </p>
            <p>
              On the item page each waiting approver shows when they were sent the email and, once email tracking is connected, when they <b>opened</b> it, so you can tell
              “hasn’t looked yet” from “looked and hasn’t decided”. To see exactly what an approver sees, open any item and view <b>/review/item/…</b>; team members can view
              it but only assigned approvers get the buttons.
            </p>
          </Section>

          <Section id="changes" title="5. Handle change requests">
            <p>
              A single Request changes flips the round to <b>Changes requested</b>. Other approvers can still weigh in. Comments appear on the item page under the version,
              and pinned notes show as numbered markers on the preview itself; click a marker to read it.
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

          <Section id="status" title="7. Statuses and due dates">
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
              A red <b>Overdue</b> badge appears when the project due date or a review round’s due date has passed. The Dashboard’s <b>Overdue</b> filter lists them all,
              and the search box finds projects and items by name.
            </p>
          </Section>

          <Section id="timeline" title="8. The Timeline (Gantt)">
            <p>
              <b>Timeline</b> in the top navigation shows every scheduled project as a bar from start to due date, coloured by status, with today marked in red.
              Under each bar: a thin strip with the <b>plan</b> (design → review 1 → revise → review 2 …) and, below that, the <b>review rounds that actually happened</b>,
              one marker per version sent, coloured by outcome. Red on the end of a bar means overdue.
            </p>
            <ul>
              <li><b>Drag a bar</b> left or right to move the whole project (start and due) by whole days.</li>
              <li>The label shows <b>“3d behind plan”</b> or “ahead of plan” by comparing the latest real round with the planned one, and flags <b>extra rounds</b> beyond the plan.</li>
              <li>Projects without dates are listed underneath with a link to add them. <b>Show archived</b> includes finished work.</li>
            </ul>
          </Section>

          <Section id="finish" title="9. Finish and archive">
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
              <li>
                <b>Word letterhead</b>: upload any .docx. Its header, footer, page setup and styles are kept and the body is replaced with the copy when someone clicks Download Word. To keep
                some body content (a date line, a signature block), put <code>{"{{body}}"}</code> on its own line where the copy should go. <code>{"{{date}}"}</code>,{" "}
                <code>{"{{title}}"}</code>, <code>{"{{subject}}"}</code> and <code>{"{{version}}"}</code> are filled in wherever they appear, including headers and footers. Replace or remove
                it any time; the Word file is generated at download time, so existing versions are unaffected.
              </li>
              <li><b>Integrations</b>: shows whether email sending, file storage and email open tracking are configured.</li>
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
              <Q q="Can approvers edit the text?">
                No, on purpose. They comment and pin notes; the designer makes the change as a new version and the comparison shows exactly what moved. If approvers could edit, an approval
                would no longer refer to a fixed text.
              </Q>
              <Q q="Why does it complain about my Word file?">
                It still has tracked changes or comments. Accept or reject them and delete the comments in Word, save, and upload again. Section 2 has the exact menu items.
              </Q>
              <Q q="Can it follow a shared OneDrive document live?">
                No. A version is frozen when it is saved so that an approval can refer to it. Write or paste the text here instead, and download it as Word when it is approved.
              </Q>
              <Q q="Where do the files live?">
                In private cloud storage. Nothing is publicly downloadable; every file request checks that you are signed in and allowed to see that item.
              </Q>
              <Q q="My sign-in link just sends me back to the sign-in screen.">
                Company mail systems (Microsoft 365 Safe Links and similar) scan links before you click them. The sign-in link now lands on a page with a
                <b> Continue</b> button, and only that click signs you in, so scanners cannot use it up. If you still get bounced, the link is older than 15 minutes; request a new one.
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
