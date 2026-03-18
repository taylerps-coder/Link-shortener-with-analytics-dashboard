import { NextRequest, NextResponse } from 'next/server';
import { db, links } from '@linksnap/db';
import { and, eq } from 'drizzle-orm';

// Internal route — called by the Cloudflare redirect worker
// Security: protected by X-Internal-Token header (should be a dedicated secret in prod)
function isInternalRequest(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.DATABASE_URL; // Use a dedicated INTERNAL_SECRET in production
  return token === expected;
}

// GET /api/internal/links/[slug]
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!isInternalRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [link] = await db.select({
    id: links.id,
    originalUrl: links.originalUrl,
    expiresAt: links.expiresAt,
    active: links.active,
  })
    .from(links)
    .where(and(eq(links.slug, params.slug), eq(links.active, true)))
    .limit(1);

  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(link);
}
