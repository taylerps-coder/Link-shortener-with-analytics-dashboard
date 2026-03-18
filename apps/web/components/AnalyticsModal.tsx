'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import type { links } from '@linksnap/db';
import type { InferSelectModel } from 'drizzle-orm';

type Link = InferSelectModel<typeof links>;

interface AnalyticsModalProps {
  link: Link;
  onClose: () => void;
}

const COLORS = ['#6c63ff', '#00d4aa', '#ff9f43', '#ff4d6d', '#48dbfb', '#ff6b9d'];

export default function AnalyticsModal({ link, onClose }: AnalyticsModalProps) {
  const [tab, setTab] = useState<'timeline' | 'geo' | 'devices'>('timeline');
  const [range, setRange] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = new Date();
    if (range === '7d') from.setDate(from.getDate() - 7);
    else if (range === '30d') from.setDate(from.getDate() - 30);
    else if (range === '90d') from.setDate(from.getDate() - 90);

    setLoading(true);
    fetch(`/api/links/${link.slug}/analytics/${tab}?from=${from.toISOString()}&to=${new Date().toISOString()}&interval=${range === '7d' ? 'hour' : 'day'}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab, range, link.slug]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#111118', border: '1px solid #252535', borderRadius: 20, padding: 32, width: '100%', maxWidth: 860, maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8e8f0', marginBottom: 4 }}>Analytics</h2>
            <div style={{ fontSize: 14, color: '#6c63ff' }}>{link.slug}</div>
            <div style={{ fontSize: 12, color: '#4a4a6a', marginTop: 4, maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.originalUrl}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#6b6b8a', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Clicks', value: link.clickCount.toLocaleString() },
            { label: 'Created', value: new Date(link.createdAt).toLocaleDateString() },
            { label: 'Status', value: link.active ? 'Active' : 'Inactive' },
          ].map(s => (
            <div key={s.label} style={{ background: '#0a0a0f', borderRadius: 10, padding: '16px 20px', border: '1px solid #1e1e2e' }}>
              <div style={{ fontSize: 13, color: '#6b6b8a', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e8e8f0' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['timeline', 'geo', 'devices'] as const).map(t => (
              <button
                key={t}
                id={`analytics-tab-${t}`}
                onClick={() => setTab(t)}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: tab === t ? '#6c63ff' : '#1a1a28', color: tab === t ? 'white' : '#a0a0c0', border: `1px solid ${tab === t ? '#6c63ff' : '#252535'}` }}
              >
                {t === 'timeline' ? 'Timeline' : t === 'geo' ? 'Countries' : 'Devices'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['7d', '30d', '90d'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, background: range === r ? '#1a1a28' : 'transparent', color: range === r ? '#e8e8f0' : '#6b6b8a', border: `1px solid ${range === r ? '#252535' : 'transparent'}` }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: 300, background: '#0a0a0f', borderRadius: 12, padding: 16, border: '1px solid #1e1e2e' }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4a6a' }}>Loading…</div>
          ) : !data || (Array.isArray(data) && data.length === 0) ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4a6a' }}>No data for this period.</div>
          ) : tab === 'timeline' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="period" tick={{ fill: '#6b6b8a', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b6b8a', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1a1a28', border: '1px solid #252535', borderRadius: 8, color: '#e8e8f0' }} />
                <Line type="monotone" dataKey="clicks" stroke="#6c63ff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : tab === 'geo' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Array.isArray(data) ? data.slice(0, 15) : []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="country" tick={{ fill: '#6b6b8a', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b6b8a', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1a1a28', border: '1px solid #252535', borderRadius: 8, color: '#e8e8f0' }} />
                <Bar dataKey="clicks" fill="#6c63ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={Array.isArray(data) ? data : []} dataKey="clicks" nameKey="device" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {(Array.isArray(data) ? data : []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a28', border: '1px solid #252535', borderRadius: 8, color: '#e8e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
