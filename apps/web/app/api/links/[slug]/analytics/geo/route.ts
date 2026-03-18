import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, links, workspaceMembers } from '@linksnap/db';
import { eq, and } from 'drizzle-orm';
import { getClicksByCountry } from '@linksnap/db';

async function getWorkspaceLink(slug: string, userId: string) {
  const [membership] = await db.select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers).where(eq(workspaceMembers.userId, userId)).limit(1);
  if (!membership) return null;
  const [link] = await db.select().from(links)
    .where(and(eq(links.slug, slug), eq(links.workspaceId, membership.workspaceId))).limit(1);
  return link ?? null;
}

// GET /api/links/[slug]/analytics/geo
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const link = await getWorkspaceLink(params.slug, userId);
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(req.url);
  const from = new Date(url.searchParams.get('from') ?? new Date(Date.now() - 30 * 86400 * 1000).toISOString());
  const to = new Date(url.searchParams.get('to') ?? new Date().toISOString());

  const data = await getClicksByCountry(link.id, from, to);
  return NextResponse.json(data);
}
