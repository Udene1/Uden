# AI Work Partner

> A production-grade, multi-tenant, cost-aware AI collaboration system that intelligently routes tasks to the most appropriate model based on quality requirements and cost.

![Architecture](https://img.shields.io/badge/Architecture-Serverless-blue)
![Engine](https://img.shields.io/badge/Engine-Cloudflare_Workers-orange)
![Dashboard](https://img.shields.io/badge/Dashboard-Next.js_on_Vercel-black)
![License](https://img.shields.io/badge/License-MIT-green)

## What Is This?

AI Work Partner is not another chatbot wrapper. It's a **capable work partner** that helps you accomplish real work — writing, analysis, document drafting, coding, research, planning — by intelligently routing each task to the **cheapest model that can handle it well**, then automatically escalating to stronger models when quality checks fail.

### Key Capabilities

- **🧠 Intelligent Task Routing** — Analyzes task complexity, domain, and quality requirements to select the optimal model
- **🔍 Quality Detection & Escalation** — Detects low-quality outputs (refusals, truncation, repetition, format failures) and automatically retries with stronger models
- **📝 Universal Work Partner** — Handles documents, code, analysis, emails, research, planning — any knowledge work
- **💰 Cost-Aware** — Routes to the cheapest capable model first, tracks every cent, enforces budgets
- **🏢 Multi-Tenant** — Isolated workspaces, per-tenant budgets, quality preferences, and API key management
- **📊 Analytics Dashboard** — Real-time cost tracking, model distribution, escalation rates, and savings metrics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel — Dashboard                            │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Next.js 15   │  │  NextAuth v5 │  │  Recharts Analytics  │ │
│  │  App Router   │  │  Multi-tenant│  │  KPIs · Charts       │ │
│  └───────┬───────┘  └──────────────┘  └──────────────────────┘ │
└──────────┼──────────────────────────────────────────────────────┘
           │ HTTPS (API proxy via Next.js rewrites)
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Cloudflare Workers — Engine                      │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  Hono    │  │  Task      │  │  Quality  │  │  Cost       │  │
│  │  Router  │→ │  Classifier│→ │  Checker  │→ │  Tracker    │  │
│  │  + Auth  │  │  & Router  │  │  & Escal. │  │  & Budget   │  │
│  └──────────┘  └────────────┘  └──────────┘  └─────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Provider Adapters: OpenAI · Anthropic · Google · DeepSeek│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────┐  ┌─────────────┐                                  │
│  │  D1      │  │  KV         │    Storage Layer                 │
│  │  (SQLite)│  │  (Cache)    │                                  │
│  └──────────┘  └─────────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| **Engine runtime** | Cloudflare Workers | Serverless, edge-distributed, zero cold starts, built-in D1/KV |
| **Dashboard** | Next.js on Vercel | App Router for streaming, Server Components for performance |
| **API framework** | Hono | Lightweight (<15KB), TypeScript-first, designed for edge |
| **Database** | Cloudflare D1 | Serverless SQLite, zero-config, perfect for multi-tenant |
| **Auth (engine)** | API keys | Stateless, simple, no session management needed on Workers |
| **Auth (dashboard)** | NextAuth v5 | Flexible credential-based auth with session management |
| **Styling** | Vanilla CSS | Full control, CSS custom properties for theming, no build overhead |
| **Task classification** | Rule-based | No AI call overhead — keyword matching + heuristics |
| **Quality checks** | 8 heuristic checks | Fast, deterministic, no additional AI cost |

---

## Model Registry

The system supports 8 models across 3 tiers and 4 providers:

| Tier | Model | Provider | Input $/M | Output $/M | Best For |
|------|-------|----------|-----------|------------|----------|
| 1 (Budget) | Gemini 2.5 Flash | Google | $0.075 | $0.30 | Q&A, formatting |
| 1 (Budget) | GPT-4o Mini | OpenAI | $0.15 | $0.60 | Emails, basic code |
| 1 (Budget) | Claude Haiku | Anthropic | $0.25 | $1.25 | Quick drafts |
| 2 (Mid) | DeepSeek V3 | DeepSeek | $0.27 | $1.10 | Code, analysis |
| 2 (Mid) | o3-mini | OpenAI | $1.10 | $4.40 | Reasoning, math |
| 3 (Premium) | Gemini 2.5 Pro | Google | $1.25 | $10.00 | Research |
| 3 (Premium) | GPT-4o | OpenAI | $2.50 | $10.00 | Complex writing |
| 3 (Premium) | Claude Sonnet | Anthropic | $3.00 | $15.00 | Legal, precision |

### Routing Logic

```
User Task → Classify (complexity, domain) → Select Tier → Build Fallback Chain → Execute

Example for "Draft an NDA" (legal domain, high complexity):
  Classification: Tier 3, Domain: legal
  Tenant preference: balanced
  Route: Claude Sonnet → GPT-4o → Gemini Pro

Example for "Write a quick thank-you email":
  Classification: Tier 1, Domain: email
  Tenant preference: balanced
  Route: GPT-4o Mini → Gemini Flash → Haiku
```

### Quality Checks

| Check | Severity | Triggers Escalation? |
|-------|----------|---------------------|
| Empty/Minimal output | 🔴 Error | Yes |
| Refusal detected | 🔴 Error | Yes |
| Truncation | 🔴 Error | Yes |
| Excessive repetition | 🔴 Error | Yes |
| Format mismatch | 🟡 Warning | Only if score < 60 |
| Instruction failure | 🟡 Warning | Only if score < 60 |
| Length inadequacy | 🟡 Warning | Only if score < 60 |
| Language mismatch | 🔴 Error | Yes |

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+
- Cloudflare account (for engine deployment)
- Vercel account (for dashboard deployment)
- API keys for at least one AI provider (OpenAI, Anthropic, or Google)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/ai-work-partner.git
cd ai-work-partner
npm install
```

### 2. Configure Engine Secrets

```bash
cd packages/engine

# Create local dev secrets
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your API keys:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_AI_API_KEY=AIza...
# DEEPSEEK_API_KEY=sk-...
```

### 3. Set Up Database

```bash
# Create local D1 database and apply migrations
npx wrangler d1 execute DB --local --file=src/db/schema.sql
```

### 4. Start Development

```bash
# From project root — starts both engine and dashboard
npm run dev

# Or individually:
npm run dev:engine    # Starts Wrangler dev server on :8787
npm run dev:dashboard # Starts Next.js dev server on :3000
```

### 5. Register a Tenant

```bash
curl -X POST http://localhost:8787/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "My Workspace", "email": "me@example.com"}'

# Response includes your API key — save it!
```

### 6. Submit Your First Task

```bash
curl -X POST http://localhost:8787/api/v1/tasks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a professional follow-up email after a sales meeting"}'
```

---

## Deployment

### Deploy Engine to Cloudflare Workers

```bash
cd packages/engine

# Create D1 database
npx wrangler d1 create ai-work-partner-db
# Update wrangler.jsonc with the database_id

# Create KV namespace
npx wrangler kv namespace create CACHE_KV
# Update wrangler.jsonc with the namespace id

# Set secrets
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put GOOGLE_AI_API_KEY
npx wrangler secret put DEEPSEEK_API_KEY

# Apply database migrations
npx wrangler d1 execute DB --remote --file=src/db/schema.sql

# Deploy
npx wrangler deploy
```

### Deploy Dashboard to Vercel

```bash
cd packages/dashboard

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_ENGINE_URL=https://your-worker.your-subdomain.workers.dev
# NEXTAUTH_SECRET=your-random-secret
# NEXTAUTH_URL=https://your-dashboard.vercel.app
```

---

## Work Modes

### Permissionless Mode
Task is executed immediately and results are returned. Best for:
- Quick emails and drafts
- Q&A and lookups
- Code snippets
- Data formatting

### Permission-Based Mode
The system proposes an action plan with estimated cost before executing. The user must approve. Best for:
- Legal documents and contracts
- High-cost tasks (premium models)
- Significant code changes
- Formal reports and proposals

Both modes are configurable per-tenant (default) and overridable per-task.

---

## API Reference

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/tasks` | Create and execute a task |
| `GET` | `/api/v1/tasks` | List tasks (paginated) |
| `GET` | `/api/v1/tasks/:id` | Get task detail |
| `POST` | `/api/v1/tasks/:id/approve` | Approve permission-based task |

### Tenants
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/tenants` | Register new tenant |
| `GET` | `/api/v1/tenant` | Get current tenant |
| `PUT` | `/api/v1/tenant` | Update settings |
| `POST` | `/api/v1/tenant/rotate-key` | Rotate API key |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/projects` | Create project |
| `GET` | `/api/v1/projects` | List projects |
| `GET` | `/api/v1/projects/:id` | Get project detail |

### Usage
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/usage/summary` | Monthly usage summary |
| `GET` | `/api/v1/usage/daily` | Daily usage breakdown |

---

## Extending the System

### Adding a New AI Provider

1. Create a new adapter in `packages/engine/src/services/providers/`
2. Implement the `ProviderRequest → ProviderResponse` interface
3. Register the provider's models in `packages/shared/src/models.ts`
4. Add the provider to the factory in `providers/index.ts`

### Adding a New Quality Check

1. Add your check function to `packages/engine/src/services/quality.ts`
2. Follow the `QualityCheckResult` interface
3. Include it in the `runAllChecks()` function

### Adjusting Routing Logic

The routing logic lives in `packages/engine/src/services/router.ts` and `packages/shared/src/models.ts`. You can:
- Modify `getDefaultRoutingChain()` to change fallback behavior
- Adjust tier boundaries in the classifier
- Add custom routing rules for specific domains

---

## Project Structure

```
ai-work-partner/
├── packages/
│   ├── shared/              # Shared types, model registry, constants
│   │   └── src/
│   │       ├── types.ts     # All domain types
│   │       ├── models.ts    # Model registry & pricing
│   │       └── constants.ts # Thresholds, patterns, keywords
│   │
│   ├── engine/              # Cloudflare Workers — AI engine
│   │   └── src/
│   │       ├── index.ts     # Hono app entry point
│   │       ├── routes/      # API route handlers
│   │       ├── services/    # Business logic
│   │       ├── middleware/   # Auth, CORS, rate limiting
│   │       └── db/          # Schema & queries
│   │
│   └── dashboard/           # Next.js — analytics dashboard
│       └── src/
│           ├── app/         # App Router pages
│           ├── components/  # UI & chart components
│           └── lib/         # API client, auth, utilities
│
├── package.json             # Workspace root
└── tsconfig.base.json       # Shared TypeScript config
```

---

## License

MIT

---

Built with ❤️ for cost-conscious AI practitioners.
