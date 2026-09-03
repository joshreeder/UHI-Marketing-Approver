# Approval Hub — user guide

The same guide is inside the app under **Help** in the top navigation. Approvers never need it: their email link does everything.

## What it does

Every marketing piece gets one home, one current version, and a clear yes or no from everyone who needs to sign off.
You create a **project**, add the **item** being reviewed (a flyer, a postcard, an email, a letter), upload **versions** of it, and send each
version to **approvers**. They click a link in their email, see the piece, and either approve it or tell you what to change.
Everything is recorded in the activity log.

## Who does what

| Role | How they get in | What they can do |
|---|---|---|
| Owner (marketing manager) | Emailed sign-in link | Everything, plus Settings |
| Designer | Emailed sign-in link | Create projects, upload versions, send for approval, nudge, mark comments addressed |
| Approver (execs, compliance, agents) | Personal link in each approval email, no account | See the piece, Approve or Request changes with comments |

## 1. Create a project

Dashboard → **New project**. Name, dates, estimated hours, designer. The **review plan** fields (planned rounds, review window
in days, revision days) drive the schedule preview on the right, which warns when the rounds will not fit before the due date.

Click **Create project and add the piece**. The project page opens with a drop zone: drag in the artwork or Word document,
or switch to **Paste email or copy**. The piece is created automatically, named after the project. Most projects are one piece;
**Add another piece** at the bottom of the project page covers campaigns with several.

## 2. Add a version: file or copy

The first version goes in on the project page; later ones via **New version** on the piece's page. Two tabs:

- **Upload a file** — drag a PDF, image, Word or PowerPoint file onto the box or click to choose. Up to 500 MB, so print-ready PDFs are fine. Word files get an
  approximate preview (original stays downloadable); PowerPoint is download-only, so export to PDF when slides must show in the browser.
- **Write copy** — for letters, emails and any text needing sign-off. A proper editor: headings, bold, italic, underline, bulleted and numbered lists, links and
  quotes. Paste from Word, Outlook or a web page and the structure comes along. Optional subject line and from name for emails. The next version opens
  pre-filled with the current text so you edit rather than retype.

Add a short **version note**; approvers see it.

### Word files with tracked changes or comments

Before a Word file is uploaded the app looks inside it. If it still contains **tracked changes** (insertions, deletions, moves, formatting changes) or
**open comments**, you get a warning with the counts and who made them. This matters because the preview approvers see shows the text as if every
change were accepted and every comment deleted, so they would be approving wording nobody has settled on.

The fix is in Word: **Review → Accept → Accept All Changes and Stop Tracking**, then **Review → Delete → Delete All Comments in Document**, save,
and upload that file. If you must upload anyway, tick **Upload anyway**. The markup stays flagged on the item page (with the list of changes), in the
version history, and **Send for approval** requires you to tick **Send anyway** before it goes out. Approvers see a note that the file contains markup and a
link to download the original. A clean file shows "Clean Word file" so you know it checked out.

### Copy versions: test, compare, download as Word

- **Send me a test** emails you the copy as a real email so you can check it in an inbox.
- **What changed since vN** appears under the preview from the second version on: added words highlighted green, removed words red with a strike-through,
  plus any subject or from-name change. Approvers see the same comparison, opened by default, so on a revision they can read only what moved.
- **Download Word** turns the copy into a .docx. With a letterhead uploaded in Settings the download uses its header, footer and styles; the menu also offers a
  plain document. Approvers can download it too. Headings, bold, lists and links carry over; lists are written as indented paragraphs with bullets or numbers.

## Letters and other Word documents: the recommended flow

Word documents that go out as the communication itself (a letter to customers, the board or the sales agents) work best like this:

1. Create the item and **write the copy in the app** (or paste the draft from Word). The words are what needs approval, so the words are what gets versioned.
2. **Send for approval.** Approvers read it, pin notes to paragraphs and approve or request changes. They comment; they do not edit, so an approval always
   refers to exactly the text on that version.
