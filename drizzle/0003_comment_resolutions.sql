ALTER TABLE "comments" ADD COLUMN "resolution" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "resolved_in_version_id" uuid;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_resolved_in_version_id_versions_id_fk" FOREIGN KEY ("resolved_in_version_id") REFERENCES "public"."versions"("id") ON DELETE set null ON UPDATE no action;