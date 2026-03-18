import { NextRequest, NextResponse } from 'next/server';
import { bufferClickEvent } from '@linksnap/redis';

function isInternalRequest(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  return token === process.env.DATABASE_URL;
}

// POST /api/internal/clicks — called by redirect worker to buffer click events
export async function POST(req: NextRequest) {
  if (!isInternalRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const event = body as any;

  await bufferClickEvent({
    linkId: event.linkId,
    workspaceId: event.workspaceId ?? '',
    slug: event.slug ?? '',
    clickedAt: event.clickedAt ?? new Date().toISOString(),
    country: event.country,
    city: event.city,
    device: event.device,
    browser: event.browser,
    os: event.os,
    referrerDomain: event.referrerDomain,
    referrerType: event.referrerType,
    isBot: event.isBot ?? false,
    ipHash: event.ipHash,
  });

  return NextResponse.json({ ok: true });
}
