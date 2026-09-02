ALTER TABLE "approvals" ADD COLUMN "email_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "email_clicked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "versions" ADD COLUMN "preview_html" text;