import { relations, sql } from "drizzle-orm";
import {
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  index,
  uuid,
} from "drizzle-orm/pg-core";

// Enums --------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["owner", "designer", "approver"]);
export const projectStatusEnum = pgEnum("project_status", [
  "not_started",
  "in_progress",
  "in_review",
  "changes_requested",
  "approved",
  "done",
  "on_hold",
  "cancelled",
]);
export const itemTypeEnum = pgEnum("item_type", ["file", "email"]);
export const roundStatusEnum = pgEnum("round_status", [
  "pending",
  "changes_requested",
  "approved",
  "superseded",
]);
export const approvalStatusEnum = pgEnum("approval_status", [
  "waiting",
  "approved",
  "changes_requested",
]);
export const magicLinkPurposeEnum = pgEnum("magic_link_purpose", ["team_signin", "approver"]);

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type ItemType = (typeof itemTypeEnum.enumValues)[number];
export type RoundStatus = (typeof roundStatusEnum.enumValues)[number];
export type ApprovalStatus = (typeof approvalStatusEnum.enumValues)[number];

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

// Tables -------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: userRoleEnum("role").notNull().default("approver"),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** When set, this session may only access the given item (approver link sessions). */
    scopeItemId: uuid("scope_item_id").references(() => items.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const magicLinks = pgTable("magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  purpose: magicLinkPurposeEnum("purpose").notNull(),
  itemId: uuid("item_id").references(() => items.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  ...timestamps,
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("not_started"),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    estHours: real("est_hours"),
    plannedRounds: integer("planned_rounds").notNull().default(3),
    reviewWindowDays: integer("review_window_days").notNull().default(3),
    revisionDays: integer("revision_days").notNull().default(2),
    designerId: uuid("designer_id").references(() => users.id, { onDelete: "set null" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("projects_status_idx").on(t.status), index("projects_due_idx").on(t.dueDate)],
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: itemTypeEnum("type").notNull().default("file"),
    /** Overrides the project default when set. */
    reviewWindowDays: integer("review_window_days"),
    ...timestamps,
  },
  (t) => [index("items_project_idx").on(t.projectId)],
);

export const versions = pgTable(
  "versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    note: text("note"),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    // file versions
    fileUrl: text("file_url"),
    fileName: text("file_name"),
    mime: text("mime"),
    size: integer("size"),
    previewUrl: text("preview_url"),
    // email versions
    emailSubject: text("email_subject"),
    emailFromName: text("email_from_name"),
    emailHtml: text("email_html"),
    ...timestamps,
  },
  (t) => [uniqueIndex("versions_item_number_idx").on(t.itemId, t.number)],
);

export const reviewRounds = pgTable("review_rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id")
    .notNull()
    .unique()
    .references(() => versions.id, { onDelete: "cascade" }),
  status: roundStatusEnum("status").notNull().default("pending"),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
});

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => reviewRounds.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: approvalStatusEnum("status").notNull().default("waiting"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    lastEmailedAt: timestamp("last_emailed_at", { withTimezone: true }),
    reminderCount: integer("reminder_count").notNull().default(0),
    /** HMAC hash of the scoped approver token embedded in emails. */
    tokenHash: text("token_hash").notNull().unique(),
    ...timestamps,
  },
  (t) => [uniqueIndex("approvals_round_user_idx").on(t.roundId, t.userId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    approvalId: uuid("approval_id").references(() => approvals.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    pageNo: integer("page_no"),
    x: real("x"),
    y: real("y"),
    addressedInVersionId: uuid("addressed_in_version_id").references(() => versions.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [index("comments_version_idx").on(t.versionId)],
);

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => items.id, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => versions.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    meta: jsonb("meta_json").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    ...timestamps,
  },
  (t) => [
    index("activity_project_idx").on(t.projectId, t.createdAt),
    index("activity_item_idx").on(t.itemId, t.createdAt),
  ],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value_json").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Relations ----------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  approvals: many(approvals),
  sessions: many(sessions),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  designer: one(users, { fields: [projects.designerId], references: [users.id], relationName: "designer" }),
  creator: one(users, { fields: [projects.createdBy], references: [users.id], relationName: "creator" }),
  items: many(items),
  activity: many(activity),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  project: one(projects, { fields: [items.projectId], references: [projects.id] }),
  versions: many(versions),
}));

export const versionsRelations = relations(versions, ({ one, many }) => ({
  item: one(items, { fields: [versions.itemId], references: [items.id] }),
  uploader: one(users, { fields: [versions.uploadedBy], references: [users.id] }),
  round: one(reviewRounds, { fields: [versions.id], references: [reviewRounds.versionId] }),
  comments: many(comments),
}));

export const reviewRoundsRelations = relations(reviewRounds, ({ one, many }) => ({
  version: one(versions, { fields: [reviewRounds.versionId], references: [versions.id] }),
  approvals: many(approvals),
}));

export const approvalsRelations = relations(approvals, ({ one, many }) => ({
  round: one(reviewRounds, { fields: [approvals.roundId], references: [reviewRounds.id] }),
  user: one(users, { fields: [approvals.userId], references: [users.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  approval: one(approvals, { fields: [comments.approvalId], references: [approvals.id] }),
  version: one(versions, { fields: [comments.versionId], references: [versions.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const activityRelations = relations(activity, ({ one }) => ({
  project: one(projects, { fields: [activity.projectId], references: [projects.id] }),
  item: one(items, { fields: [activity.itemId], references: [items.id] }),
  actor: one(users, { fields: [activity.actorId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// Row types ----------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Version = typeof versions.$inferSelect;
export type ReviewRound = typeof reviewRounds.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Activity = typeof activity.$inferSelect;
