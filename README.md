# 🔗 LinkSnap — URL Shortener with Analytics Dashboard

A production-ready link shortener with a full analytics dashboard. Built for speed — redirects run at the edge in ~50ms globally. Every click is tracked, enriched, and visualized.

---

## ✨ Features

- **URL shortening** — base62 slugs, custom slugs, vanity domains
- **Edge redirects** — Cloudflare Workers, sub-50ms globally
- **Analytics dashboard** — clicks over time, geo map, device breakdown, referrer sources
- **Custom domains** — bring your own domain with automated TLS via Cloudflare
- **Multi-tenancy** — workspaces, team members, role-based access
- **Rate limiting** — per-plan limits with sliding window algorithm
- **Bot filtering** — user-agent blocklist + headless browser detection
- **GDPR compliant** — IP hashing with daily rotating salt, no raw IPs stored
- **Link expiry** — set TTL per link, 410 Gone on expiry
- **API access** — REST API with API key auth for programmatic use

---

## 🛠 Tech Stack

| Layer | Choice | Why |
|---|---|---|
| API / redirect | Hono (edge) | Ultra-low latency, Cloudflare Workers native |
| Database | PostgreSQL + Drizzle ORM | Partitioned clicks table, partial indexes |
| Cache | Redis / Upstash | Two-level: in-process LRU + Redis |
| Analytics store | ClickHouse | Columnar, sub-second aggregations on billions of rows |
| Queue | BullMQ | Async click event pipeline, DNS verification jobs |
| Auth | Clerk + API keys | OAuth, magic link, hashed API keys |
| Frontend | Next.js + Recharts | SSR, composable chart components |
| Hosting | Cloudflare Workers + Vercel | Edge redirects, dashboard on Vercel |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- ClickHouse 23+ (optional — falls back to Postgres for analytics)

### 1. Clone and install

```bash
git clone https://github.com/your-username/linksnap.git
cd linksnap
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/linksnap

# Redis
REDIS_URL=redis://localhost:6379

# ClickHouse (optional)
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_DB=linksnap

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Cloudflare (for custom domains + TLS)
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ZONE_ID=...

# App
APP_DOMAIN=sho.rt
PROXY_CNAME_TARGET=proxy.sho.rt
```

### 3. Run migrations

```bash
npm run db:migrate
```

### 4. Start development

```bash
npm run dev          # Next.js dashboard on :3000
npm run dev:worker   # BullMQ analytics worker
npm run dev:redirect # Hono redirect server on :8787
```

---

## 📁 Project Structure

```
linksnap/
├── apps/
│   ├── web/              # Next.js dashboard (frontend + API routes)
│   └── redirect/         # Hono edge redirect server
├── packages/
│   ├── db/               # Drizzle schema, migrations, queries
│   ├── redis/            # Cache helpers, rate limiter, event buffer
│   ├── analytics/        # ClickHouse schema + query helpers
│   ├── queue/            # BullMQ workers (clicks, DNS verification)
│   └── utils/            # Slug generation, UA parsing, IP hashing
└── infra/                # Cloudflare Workers config, wrangler.toml
```

---

## 🏗 Architecture

```
Visitor
  │
  ▼
Cloudflare Edge (Hono Worker)
  ├── Lookup slug  →  L1 LRU cache → L2 Redis → PostgreSQL
  ├── Fire click event (async, non-blocking)  →  Redis buffer
  └── 302 redirect  →  Original URL

Redis Buffer
  └── BullMQ worker (every 5s)
        └── Enrich (geo, UA, referrer)  →  ClickHouse

Dashboard (Next.js)
  └── /api/analytics/*  →  ClickHouse materialized views
```

### Redirect latency breakdown

| Step | Latency |
|---|---|
| L1 in-process LRU hit | ~0.1ms |
| L2 Redis hit | ~2–5ms |
| DB fallback (rare) | ~10–20ms |
| Total p99 (warm cache) | < 10ms |

---

## 🗄 Database Schema

### Key tables

**`links`** — core mapping table
```sql
id, workspace_id, slug VARCHAR(16), original_url TEXT,
title, expires_at, active BOOL, created_at
```
Unique index on `(workspace_id, slug) WHERE active = true`

**`clicks`** — partitioned by month
```sql
id BIGINT, link_id, workspace_id, clicked_at,
country CHAR(2), device, browser, referrer_domain,
is_bot BOOL, ip_hash FixedString(32)
```

**`custom_domains`**
```sql
id, workspace_id, domain, status (pending|verifying|active|failed),
verified_at, created_at
```
Unique partial index on `(domain) WHERE status = 'active'`

---

## 🔌 API Reference

### Authentication

All API endpoints (except `GET /:slug`) require either:
- Session cookie (dashboard)
- `Authorization: Bearer <api_key>` header

### Endpoints

#### Links

```
POST   /api/links              Create a short link
GET    /api/links              List links (paginated)
GET    /api/links/:slug        Get link + summary stats
PATCH  /api/links/:slug        Update title / expiry / status
DELETE /api/links/:slug        Soft delete (keeps analytics)
```

