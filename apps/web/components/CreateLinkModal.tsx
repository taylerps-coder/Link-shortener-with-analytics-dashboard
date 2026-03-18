'use client';

import { useState } from 'react';

interface CreateLinkModalProps {
  workspaceId: string;
  onClose: () => void;
  onCreated: (link: any) => void;
}

export default function CreateLinkModal({ workspaceId, onClose, onCreated }: CreateLinkModalProps) {
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          slug: slug || undefined,
          title: title || undefined,
          expiresAt: expiresAt || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as any).error ?? 'Failed to create link');
        return;
      }

      const link = await res.json();
      onCreated(link);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#111118', border: '1px solid #252535', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, animation: 'slideUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8e8f0' }}>Create Short Link</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: '#6b6b8a', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a0a0c0', marginBottom: 8 }}>Destination URL *</label>
            <input
              id="link-url-input"
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/your/long/url"
              style={{ width: '100%', padding: '10px 14px', background: '#0a0a0f', border: '1px solid #252535', borderRadius: 8, color: '#e8e8f0', fontSize: 14, outline: 'none' }}
              onFocus={e => (e.target.style.borderColor = '#6c63ff')}
              onBlur={e => (e.target.style.borderColor = '#252535')}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a0a0c0', marginBottom: 8 }}>Custom Slug <span style={{ color: '#4a4a6a' }}>(optional)</span></label>
            <input
              id="link-slug-input"
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="my-custom-slug"
              pattern="[a-zA-Z0-9-]{3,50}"
              style={{ width: '100%', padding: '10px 14px', background: '#0a0a0f', border: '1px solid #252535', borderRadius: 8, color: '#e8e8f0', fontSize: 14, outline: 'none' }}
              onFocus={e => (e.target.style.borderColor = '#6c63ff')}
              onBlur={e => (e.target.style.borderColor = '#252535')}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a0a0c0', marginBottom: 8 }}>Title <span style={{ color: '#4a4a6a' }}>(optional)</span></label>
              <input
                id="link-title-input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Campaign A"
                style={{ width: '100%', padding: '10px 14px', background: '#0a0a0f', border: '1px solid #252535', borderRadius: 8, color: '#e8e8f0', fontSize: 14, outline: 'none' }}
                onFocus={e => (e.target.style.borderColor = '#6c63ff')}
                onBlur={e => (e.target.style.borderColor = '#252535')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a0a0c0', marginBottom: 8 }}>Expires At <span style={{ color: '#4a4a6a' }}>(optional)</span></label>
              <input
                id="link-expires-input"
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', background: '#0a0a0f', border: '1px solid #252535', borderRadius: 8, color: '#e8e8f0', fontSize: 14, outline: 'none', colorScheme: 'dark' }}
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 8, color: '#ff4d6d', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: '#1a1a28', border: '1px solid #252535', borderRadius: 8, color: '#a0a0c0', fontSize: 14, fontWeight: 500 }}>
              Cancel
            </button>
            <button
              id="create-link-submit"
              type="submit"
              disabled={loading}
              style={{ padding: '10px 24px', background: loading ? '#3a3560' : 'linear-gradient(135deg, #6c63ff, #5a52e8)', borderRadius: 8, color: 'white', fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating…' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
