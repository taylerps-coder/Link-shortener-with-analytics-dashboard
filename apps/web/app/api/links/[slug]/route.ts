import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, links, workspaceMembers } from '@linksnap/db';
import { eq, and } from 'drizzle-orm';
import { invalidateCachedLink } from '@linksnap/redis';
import { z } from 'zod';

async function getLinkAndWorkspace(slug: string, userId: string) {
  const [membership] = await db.select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!membership) return null;

  const [link] = await db.select()
    .from(links)
    .where(and(eq(links.slug, slug), eq(links.workspaceId, membership.workspaceId)))
    .limit(1);

  return link ?? null;
}

// GET /api/links/[slug]
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const link = await getLinkAndWorkspace(params.slug, userId);
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(link);
}

const UpdateLinkSchema = z.object({
  title: z.string().max(255).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
});

// PATCH /api/links/[slug]
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = UpdateLinkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });

  const link = await getLinkAndWorkspace(params.slug, userId);
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.expiresAt !== undefined) updateData.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;

  const [updated] = await db.update(links)
    .set(updateData as any)
    .where(eq(links.id, link.id))
    .returning();

  // Invalidate cache so redirect worker gets fresh data
  await invalidateCachedLink(params.slug);

  return NextResponse.json(updated);
}

// DELETE /api/links/[slug]
export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const link = await getLinkAndWorkspace(params.slug, userId);
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Soft delete
  await db.update(links)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(links.id, link.id));

  await invalidateCachedLink(params.slug);

  return NextResponse.json({ success: true });
}