**Create link — request body**
```json
{
  "url": "https://example.com/very/long/path",
  "slug": "my-slug",       // optional — auto-generated if omitted
  "title": "Campaign A",   // optional
  "expiresAt": "2025-12-31T00:00:00Z"  // optional
}
```

**Create link — response**
```json
{
  "slug": "aB3mK9pZ",
  "shortUrl": "https://sho.rt/aB3mK9pZ",
  "originalUrl": "https://example.com/very/long/path",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Analytics

```
GET /api/links/:slug/analytics          Click timeline
GET /api/links/:slug/analytics/geo      Clicks by country
GET /api/links/:slug/analytics/devices  Device / browser breakdown
GET /api/analytics/overview             Aggregate across all links
```

**Query parameters**
```
from=2024-01-01    ISO date, default: 30 days ago
to=2024-01-31      ISO date, default: today
interval=day       hour | day | week
```

#### Workspaces

```
POST /api/workspaces/:id/members        Invite member
GET  /api/workspaces/:id/api-keys       List API keys
POST /api/workspaces/:id/api-keys       Create API key
GET  /api/workspaces/:id/domains        List custom domains
POST /api/workspaces/:id/domains        Add custom domain
```

### Rate limits

| Plan | Links/month | API calls/hour |
|---|---|---|
| Free | 10 | 100 |
| Pro | 500 | 2,000 |
| Team | Unlimited | 10,000 |

Rate limit headers are returned on every response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 93
X-RateLimit-Reset: 1705312800
Retry-After: 47  (only on 429)
```

---

## 🌐 Custom Domains

### Setup (user-facing)

1. Add your domain in the dashboard under **Settings → Domains**
2. Add a CNAME record at your DNS provider:
   ```
   Type:  CNAME
   Name:  go   (or @ for apex)
   Value: proxy.sho.rt
   TTL:   300
   ```
3. Verification runs automatically — TLS is provisioned within ~2 minutes

### How verification works

The backend polls DNS with exponential backoff: 30s → 2m → 10m → 1h → 2h → 4h → 8h. On successful CNAME resolution, Cloudflare TLS is provisioned automatically via API. Max 8 attempts before marking as failed and notifying the user.

---

## 📊 Analytics

### What's tracked per click

| Field | Source | Notes |
|---|---|---|
| Country | `cf-ipcountry` header | Free from Cloudflare, no lookup needed |
| City | `cf-ipcity` header | Cloudflare |
| Device | User-Agent parsing | mobile / desktop / tablet |
| Browser | User-Agent parsing | Chrome, Safari, Firefox, etc. |
| OS | User-Agent parsing | |
| Referrer domain | `Referer` header | |
| Referrer type | Classified | social / search / direct / email / other |
| Is bot | UA blocklist | Dropped from analytics |
| IP hash | SHA-256 + daily salt | GDPR — raw IP never stored |

### Dashboard metrics

- **Click timeline** — hourly or daily, date range picker
- **Top countries** — bar chart
- **Device split** — mobile / desktop / tablet
- **Browser breakdown**
- **Referrer sources** — direct, Twitter, WhatsApp, LinkedIn, etc.
- **Day-of-week heatmap** — when your audience is online

---

## 🔒 Security

- Slugs generated with `crypto.getRandomValues` (CSPRNG) — not `Math.random()`
- API keys hashed with bcrypt before storage — full key shown once on creation
- IP addresses SHA-256 hashed with a daily rotating salt — irreversible, GDPR safe
- All URLs validated: `https://` and `http://` only, max 2048 chars, no `localhost`
- URLs scanned against Google Safe Browsing API on creation
- Rate limiting on all mutation endpoints via Redis sliding window
- Lua scripts for atomic Redis operations — no race conditions

---

## 🚢 Deployment

### Redirect worker (Cloudflare Workers)

```bash
npm run deploy:redirect
```

### Dashboard (Vercel)

```bash
vercel --prod
```

### Database migrations (run before deploying new code)

```bash
npm run db:migrate:prod
```

### Environment checklist

- [ ] `DATABASE_URL` points to production Postgres
- [ ] `REDIS_URL` points to Upstash or production Redis
- [ ] `CLICKHOUSE_URL` configured
- [ ] Cloudflare API token has `Zone:Edit` + `SSL and Certificates:Edit` permissions
- [ ] Clerk production keys set
- [ ] `APP_DOMAIN` set to your short domain

---

## 📈 Scaling notes

- **Clicks table** is partitioned by month — add new partitions monthly via a scheduled job
- **Redis** uses `allkeys-lru` eviction — cache grows to your `maxmemory` then evicts cold slugs
- **ClickHouse** materialized views (`clicks_daily_mv`, `clicks_country_mv`) keep dashboard queries under 10ms regardless of click volume
- **Redirect worker** is stateless — scales to zero, no cold start penalty on Cloudflare Workers

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a pull request

Please run `npm run lint && npm run test` before submitting.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
