# AssessSphere — Product Quality Assessment System (PQAS)

[![Live Demo](https://img.shields.io/badge/Live_Demo-asses--sphere.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://asses-sphere.vercel.app/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Express-5.0-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://asses-sphere.vercel.app/)

A role-based quality management platform for manufacturing: inspection plans and reports, supplier evaluation, calibration tracking, document management, and an AI layer (compliance copilot, auto-generated findings/CAPA, gap analysis, risk scoring, predictive compliance, and more) laid on top of the core workflow.

Full breakdown of every technology choice and why — see **[TECH_STACK.md](./TECH_STACK.md)**.
Production Vercel deployment guide — see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## 🚀 Live Deployed App

AssessSphere is deployed and live on Vercel:

👉 **[https://asses-sphere.vercel.app/](https://asses-sphere.vercel.app/)**

---

## Architecture

```
React SPA (Vite, :5173)  ──HTTP──▶  Express API (:3001 / Vercel Serverless)  ──▶  MongoDB (Atlas)
                                                  │
                                                  ├──▶ Google Gemini  (structured AI features)
                                                  └──▶ Groq           (streaming copilot chat)
```

- **Frontend** — React 18 + TypeScript + Vite, Tailwind CSS, Framer Motion, React Router v6.
- **Backend** — Express 5 + Mongoose 9 (MongoDB), JWT auth, tsx runtime / Vercel Serverless.
- **AI layer** — Gemini (`gemini-flash-latest`) for structured/JSON generation, Groq (`llama-3.3-70b-versatile`) for the low-latency streaming copilot chat.

---

## Quick start

The repo is two independent apps in their own folders. Start the **backend** first (the frontend just talks to it over HTTP), each in its own terminal.

**1. Backend** — Express API on :3001

```bash
cd backend
npm install
cp .env.example .env       # then fill in GEMINI_API_KEY, GROQ_API_KEY, MONGODB_URI, JWT_SECRET
npm run seed               # populates MongoDB with the demo organization, users & catalog data
npm run dev                # API on http://localhost:3001 (auto-restart on change)
```

**2. Frontend** — React SPA on :5173, in a second terminal

```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_URL / VITE_AI_API_URL already point at localhost:3001
npm run dev                # SPA on http://localhost:5173
```

Frontend: `http://localhost:5173` · API: `http://localhost:3001/api`

Run `npm run verify:ai` from `backend/` any time the API is up to smoke-test all 15 AI features end to end (mind the free-tier Gemini quota — see [TECH_STACK.md §4](./TECH_STACK.md#4-ai-integration)).

---

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

---

## Project structure

Two self-contained apps, each with its own `package.json`, `.env`, and `node_modules`:

```
backend/                      Express + MongoDB API — install & run this first
  package.json                Backend deps + scripts (dev, start, seed, verify:ai, typecheck)
  .env(.example)              DB URI, JWT secret, AI keys, cache TTLs, quotas, allowed origins
  tsconfig.json
  app.ts                      Express app instance (CORS, JSON body limit, mounts /api, DB middleware)
  index.ts                    Standalone Express server listener
  api/index.ts                Vercel Serverless Function entrypoint
  db.ts                       MongoDB connection & connection pooling
  seed.ts                     Demo data seeder
  verify-ai.ts                End-to-end smoke test for all 15 AI features
  models/                     Mongoose models (core domain + AI-specific)
  routes/                     Core CRUD routes: admin, inspection-plan, inspection-report,
                               product-quality-plan, supplier-evaluation, dashboard, role,
                               document, production-plan, audit-log, auth
  middleware/                 auth.ts (JWT guard + requireRole), auditLogger.ts (audit trail)
  ai/
    adapters/                 gemini.ts, groq.ts — thin wrappers over each provider's SDK
    features/                 One file per AI feature (findings, capa, gap-analysis, ...)
    routes/ai.routes.ts       All /api/ai/* endpoints
    quotaGuard.ts             Fails fast once the Gemini free-tier daily cap is close
    cache.ts                  Mongo-backed response cache for Gemini-backed features
    system-prompts.ts         Shared system prompts per feature domain
  uploads/                    Uploaded documents & calibration certs (gitignored, runtime)

frontend/                     React + Vite SPA — install & run second
  package.json                Frontend deps + scripts (dev, build, preview, typecheck)
  .env(.example)              VITE_API_URL / VITE_AI_API_URL — where to reach the backend
  index.html, vite.config.ts, tailwind.config.ts, postcss.config.js, tsconfig*.json
  src/
    pages/                    Admin module pages (flat, role-gated by ProtectedRoute)
    pages/admin/              AI Settings page
    pages/management/         Management role dashboards
    pages/production-manager/ Production Manager pages
    pages/stores-manager/     Stores Manager pages
    pages/quality-manager/    Quality Manager pages
    pages/inspector/          Inspector pages
    components/ai/            AI Copilot panel, findings panel, gap analysis page, badges
    components/shared/        Cross-role widgets (DataTable, PageWrapper, StageTimeline, ...)
    components/layout/        Sidebar, Topbar, ModuleLayout chrome, nav configs
    layouts/                  AdminLayout, ModuleLayout
    context/                  AuthContext (JWT), ThemeContext
    hooks/                    useApi.ts (REST client hooks), useAI.ts (AI feature hooks)
    lib/                      api.ts (REST client), utils, exporters, chart colors
```

---

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

`/admin/profile` is reachable by any authenticated role (shared profile page). `/app` redirects each logged-in user to their own module's dashboard.

---

## AI features

15 AI-backed capabilities live behind `/api/ai/*` — findings generation, CAPA recommendations, a streaming compliance copilot, gap analysis, evidence validation, document intelligence, risk & quality scoring, smart scheduling, generative reports, predictive maturity/compliance, benchmarking, and an executive dashboard summary. Full endpoint list, provider split, and the cost/quota engineering behind them: **[TECH_STACK.md §4](./TECH_STACK.md#4-ai-integration)**.

The **AI Settings** page (`/admin/ai-settings`) shows live provider health, per-feature usage stats, and lets you toggle features off client-side.

---

## Scripts

Run each inside the folder that owns it.

**backend/**

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with auto-restart on change |
| `npm run start` | Start the API once (no watch) |
| `npm run seed` | Seed MongoDB with demo data |
| `npm run verify:ai` | Smoke-test every AI feature end to end |
| `npm run typecheck` | Type-check the backend |

**frontend/**

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Type-check + production build |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check the frontend |

---

## Environment variables

Each app has its own `.env`, copied from the adjacent `.env.example`:

- **backend/.env** — required: `GEMINI_API_KEY`, `GROQ_API_KEY`, `MONGODB_URI`, `JWT_SECRET`. Everything else (`PORT`, cache TTLs, model names, upload size limit, quota buffer, `ALLOWED_ORIGINS`) has a sensible default.
- **frontend/.env** — `VITE_API_URL` and `VITE_AI_API_URL` tell the SPA where the backend is (default `http://localhost:3001`).
