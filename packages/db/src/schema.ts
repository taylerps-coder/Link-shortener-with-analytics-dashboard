import { pgTable, serial, bigserial, varchar, text, boolean, timestamp, integer, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const domainStatusEnum = pgEnum('domain_status', ['pending', 'verifying', 'active', 'failed']);
export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'member']);
export const planEnum = pgEnum('plan', ['free', 'pro', 'team']);

// ─── Workspaces ───────────────────────────────────────────────────────────────

export const workspaces = pgTable('workspaces', {
  id: varchar('id', { length: 26 }).primaryKey(), // ULID
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  plan: planEnum('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Workspace Members ────────────────────────────────────────────────────────

export const workspaceMembers = pgTable('workspace_members', {
  id: serial('id').primaryKey(),
  workspaceId: varchar('workspace_id', { length: 26 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 128 }).notNull(), // Clerk user ID
  role: memberRoleEnum('role').notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  wsUserUnique: uniqueIndex('ws_user_unique').on(t.workspaceId, t.userId),
  userIdx: index('wm_user_idx').on(t.userId),
}));

// ─── Links ────────────────────────────────────────────────────────────────────

export const links = pgTable('links', {
  id: varchar('id', { length: 26 }).primaryKey(), // ULID
  workspaceId: varchar('workspace_id', { length: 26 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 50 }).notNull(),
  originalUrl: text('original_url').notNull(),
  title: varchar('title', { length: 255 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  clickCount: integer('click_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Partial unique index: only active slugs must be unique per workspace
  activeSlugUnique: uniqueIndex('links_active_slug_unique').on(t.workspaceId, t.slug),
  wsCreatedIdx: index('links_ws_created_idx').on(t.workspaceId, t.createdAt),
}));

// ─── Clicks ───────────────────────────────────────────────────────────────────

export const clicks = pgTable('clicks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  linkId: varchar('link_id', { length: 26 }).notNull().references(() => links.id, { onDelete: 'cascade' }),
  workspaceId: varchar('workspace_id', { length: 26 }).notNull(),
  clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),
  country: varchar('country', { length: 2 }),
  city: varchar('city', { length: 100 }),
  device: varchar('device', { length: 20 }),
  browser: varchar('browser', { length: 50 }),
  os: varchar('os', { length: 50 }),
  referrerDomain: varchar('referrer_domain', { length: 255 }),
  referrerType: varchar('referrer_type', { length: 20 }),
  isBot: boolean('is_bot').notNull().default(false),
  ipHash: varchar('ip_hash', { length: 64 }),
}, (t) => ({
  linkClickedIdx: index('clicks_link_clicked_idx').on(t.linkId, t.clickedAt),
  wsClickedIdx: index('clicks_ws_clicked_idx').on(t.workspaceId, t.clickedAt),
}));

// ─── Custom Domains ───────────────────────────────────────────────────────────

export const customDomains = pgTable('custom_domains', {
  id: serial('id').primaryKey(),
  workspaceId: varchar('workspace_id', { length: 26 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  status: domainStatusEnum('status').notNull().default('pending'),
  verificationAttempts: integer('verification_attempts').notNull().default(0),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  workspaceId: varchar('workspace_id', { length: 26 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  keyHash: varchar('key_hash', { length: 60 }).notNull(), // bcrypt hash
  keyPrefix: varchar('key_prefix', { length: 8 }).notNull(), // for display: "lsnp_abc"
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
});
