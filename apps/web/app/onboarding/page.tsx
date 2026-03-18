'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as any).error ?? 'Failed to create workspace');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111118', border: '1px solid #252535', borderRadius: 20, padding: 48, width: '100%', maxWidth: 440, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#e8e8f0', marginBottom: 8 }}>Create your workspace</h1>
        <p style={{ fontSize: 14, color: '#6b6b8a', marginBottom: 36, lineHeight: 1.7 }}>
          Give your workspace a name to get started. You can always change it later.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            id="workspace-name-input"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Acme Corp"
            minLength={2}
            maxLength={100}
            style={{ width: '100%', padding: '12px 16px', background: '#0a0a0f', border: '1px solid #252535', borderRadius: 10, color: '#e8e8f0', fontSize: 15, outline: 'none', marginBottom: 16, textAlign: 'center' }}
            onFocus={e => (e.target.style.borderColor = '#6c63ff')}
            onBlur={e => (e.target.style.borderColor = '#252535')}
          />
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 8, color: '#ff4d6d', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button
            id="create-workspace-btn"
            type="submit"
            disabled={loading || !name.trim()}
            style={{ width: '100%', padding: '13px', background: loading ? '#3a3560' : 'linear-gradient(135deg, #6c63ff, #5a52e8)', borderRadius: 10, color: 'white', fontSize: 15, fontWeight: 600, opacity: loading || !name.trim() ? 0.7 : 1 }}
          >
            {loading ? 'Creating…' : 'Create Workspace →'}
          </button>
        </form>
      </div>
    </div>
  );
}
