import Link from 'next/link';

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d1f 50%, #0a0a0f 100%)' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px', borderBottom: '1px solid #1a1a2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: '#e8e8f0' }}>LinkSnap</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/sign-in" style={{ color: '#a0a0c0', fontSize: 14, fontWeight: 500 }}>Sign in</Link>
          <Link href="/sign-up" style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #6c63ff, #5a52e8)', borderRadius: 8, color: 'white', fontSize: 14, fontWeight: 600, letterSpacing: '0.2px' }}>
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '100px 48px 80px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(108, 99, 255, 0.12)', border: '1px solid rgba(108, 99, 255, 0.3)', borderRadius: 100, marginBottom: 32, fontSize: 13, color: '#9d97ff' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6c63ff', display: 'inline-block' }} />
          Free to start. No credit card required.
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', color: '#e8e8f0', marginBottom: 24 }}>
          Short links.{' '}
          <span style={{ background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Deep analytics.
          </span>
        </h1>
        <p style={{ fontSize: 19, color: '#7070a0', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 48px', fontWeight: 400 }}>
          Create branded short links in seconds. Track every click with geo, device, and referrer data in real time.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/sign-up" style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #6c63ff, #5a52e8)', borderRadius: 10, color: 'white', fontSize: 16, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Start shortening for free →
          </Link>
          <Link href="#features" style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e8e8f0', fontSize: 16, fontWeight: 500 }}>
            See features
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '0 48px 80px', flexWrap: 'wrap' }}>
        {[
          { label: 'Redirect latency', value: '< 10ms', sub: 'p99 globally' },
          { label: 'Click events tracked', value: '1B+', sub: 'supported at scale' },
          { label: 'Countries tracked', value: '240+', sub: 'geo analytics' },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#6c63ff', letterSpacing: '-1px' }}>{stat.value}</div>
            <div style={{ fontSize: 14, color: '#6b6b8a', marginTop: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 12, color: '#4a4a6a', marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 100px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, marginBottom: 64, color: '#e8e8f0', letterSpacing: '-1px' }}>
          Everything you need.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {[
            { icon: '⚡', title: 'Edge Redirects', desc: 'Cloudflare Workers power every redirect. Sub-10ms globally, always-on.' },
            { icon: '📊', title: 'Real-time Analytics', desc: 'See who clicked, from where, on what device, and via which source.' },
            { icon: '🌐', title: 'Custom Domains', desc: 'Bring your own domain with automated TLS provisioning.' },
            { icon: '🔒', title: 'GDPR Compliant', desc: 'IPs are SHA-256 hashed with daily rotating salt. Never stored raw.' },
            { icon: '🤝', title: 'Team Workspaces', desc: 'Invite teammates, assign roles, and collaborate on links.' },
            { icon: '🔌', title: 'REST API', desc: 'Build on top of LinkSnap with API key auth and rate-limited endpoints.' },
          ].map(f => (
            <div key={f.title} style={{ padding: 28, background: '#111118', border: '1px solid #1e1e2e', borderRadius: 14, transition: 'border-color 0.2s' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#e8e8f0', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: '#6b6b8a', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1a1a2e', padding: '32px 48px', textAlign: 'center', color: '#4a4a6a', fontSize: 13 }}>
        © {new Date().getFullYear()} LinkSnap · MIT License
      </footer>
    </main>
  );
}
