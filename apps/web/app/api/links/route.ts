import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, links, workspaceMembers } from '@linksnap/db';
import { eq, and } from 'drizzle-orm';
import { generateSlug, isValidSlug, isValidUrl } from '@linksnap/utils';
import { checkRateLimit, invalidateCachedLink } from '@linksnap/redis';
import { ulid } from 'ulid';
import { z } from 'zod';

const CreateLinkSchema = z.object({
  url: z.string().url().max(2048),
  slug: z.string().regex(/^[a-zA-Z0-9-]{3,50}$/).optional(),
  title: z.string().max(255).optional(),
  expiresAt: z.string().datetime().optional(),
});

async function getWorkspaceForUser(userId: string): Promise<{ workspaceId: string; plan: string } | null> {
  const [membership] = await db.select({
    workspaceId: workspaceMembers.workspaceId,
  })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!membership) return null;

  // TODO: join with workspace for plan; default to 'free' for now
  return { workspaceId: membership.workspaceId, plan: 'free' };
}

// POST /api/links — Create a short link
export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspace = await getWorkspaceForUser(userId);
  if (!workspace) {
    return NextResponse.json({ error: 'No workspace found. Complete onboarding first.' }, { status: 400 });
  }

  // Rate limit
  const rl = await checkRateLimit(workspace.workspaceId, 'links', workspace.plan as any);
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', reset: rl.reset },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': String(rl.remaining),
          'X-RateLimit-Reset': String(rl.reset),
          'Retry-After': String(rl.reset - Math.floor(Date.now() / 1000)),
        },
      }
    );
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CreateLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const { url, slug: customSlug, title, expiresAt } = parsed.data;

  if (!isValidUrl(url)) {
    return NextResponse.json({ error: 'URL must use http:// or https://, max 2048 chars, and cannot be localhost.' }, { status: 422 });
  }

  const slug = customSlug ?? generateSlug(8);

  if (customSlug && !isValidSlug(customSlug)) {
    return NextResponse.json({ error: 'Slug must be 3-50 alphanumeric characters or hyphens.' }, { status: 422 });
  }

  // Check slug uniqueness
  const existing = await db.select({ id: links.id })
    .from(links)
    .where(and(eq(links.workspaceId, workspace.workspaceId), eq(links.slug, slug), eq(links.active, true)))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
  }

  const id = ulid();

  await db.insert(links).values({
    id,
    workspaceId: workspace.workspaceId,
    slug,
    originalUrl: url,
    title: title ?? null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });

  const [newLink] = await db.select().from(links).where(eq(links.id, id)).limit(1);

  const appDomain = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sho.rt';

  return NextResponse.json({
    ...newLink,
    shortUrl: `${appDomain}/${slug}`,
  }, { status: 201 });
}

// GET /api/links — List links for the current workspace
export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspace = await getWorkspaceForUser(userId);
  if (!workspace) return NextResponse.json({ links: [] });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  const { getLinksByWorkspace } = await import('@linksnap/db');
  const results = await getLinksByWorkspace(workspace.workspaceId, limit, offset);

  return NextResponse.json({ links: results, offset, limit });
}
