# Medula - Ads Analytics Platform

A production-ready, multi-tenant advertising analytics platform that syncs data from Google Ads (and more coming soon) into a local data warehouse for fast, reliable dashboards.

![Medula Dashboard](https://via.placeholder.com/800x400?text=Medula+Dashboard)

## Features

- **Multi-tenant Architecture** - Organizations with role-based access control
- **OAuth2 Integration** - Secure Google Ads connection with encrypted tokens
- **Persisted Sync Model** - Data synced on schedule, stored locally for fast queries
- **Background Workers** - BullMQ-powered job queue for reliable data fetching
- **Rate Limiting** - Redis token buckets to stay within API limits
- **Beautiful Dashboard** - Modern React/Next.js frontend with real-time metrics
- **Unified Metrics** - Normalized data across multiple ad platforms

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js       │     │   Express API   │     │   PostgreSQL    │
│   Frontend      │────▶│   Server        │────▶│   Database      │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
           ┌─────────────────┐       ┌─────────────────┐
           │   Redis         │       │   BullMQ        │
           │   Cache/Queue   │       │   Workers       │
           └─────────────────┘       └────────┬────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │   Google Ads    │
                                     │   API           │
                                     └─────────────────┘
```

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Google Ads API credentials (Developer Token, OAuth2 Client ID/Secret)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd ReportingDashboard
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ads_analytics?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key"

# Google OAuth2 Credentials
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:4000/api/oauth/google/callback"

# Google Ads API
GOOGLE_ADS_DEVELOPER_TOKEN="your-google-ads-developer-token"

# Application URLs
API_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"

# Encryption Key (generate with: openssl rand -base64 32)
ENCRYPTION_KEY="your-32-byte-encryption-key"
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# (Optional) Include debugging tools (pgAdmin, Redis Commander)
docker-compose --profile debug up -d
```

### 4. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 5. Start Development Servers

```bash
# Start all services (API, Workers, Frontend)
npm run dev
```

Or start individually:

```bash
# Terminal 1: API Server
npm run dev:api

# Terminal 2: Background Workers
npm run dev:workers

# Terminal 3: Frontend
npm run dev:frontend
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **pgAdmin** (debug mode): http://localhost:5050
- **Redis Commander** (debug mode): http://localhost:8081

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Get current user |

### OAuth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/oauth/google/authorize` | Get OAuth URL |
| GET | `/api/oauth/google/callback` | OAuth callback |
| GET | `/api/oauth/google/status` | Connection status |
| GET | `/api/oauth/google/customers` | List accessible accounts |
| DELETE | `/api/oauth/google/disconnect` | Disconnect |

### Ad Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List accounts |
| POST | `/api/accounts/link` | Link accounts |
| PATCH | `/api/accounts/:id` | Update account |
| DELETE | `/api/accounts/:id` | Disable account |

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics` | Query metrics |
| GET | `/api/metrics/summary` | Summary stats |
| GET | `/api/metrics/top-campaigns` | Top performers |

### Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync/status` | Sync status |
| GET | `/api/sync/jobs` | Job history |
| POST | `/api/sync/manual` | Trigger sync |
| GET | `/api/sync/queue-stats` | Queue stats |

## Configuration

### Google Ads API Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google Ads API
3. Create OAuth2 credentials
4. Apply for a Developer Token in Google Ads
5. Add credentials to `.env`

### Sync Schedule

The system supports multiple sync types:

- **Initial Sync**: Fetches last 90 days when an account is first linked
- **Daily Sync**: Runs at 6 AM to fetch yesterday's and today's data
- **Intraday Sync**: Optional hourly sync for real-time spend tracking
- **Manual Sync**: Triggered by admin from the UI

## Data Model

### Core Tables

- `users` - User accounts
- `organizations` - Multi-tenant workspaces
- `memberships` - User-org relationships with roles
- `connections` - OAuth connections (encrypted tokens)
- `ad_accounts` - Linked advertising accounts
- `campaigns` - Campaign metadata
- `ad_groups` - Ad group metadata
- `ads` - Ad metadata
- `metrics_fact` - Daily performance metrics
- `sync_jobs` - Sync job history

### Key Metrics

| Metric | Description |
|--------|-------------|
| `impressions` | Ad views |
| `clicks` | Ad clicks |
| `spend` | Cost in account currency |
| `conversions` | Conversion events |
| `conversionValue` | Value of conversions |
| `cpc` | Cost per click (derived) |
| `ctr` | Click-through rate (derived) |
| `cpm` | Cost per thousand impressions (derived) |
| `roas` | Return on ad spend (derived) |

## Security

- Passwords hashed with Argon2
- JWT tokens for API authentication
- OAuth tokens encrypted with AES-256-GCM
- Rate limiting on all endpoints
- Role-based access control (Admin/Viewer)

## Development

### Database Management

```bash
# Open Prisma Studio
npm run db:studio

# Create migration
npx prisma migrate dev --name your_migration_name

# Reset database
npx prisma migrate reset
```

### Testing

```bash
npm run lint
npm run typecheck
```

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables for Production

- Set `NODE_ENV=production`
- Use strong secrets for `JWT_SECRET` and `ENCRYPTION_KEY`
- Use managed PostgreSQL (e.g., AWS RDS, Supabase)
- Use managed Redis (e.g., AWS ElastiCache, Upstash)

## Roadmap

- [ ] Meta Ads integration
- [ ] TikTok Ads integration
- [ ] LinkedIn Ads integration
- [ ] Custom date ranges and comparisons
- [ ] Export to CSV/Excel
- [ ] Scheduled email reports
- [ ] Budget alerts
- [ ] Custom dashboards

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

---

Built with Next.js, Express, Prisma, and BullMQ
