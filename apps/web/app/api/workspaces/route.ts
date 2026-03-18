import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, workspaces, workspaceMembers } from '@linksnap/db';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

const CreateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
});

// POST /api/workspaces — Create workspace + add calling user as owner
export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check if user already has a workspace
  const existing = await db.select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: 'You already have a workspace.' }, { status: 409 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = CreateWorkspaceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });

  const { name } = parsed.data;
  const id = ulid();
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(-4).toLowerCase();

  await db.insert(workspaces).values({ id, name, slug, plan: 'free' });
  await db.insert(workspaceMembers).values({ workspaceId: id, userId, role: 'owner' });

  return NextResponse.json({ id, name, slug }, { status: 201 });
}
