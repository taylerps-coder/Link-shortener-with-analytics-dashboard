import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, workspaceMembers } from '@linksnap/db';
import { eq } from 'drizzle-orm';
import { getWorkspaceOverview } from '@linksnap/db';

// GET /api/analytics/overview
export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [membership] = await db.select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers).where(eq(workspaceMembers.userId, userId)).limit(1);
  if (!membership) return NextResponse.json({ totalClicks: 0, totalLinks: 0 });

  const url = new URL(req.url);
  const from = new Date(url.searchParams.get('from') ?? new Date(Date.now() - 30 * 86400 * 1000).toISOString());
  const to = new Date(url.searchParams.get('to') ?? new Date().toISOString());

  const overview = await getWorkspaceOverview(membership.workspaceId, from, to);
  return NextResponse.json(overview);
}