3. Make the edits as a **New version**. The old round is superseded, approvers are re-emailed, and the comparison shows them precisely what changed.
4. When it is approved, **Download Word** on the letterhead, do any final layout in Word, and send it out. The approved text stays in the app as the record.

Uploading the Word file itself is fine when the file is the deliverable and the text is settled; just make sure it is clean of tracked changes first. What the
app deliberately does not do is watch a shared OneDrive document: a version here is frozen the moment it is saved, which is the only way "everyone approved
this" can mean anything.

## 3. Send for approval

After the first version is saved, use **Send for approval** on the right: type emails and press Enter (past approvers are
suggested as you type; pasting a list works), review window in days, optional note, **Send**. Each approver gets a personal link scoped to that one item. It works until a
newer version replaces it or 30 days pass. Replies go to you.

## 4. What approvers see

The piece, the version note, who else is reviewing, and two buttons: **Approve** and **Request changes**. Approvers can also click
anywhere on the preview to pin a numbered note to that spot. Request changes asks for a summary, optional once notes are pinned.
Works on a phone. The item page shows when each approver was emailed and (with tracking connected) when they opened it. You and the designer get an email for every decision, and a "Fully approved" email when the last approval lands.

## 5. Handle change requests

One Request changes flips the round to **Changes requested**. Fix the piece and add a **New version**: the old round is closed as
Superseded, its approvers are copied to the new round and emailed "New version ready". Comments under the old version get a
**Mark addressed** control. History is kept forever.

## 6. Reminders and nudges

- Automatic reminders halfway through the review window and on the due date (daily, 8 am Mountain; toggle in Settings).
- **Nudge** next to any waiting approver sends a reminder now and logs it. Limited to once per hour per person.

## 7. Statuses, due dates and search

Not started → In progress → In review → Changes requested → Approved are worked out automatically. Done, On hold and
Cancelled are set by hand in the Status box on the project page ("Active (derived)" hands control back). Red **Overdue**
badges appear when a project or round due date passes. The Dashboard search box finds projects and items by name.

## 7b. Timeline (Gantt)

**Timeline** shows scheduled projects as bars from start to due, coloured by status, today in red. Under each bar: the plan
(design → review → revise) as a thin strip, and the real review rounds as markers coloured by outcome. Drag a bar to move the
project by whole days. Labels show "behind/ahead of plan" and flag extra rounds beyond the plan.

## 8. Finish and archive

**Mark complete** on the project page (or enable auto-complete in Settings), then **Archive project**. Archived projects stay
searchable under Archive and can be restored.

## Settings (owner only)

Team members, planning defaults, reminder toggles, auto-complete, the **Word letterhead**, and a read-out of whether email and file storage are configured.

**Word letterhead**: upload any .docx. Its header, footer, page setup and styles are kept and the body is replaced with the copy when someone clicks
Download Word. To keep some body content (a date line, a signature block), put `{{body}}` on its own line where the copy should go. `{{date}}`,
`{{title}}`, `{{subject}}` and `{{version}}` are filled in wherever they appear, including headers and footers. Replace or remove it any time; existing
versions are unaffected because the Word file is generated at download time.

## Common questions

- **Link expired?** Newer version or 30 days. The expired page sends a fresh link; a Nudge does too.
- **Approve for someone else?** No, by design. The audit log records who clicked.
- **Several pieces in one project?** Yes. Each item has its own versions and rounds.
- **Where are files?** Private cloud storage; every file request checks the signed-in user's access.
- **Can approvers edit the text?** No, on purpose. They comment and pin notes; the designer makes the change as a new version and the comparison shows exactly what moved. If approvers could edit, an approval would no longer refer to a fixed text.
- **Why does it complain about my Word file?** It still has tracked changes or comments. Accept or reject them and delete the comments in Word, save, and upload again. See section 2.
- **Can it follow a shared OneDrive document live?** No. A version is frozen when saved so an approval can refer to it. Write or paste the text here, and download it as Word when it is approved.
- **Sign-in link bounces back to the sign-in page?** Corporate mail scanners pre-open links. The link now shows a Continue button; only that click signs you in.
- **No sign-in email?** Check spam the first time. Links expire after 15 minutes.
