'use client';

import { useState, useCallback } from 'react';
import { UserButton } from '@clerk/nextjs';
import LinkCard from '@/components/LinkCard';
import CreateLinkModal from '@/components/CreateLinkModal';
import AnalyticsModal from '@/components/AnalyticsModal';
import type { links } from '@linksnap/db';
import type { InferSelectModel } from 'drizzle-orm';

type Link = InferSelectModel<typeof links>;

interface DashboardClientProps {
  workspaceId: string;
  initialLinks: Link[];
  userId: string;
}

export default function DashboardClient({ workspaceId, initialLinks, userId }: DashboardClientProps) {
  const [linkList, setLinkList] = useState<Link[]>(initialLinks);
  const [showCreate, setShowCreate] = useState(false);
  const [analyticsLink, setAnalyticsLink] = useState<Link | null>(null);
  const [search, setSearch] = useState('');

  const filtered = linkList.filter(l =>
    l.slug.includes(search) || l.originalUrl.includes(search) || (l.title ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleLinkCreated = useCallback((newLink: Link) => {
    setLinkList(prev => [newLink, ...prev]);
    setShowCreate(false);
  }, []);

  const handleLinkDeleted = useCallback((id: string) => {
    setLinkList(prev => prev.filter(l => l.id !== id));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <header style={{ background: '#111118', borderBottom: '1px solid #1e1e2e', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LinkIcon size={14} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#e8e8f0', letterSpacing: '-0.5px' }}>LinkSnap</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            id="create-link-btn"
            onClick={() => setShowCreate(true)}
            style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #6c63ff, #5a52e8)', borderRadius: 8, color: 'white', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            + New Link
          </button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Body */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <input
            id="link-search"
            type="text"
            placeholder="Search links…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 480, padding: '10px 16px', background: '#111118', border: '1px solid #252535', borderRadius: 8, color: '#e8e8f0', fontSize: 14, outline: 'none' }}
          />
        </div>

        {/* Links Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#4a4a6a' }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>No links yet.</p>
            <p style={{ fontSize: 14 }}>Click <strong style={{ color: '#6c63ff' }}>+ New Link</strong> to create your first short link.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(link => (
              <LinkCard
                key={link.id}
                link={link}
                onViewAnalytics={() => setAnalyticsLink(link)}
                onDeleted={() => handleLinkDeleted(link.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showCreate && (
        <CreateLinkModal
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={handleLinkCreated}
        />
      )}
      {analyticsLink && (
        <AnalyticsModal
          link={analyticsLink}
          onClose={() => setAnalyticsLink(null)}
        />
      )}
    </div>
  );
}

function LinkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}
