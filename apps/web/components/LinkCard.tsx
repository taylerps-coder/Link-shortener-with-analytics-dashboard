'use client';

import { useState } from 'react';
import type { links } from '@linksnap/db';
import type { InferSelectModel } from 'drizzle-orm';

type Link = InferSelectModel<typeof links>;

interface LinkCardProps {
  link: Link;
  onViewAnalytics: () => void;
  onDeleted: () => void;
}

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sho.rt';

export default function LinkCard({ link, onViewAnalytics, onDeleted }: LinkCardProps) {
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const shortUrl = `${APP_DOMAIN}/${link.slug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shortUrl);
    setCopying(true);
    setTimeout(() => setCopying(false), 1500);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this link? This action cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/links/${link.slug}`, { method: 'DELETE' });
      if (res.ok) onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 12, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#6c63ff')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e2e')}
    >
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#6c63ff' }}>{shortUrl}</span>
          {link.title && <span style={{ fontSize: 12, color: '#6b6b8a', background: '#1a1a28', padding: '2px 8px', borderRadius: 100 }}>{link.title}</span>}
          {!link.active && <span style={{ fontSize: 11, color: '#ff4d6d', background: 'rgba(255,77,109,0.12)', padding: '2px 8px', borderRadius: 100 }}>inactive</span>}
        </div>
        <div style={{ fontSize: 13, color: '#5a5a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {link.originalUrl}
        </div>
        <div style={{ fontSize: 12, color: '#4a4a6a', marginTop: 6, display: 'flex', gap: 16 }}>
          <span>{link.clickCount.toLocaleString()} clicks</span>
          <span>Created {new Date(link.createdAt).toLocaleDateString()}</span>
          {link.expiresAt && <span style={{ color: '#ff9f43' }}>Expires {new Date(link.expiresAt).toLocaleDateString()}</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          id={`copy-${link.slug}`}
          onClick={handleCopy}
          style={{ padding: '7px 14px', background: copying ? 'rgba(0,212,170,0.15)' : '#1a1a28', border: '1px solid #252535', borderRadius: 8, color: copying ? '#00d4aa' : '#a0a0c0', fontSize: 13, fontWeight: 500 }}
        >
          {copying ? '✓ Copied' : 'Copy'}
        </button>
        <button
          id={`analytics-${link.slug}`}
          onClick={onViewAnalytics}
          style={{ padding: '7px 14px', background: '#1a1a28', border: '1px solid #252535', borderRadius: 8, color: '#a0a0c0', fontSize: 13, fontWeight: 500 }}
        >
          Analytics
        </button>
        <button
          id={`delete-${link.slug}`}
          onClick={handleDelete}
          disabled={deleting}
          style={{ padding: '7px 14px', background: '#1a1a28', border: '1px solid #252535', borderRadius: 8, color: '#ff4d6d', fontSize: 13, fontWeight: 500, opacity: deleting ? 0.5 : 1 }}
        >
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
