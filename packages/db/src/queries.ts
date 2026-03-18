import { db } from './client';
import { links, clicks, workspaces } from './schema';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';

// ─── Link Queries ─────────────────────────────────────────────────────────────

export async function getLinkBySlug(slug: string, workspaceId?: string) {
  const conditions = workspaceId
    ? and(eq(links.slug, slug), eq(links.workspaceId, workspaceId), eq(links.active, true))
    : and(eq(links.slug, slug), eq(links.active, true));

  const result = await db.select().from(links).where(conditions).limit(1);
  return result[0] ?? null;
}

export async function getLinksByWorkspace(workspaceId: string, limit = 50, offset = 0) {
  return db.select().from(links)
    .where(eq(links.workspaceId, workspaceId))
    .orderBy(desc(links.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createLink(data: {
  id: string;
  workspaceId: string;
  slug: string;
  originalUrl: string;
  title?: string;
  expiresAt?: Date;
}) {
  const result = await db.insert(links).values(data).returning();
  return result[0];
}

export async function updateLink(id: string, workspaceId: string, data: {
  title?: string;
  expiresAt?: Date | null;
  active?: boolean;
}) {
  const result = await db.update(links)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(links.id, id), eq(links.workspaceId, workspaceId)))
    .returning();
  return result[0] ?? null;
}

export async function softDeleteLink(id: string, workspaceId: string) {
  return db.update(links)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(links.id, id), eq(links.workspaceId, workspaceId)));
}

export async function incrementClickCount(linkId: string) {
  return db.update(links)
    .set({ clickCount: sql`${links.clickCount} + 1` })
    .where(eq(links.id, linkId));
}

// ─── Click Queries ────────────────────────────────────────────────────────────

export async function insertClick(data: {
  linkId: string;
  workspaceId: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  referrerDomain?: string;
  referrerType?: string;
  isBot?: boolean;
  ipHash?: string;
}) {
  return db.insert(clicks).values(data);
}

export async function getClickTimeline(linkId: string, from: Date, to: Date, interval: 'hour' | 'day' | 'week') {
  const truncateFn = interval === 'hour' ? 'hour' : interval === 'day' ? 'day' : 'week';
  
  return db.select({
    period: sql<string>`date_trunc(${truncateFn}, ${clicks.clickedAt})`.as('period'),
    clicks: count(),
  })
    .from(clicks)
    .where(and(
      eq(clicks.linkId, linkId),
      eq(clicks.isBot, false),
      gte(clicks.clickedAt, from),
      lte(clicks.clickedAt, to),
    ))
    .groupBy(sql`date_trunc(${truncateFn}, ${clicks.clickedAt})`)
    .orderBy(sql`date_trunc(${truncateFn}, ${clicks.clickedAt})`);
}

export async function getClicksByCountry(linkId: string, from: Date, to: Date) {
  return db.select({
    country: clicks.country,
    clicks: count(),
  })
    .from(clicks)
    .where(and(
      eq(clicks.linkId, linkId),
      eq(clicks.isBot, false),
      gte(clicks.clickedAt, from),
      lte(clicks.clickedAt, to),
    ))
    .groupBy(clicks.country)
    .orderBy(desc(count()));
}

export async function getClicksByDevice(linkId: string, from: Date, to: Date) {
  return db.select({
    device: clicks.device,
    browser: clicks.browser,
    clicks: count(),
  })
    .from(clicks)
    .where(and(
      eq(clicks.linkId, linkId),
      eq(clicks.isBot, false),
      gte(clicks.clickedAt, from),
      lte(clicks.clickedAt, to),
    ))
    .groupBy(clicks.device, clicks.browser)
    .orderBy(desc(count()));
}

export async function getWorkspaceOverview(workspaceId: string, from: Date, to: Date) {
  const [totalClicks] = await db.select({ value: count() })
    .from(clicks)
    .where(and(
      eq(clicks.workspaceId, workspaceId),
      eq(clicks.isBot, false),
      gte(clicks.clickedAt, from),
      lte(clicks.clickedAt, to),
    ));

  const [totalLinks] = await db.select({ value: count() })
    .from(links)
    .where(eq(links.workspaceId, workspaceId));

  return { totalClicks: totalClicks?.value ?? 0, totalLinks: totalLinks?.value ?? 0 };
}
