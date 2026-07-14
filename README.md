# AssessSphere — Product Quality Assessment System (PQAS)

A role-based quality management platform for manufacturing: inspection plans and reports,
supplier evaluation, calibration tracking, document management, and an AI layer (compliance
copilot, auto-generated findings/CAPA, gap analysis, risk scoring, predictive compliance, and
more) laid on top of the core workflow.

Full breakdown of every technology choice and why — see **[TECH_STACK.md](./TECH_STACK.md)**.

## Architecture

```
React SPA (Vite, :5173)  ──HTTP──▶  Express API (:3001)  ──▶  MongoDB (Atlas)
                                          │
                                          ├──▶ Google Gemini  (structured AI features)
                                          └──▶ Groq           (streaming copilot chat)
```

- **Frontend** — React 18 + TypeScript + Vite, Tailwind CSS, Framer Motion, React Router v6.
- **Backend** — Express 5 + Mongoose 9 (MongoDB), JWT auth, tsx runtime.
- **AI layer** — Gemini (`gemini-flash-latest`) for structured/JSON generation, Groq
  (`llama-3.3-70b-versatile`) for the low-latency streaming copilot chat.

## Quick start

```bash
npm install
cp .env.example .env      # then fill in GEMINI_API_KEY, GROQ_API_KEY, MONGODB_URI
npm run seed               # populates MongoDB with the demo organization, users & catalog data
npm run dev:all            # runs the Vite frontend (:5173) and Express API (:3001) together
```

Frontend: http://localhost:5173 · API: http://localhost:3001/api

Run `npm run verify:ai` any time after the server is up to smoke-test all 15 AI features end to
end (mind the free-tier Gemini quota — see [TECH_STACK.md §4](./TECH_STACK.md#4-ai-integration)).

## Demo credentials

Seeded by `npm run seed`, one account per role:

| Email | Password | Role |
|---|---|---|
| admin@qmics.com | Admin@2025 | Admin |
| management@qmics.com | Mgmt@2025 | Management |
| production@qmics.com | Prod@2025 | Production Manager |
| stores@qmics.com | Store@2025 | Stores Manager |
| quality@qmics.com | Qual@2025 | Quality Manager |
| inspector@qmics.com | Insp@2025 | Inspector |

## Project structure

```
server/
  index.ts                    Express app entry (CORS, JSON body limit, mounts /api)
  db.ts                       MongoDB connection
  seed.ts                     Demo data seeder
  verify-ai.ts                End-to-end smoke test for all 15 AI features
  models/                     29 Mongoose models (23 core domain + 6 AI-specific)
  routes/                     Core CRUD routes: admin, inspection-plan, inspection-report,
                               product-quality-plan, supplier-evaluation, dashboard, role,
                               document, production-plan, audit-log, auth
  middleware/                 auth.ts (JWT guard), auditLogger.ts (auto audit-trail writes)
  ai/
    adapters/                 gemini.ts, groq.ts — thin wrappers over each provider's SDK
    features/                 One file per AI feature (findings, capa, gap-analysis, ...)
    routes/ai.routes.ts       All /api/ai/* endpoints
    quotaGuard.ts             Fails fast once the Gemini free-tier daily cap is close
    cache.ts                  Mongo-backed response cache for Gemini-backed features
    system-prompts.ts         Shared system prompts per feature domain

src/
  pages/                      Admin module pages (flat, role-gated by ProtectedRoute)
  pages/admin/                AI Settings page
  pages/management/           Management role dashboards
  pages/production-manager/   Production Manager pages
  pages/stores-manager/       Stores Manager pages
  pages/quality-manager/      Quality Manager pages
  pages/inspector/            Inspector pages
  components/ai/              AI Copilot panel, findings panel, gap analysis page, badges
  components/shared/          Cross-role widgets (DataTable, PageWrapper, StageTimeline, ...)
  components/layout/          Sidebar, Topbar, ModuleLayout chrome, nav configs
  layouts/                    AdminLayout, ModuleLayout
  context/                    AuthContext (JWT), ThemeContext
  hooks/                      useApi.ts (REST client hooks), useAI.ts (AI feature hooks)
  lib/                        api.ts (REST client), utils, exporters, chart colors
```

## Role-based modules

Each role logs into its own route namespace, guarded by `<ProtectedRoute allowedRoles={[...]} />`:

| Role | Base path | Pages |
|---|---|---|
| Admin | `/admin` | Dashboard, Organization, Departments, Users, Roles, Products (+detail), Components, Mfg/Asm Stages, Inspection Types, Equipment, Inspection Methods, Documents, Materials, Material Types, Suppliers, Settings, AI Settings |
| Management | `/management` | Product / Manufacturing / Assembling / Material quality dashboards, Supplier evaluation dashboard |
| Production Manager | `/pm` | Dashboard, Mfg/Asm/Material/Component inspection plans, Production Plans, Review Reports, Quality Plan Review |
| Stores Manager | `/sm` | Dashboard, Material Received Plans, Review Material Reports, Supplier Evaluations, Approved Vendors, Stock Statement, Material Quality & Supplier Performance dashboards |
| Quality Manager | `/qm` | Dashboard, Quality Plans, Assign Inspectors, Checklists, Calibration Approvals, Review Reports, **AI Gap Analysis**, 6 quality dashboards |
| Inspector | `/inspector` | Dashboard, Material/Component/Assembly/Final Product Reports, Calibration Report |

`/admin/profile` is reachable by any authenticated role (shared profile page). `/app` redirects
each logged-in user to their own module's dashboard.

## AI features

15 AI-backed capabilities live behind `/api/ai/*` — findings generation, CAPA recommendations, a
streaming compliance copilot, gap analysis, evidence validation, document intelligence, risk &
quality scoring, smart scheduling, generative reports, predictive maturity/compliance,
benchmarking, and an executive dashboard summary. Full endpoint list, provider split, and the
cost/quota engineering behind them: **[TECH_STACK.md §4](./TECH_STACK.md#4-ai-integration)**.

The **AI Settings** page (`/admin/ai-settings`) shows live provider health, per-feature usage
stats, and lets you toggle features off client-side.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Frontend dev server only |
| `npm run server:dev` | Backend dev server only (auto-restart on change) |
| `npm run dev:all` | Both, in one terminal |
| `npm run build` | Type-check + production frontend build |
| `npm run typecheck` | Type-check the backend |
| `npm run seed` | Seed MongoDB with demo data |
| `npm run verify:ai` | Smoke-test every AI feature end to end |

## Environment variables

See `.env.example`. Required: `GEMINI_API_KEY`, `GROQ_API_KEY`, `MONGODB_URI`. Everything else
(`PORT`, cache TTLs, model names, upload size limit, quota buffer) has a sensible default.
