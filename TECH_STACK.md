# Tech Stack

AssessSphere is a three-tier system: a React single-page app, an Express/MongoDB API, and an
AI layer bolted onto that API which calls out to two different model providers. This document
covers what each piece is, the exact version in use, and why it was picked over the obvious
alternatives.

Node.js `v22.14.0` is the runtime this was built and run against. There's no `engines` field in
`package.json` yet, but anything on Node 20+ should work fine (ESM throughout, no CJS-only deps).

---

## 1. Frontend

| Package | Version | Role |
|---|---|---|
| React | 18.3.1 | UI library |
| TypeScript | 5.9.3 | Type safety |
| Vite | 5.4.21 | Dev server + bundler |
| React Router DOM | 6.30.3 | Client-side routing |
| Tailwind CSS | 3.4.19 | Styling |
| Framer Motion | 11.18.2 | Animation |
| Recharts | 2.15.4 | Charts on dashboards |
| @dnd-kit/core, /sortable, /utilities | 6.3.1 / 8.x / 3.x | Drag-to-reorder (stages, checklists) |
| Sonner | 1.7.4 | Toast notifications |
| date-fns | 3.6.0 | Date formatting |
| lucide-react | 0.408.0 | Icon set |
| class-variance-authority + tailwind-merge | 0.7.1 / 2.6.1 | Variant-driven component styling (shadcn-style `cn()`) |
| xlsx | 0.18.5 | Client-side Excel export |

**Why React 18 + Vite over Next.js or CRA:** this is a pure SPA behind a role-based login wall —
there's no SEO surface worth server-rendering, and no need for file-based routing or API routes
living in the same project. Vite's dev server and HMR are materially faster than CRA's webpack
setup, and a plain SPA avoids the complexity of the Next.js server runtime for an app that gains
nothing from it.

**Why Tailwind over CSS Modules / styled-components:** the app has ~60 pages across 6 role
modules that all need to look consistent. Tailwind's utility classes plus a shared set of CSS
variables (`--primary`, `--card`, `--muted-foreground`, etc., swapped per light/dark theme) make
that consistency mechanical instead of relying on discipline across dozens of separate stylesheets.

**Why Framer Motion:** used for page-transition fades (`PageWrapper`), the slide-in AI Copilot
panel, collapsible sections (`AIFindingsPanel`), and drawer/modal open-close — all of which need
coordinated enter/exit animations that plain CSS transitions handle awkwardly once a component
can unmount mid-animation. `AnimatePresence` solves that directly.

**Why no React Query / SWR / Axios:** the data-fetching surface is a straightforward
CRUD-over-REST pattern against one backend, not a complex cache-invalidation problem. A ~70-line
custom client (`src/lib/api.ts`) plus two hooks (`useApiResource`, `useApiItem` in
`src/hooks/useApi.ts`) cover every list/detail/create/update/delete case the app needs, with zero
dependency weight and a single normalization point for Mongo's `_id` → the `id` shape the UI
components were originally written against. `useApiResource` also takes an optional `pollMs` —
pages where one role's changes need to show up for another role without a manual refresh (Users,
every dashboard, the QM review queues) pass a poll interval; it re-fetches silently in the
background and only re-renders when the data actually changed, so it won't interrupt someone
mid-edit.

**Why @dnd-kit over react-beautiful-dnd:** react-beautiful-dnd is unmaintained; @dnd-kit is the
actively-maintained modern replacement and is what the manufacturing/assembly stage reordering
and checklist item reordering UIs are built on.

---

## 2. Backend

| Package | Version | Role |
|---|---|---|
| Express | 5.2.1 | HTTP server / routing |
| Mongoose | 9.7.4 | MongoDB ODM |
| tsx | 4.23.0 | Runs TypeScript directly (dev + `npm run server`) |
| jsonwebtoken | 9.0.3 | Auth tokens |
| bcryptjs | 3.0.3 | Password hashing |
| multer | 2.2.0 | Multipart file upload (AI document features) |
| mammoth | 1.12.0 | `.docx` text extraction |
| pdf-parse | 2.4.5 | `.pdf` text extraction |
| cors | 2.8.6 | Cross-origin requests from the Vite dev server |
| dotenv | 17.4.2 | `.env` loading |

**Why Express over Fastify/NestJS:** the API surface is ~12 route groups of fairly conventional
CRUD plus one AI router — there's no need for NestJS's DI/module ceremony, and Express 5's
built-in async error handling (no more `express-async-errors` shim) removes the one real gap
Express used to have versus Fastify for this kind of code.

**Why tsx over ts-node:** `tsx` runs and hot-reloads (`server:dev` uses `tsx watch`) TypeScript
under ESM with no separate build step and no `tsconfig` ceremony beyond `server/tsconfig.json`.
The whole project is `"type": "module"`, and tsx's ESM support is simpler to keep working than
ts-node's.

**Why Mongoose over the native MongoDB driver / Prisma:** the domain has ~29 related collections
(organizations → departments → users, products → components → inspection plans → reports, and
so on) with genuine schema shape worth enforcing at the app layer, plus population across
references. Mongoose gives schema validation, hooks (audit-relevant `pre('save')` hooks), and
`.populate()` without hand-rolling joins. Prisma's MongoDB support is comparatively new and its
codegen step didn't buy anything a hand-written Mongoose schema doesn't already give here.

**Why JWT + bcrypt instead of a hosted auth provider (Clerk/Auth0/Supabase Auth):** six fixed,
seeded demo roles with no self-service signup, password reset flows, or SSO requirement — a
hosted provider would add an external dependency and a network hop to every request for a
problem that `jsonwebtoken` + `bcryptjs` solve in about 100 lines
(`server/middleware/auth.ts`, `server/routes/auth.routes.ts`).

**Why multer + mammoth + pdf-parse:** the AI Gap Analysis, Evidence Validation, and Document
Intelligence features all accept an uploaded QMS document (PDF/DOCX/TXT/image) that needs its
text extracted before it's usable in a prompt. `multer` handles the multipart upload to a temp
dir (cleaned up after each request); `mammoth` and `pdf-parse` are the standard, actively
maintained extractors for their respective formats — image uploads instead go straight to Gemini
as inline image data, since Gemini can read images natively.

---

## 3. Database

**MongoDB (Atlas)**, accessed via Mongoose. `server/db.ts` connects once at boot using
`MONGODB_URI`; there's no separate migration tool — schema changes are just edits to the
Mongoose schema files under `server/models/`, since the whole project is still pre-production
demo data seeded via `npm run seed`.

**29 models**, split into two groups:

- **Core domain (23):** `Organization`, `Department`, `User`, `Role`, `Product`, `Component`,
  `ManufacturingStage`, `AssemblyStage`, `InspectionType`, `Equipment`, `InspectionMethod`,
  `InspectionPlan`, `InspectionReport`, `Material`, `MaterialType`, `Supplier`,
  `SupplierEvalMethod`, `SupplierEvaluation`, `ProductQualityPlan`, `ProductionPlan`,
  `MfgDocument`, `CalibrationRecord`, `AuditLogEntry`.
- **AI-specific (6):** `AIAuditLog`, `AICapa`, `AICopilotSession`, `AIFinding`, `AIGapAnalysis`,
  `AIRiskScore` — these persist AI outputs (so a finding/risk score survives a page refresh) and
  log every AI call for the usage stats on the AI Settings page.

A separate `AICacheEntry` model (`server/ai/cache.ts`) backs a lightweight response cache keyed
by a hash of each feature's input, with a Mongo TTL index for physical cleanup and a
per-feature "max age" check in application code (72h default, 168h/1 week for the mostly-static
assessment checklist feature) — see §4 for why this exists.

---

## 4. AI Integration

Two providers, split by what each is actually good at:

| Provider | Model | Used for | Why this one |
|---|---|---|---|
| Google Gemini | `gemini-flash-latest` | 13 of the 15 AI features — structured JSON generation | Native `responseMimeType: 'application/json'` support and a generous context window for feeding in full inspection/checklist data; Flash tier is fast and cheap enough for a demo-scale system |
| Groq | `llama-3.3-70b-versatile` | The AI Compliance Copilot chat only | Groq's inference is dramatically lower-latency than Gemini for streamed conversational text, which matters for a chat UI where perceived responsiveness is the whole point — Gemini is used instead everywhere the point is a structured one-shot result, not a live conversation |

**The 15 AI features** (`server/ai/features/*.ts`, mounted in `server/ai/routes/ai.routes.ts`):

| Endpoint | Feature | Provider |
|---|---|---|
| `POST /api/ai/findings` | AI Findings Generator | Gemini |
| `POST /api/ai/capa` | CAPA Recommendation Engine | Gemini |
| `POST /api/ai/copilot` | AI Compliance Copilot (streaming chat) | Groq |
| `POST /api/ai/gap-analysis` | AI Gap Analysis (document upload) | Gemini |
| `POST /api/ai/validate-evidence` | Smart Evidence Validation (document upload) | Gemini |
| `POST /api/ai/document-intel` | AI Document Intelligence (document upload) | Gemini |
| `POST /api/ai/risk-score` | Intelligent Risk Scoring | Formula, optional Gemini narrative |
| `POST /api/ai/quality-score` | Assessment Quality Scoring | Formula, optional Gemini narrative |
| `POST /api/ai/scheduling` | Smart Assessment Scheduling | Pure algorithm, no AI call |
| `POST /api/ai/report` | Generative Reports | Gemini |
| `POST /api/ai/maturity` | Predictive Maturity Model | Gemini |
| `POST /api/ai/predict` | Predictive Compliance Intelligence | Gemini |
| `POST /api/ai/benchmark` | Benchmarking Intelligence | Gemini |
| `POST /api/ai/executive-summary` | Executive AI Dashboard | Gemini |
| `POST /api/ai/checklist` | AI Assessment Assistant | Gemini |

Plus `GET /api/ai/audit-log`, `GET /api/ai/stats`, and `GET /api/ai/health` for the AI Settings
page.

**Why `@google/generative-ai` directly instead of LangChain/Vercel AI SDK:** every Gemini call in
this app is a single-shot "give me back this JSON shape" request, not a multi-step agent or tool
chain — the SDK's `generateContent` covers that completely, and a framework on top would mostly
add indirection. The one place a framework's abstraction would help (multi-turn streaming chat)
uses the Groq SDK directly instead, for the same reason: it's already the minimal API for the job.

**Cost/quota engineering** — the Gemini key in use is on the **free tier: 20 requests/day**, a
hard project-level cap distinct from the usual per-minute rate limit. Three things exist
specifically to live within that:

1. **`server/ai/quotaGuard.ts`** — counts today's Gemini calls from `AIAuditLog` and short-circuits
   locally once within a small buffer of the daily cap, so a caller fails in milliseconds instead
   of after a slow network round trip (sometimes preceded by a 503 retry) that was always going
   to fail anyway.
2. **`server/ai/cache.ts`** — every Gemini-backed feature response is cached in Mongo, keyed by a
   hash of its input. Reference-style content (an assessment checklist for a given standard) is
   treated as fresh for a week; everything else for 72 hours — cutting repeat/demo traffic down
   to near-zero fresh Gemini calls.
3. **`thinkingConfig: { thinkingBudget: 0 }`** on every Gemini call (`server/ai/adapters/gemini.ts`)
   — the 2.5-era Flash models spend "thinking" tokens against `maxOutputTokens` by default, which
   was silently truncating JSON responses before this was added.

Groq has no such constraint in practice (no quota issues observed), which is the other reason the
copilot chat is routed there rather than through Gemini.

**Rate limiting** (`server/ai/routes/ai.routes.ts`) is a simple in-memory per-IP, per-minute
counter — intentionally not Redis-backed, since this runs as a single Node process. It resets on
every server restart and won't hold up across multiple instances; fine for the current
single-instance deployment, worth swapping for a shared store before scaling horizontally.

---

## 5. Auth, authorization & audit

- **JWT bearer tokens** (`jsonwebtoken`), issued on `POST /api/auth/login`, verified by
  `server/middleware/auth.ts` (`requireAuth`) on every route group including `/ai` (everything
  except `/auth`, which has to be reachable pre-login). `JWT_SECRET` has no hardcoded fallback —
  `server/config/jwtSecret.ts` throws at boot if it's unset, since a fallback baked into source
  is a secret anyone reading the repo already has.
- **bcrypt** password hashing (`bcryptjs`) on the `User` model, with an 8-character minimum
  enforced in the same pre-save hook that does the hashing.
- **Six fixed roles** — `Admin`, `Management`, `ProductionManager`, `StoresManager`,
  `QualityManager`, `Inspector` — enforced twice: server-side via `req.auth.role` checks where
  relevant, and client-side via `<ProtectedRoute allowedRoles={[...]} />` wrapping each module's
  routes in `src/App.tsx`.
- **Audit logging** — `server/middleware/auditLogger.ts` wraps `res.json` on every protected
  route and fire-and-forget writes a Created/Updated/Deleted `AuditLogEntry` after a successful
  mutation, keyed off the route path to a human label (`ENTITY_LABELS` map). This is what backs
  the Dashboard activity feed and the standalone Audit Log page. The AI Compliance Copilot gets
  its own equivalent — `AICopilotSession` — appending each exchange (capped to the last 40
  messages) per `userId`, fire-and-forget, same pattern.
- **Perimeter hardening**: `helmet` for standard security headers, CORS locked to an explicit
  `ALLOWED_ORIGINS` allowlist instead of a wildcard (a wildcard would let any site's script read
  API responses on behalf of a logged-in user's browser). There's no rate limiting on
  `/auth/login` — with six fixed, seeded demo accounts and no public signup, brute-forcing
  credentials isn't a realistic threat here, so that layer was removed rather than carried as
  unused complexity. Worth adding back if this ever fronts real user accounts on the open internet.

---

## 6. Dev tooling & scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `vite` | Frontend only, `:5173` |
| `npm run server:dev` | `tsx watch server/index.ts` | Backend only, `:3001`, auto-restart |
| `npm run dev:all` | `concurrently ... "dev" "server:dev"` | Both, one terminal |
| `npm run build` | `tsc -b && vite build` | Type-check + production frontend bundle |
| `npm run typecheck` | `tsc --noEmit -p server/tsconfig.json` | Backend type-check only |
| `npm run seed` | `tsx server/seed.ts` | Populate MongoDB with demo org/users/catalog data |
| `npm run verify:ai` | `tsx server/verify-ai.ts` | Smoke-test all 15 AI features end to end |

`concurrently` (10.0.3) just runs the two dev processes with labeled, colored output in one
terminal — there's no inter-process coordination needed since they only talk over HTTP.

The project is split into two independent TypeScript configs on purpose:
`tsconfig.json`/`tsconfig.node.json` (frontend, bundler-mode resolution, DOM lib) and
`server/tsconfig.json` (backend, Node types only) — the frontend and server share no source
files, so there's no benefit to a single project-wide config, and keeping them separate avoids
DOM types leaking into server code or vice versa.

---

## 7. Deployment

`vercel.json` currently only holds an SPA rewrite rule (`/(.*) → /`) for the Vite frontend — the
frontend is set up to deploy to Vercel as a static SPA. The Express/MongoDB/AI backend has no
deployment config in this repo yet and currently only runs as a long-lived Node process
(`npm run server`); it would need a host that supports that (Render, Railway, a VPS, Vercel's
Node runtime, etc.) rather than Vercel's default static/edge deployment, since it holds a
persistent MongoDB connection and streams the copilot response over a long-lived HTTP response.

---

## 8. Honest trade-offs / what's not production-hardened

- The AI-route rate limiter (§4) is in-memory, single-instance only — resets on restart and
  won't hold up across multiple instances behind a load balancer without moving to a shared
  store (Redis).
- `npm audit` currently reports two unresolved advisories, deliberately not force-fixed mid-way
  through an unrelated set of changes:
  - `xlsx` (prototype pollution / ReDoS) — no patched version on the npm registry. Checked the
    app's own usage (`src/lib/exportExcel.ts`): it only calls `json_to_sheet`/`writeFile` to
    generate a download from the app's own trusted data, never `XLSX.read` on untrusted input,
    which is where both advisories actually live — so the exploitable path isn't in use here,
    but the dependency itself stays flagged until SheetJS ships a fix upstream.
  - `esbuild`/`vite` (dev server can be reached by any site's request) — fixing requires a
    Vite 5→8 major bump, which needs its own isolated testing pass (plugin/config compatibility)
    rather than a blind `--force` in the middle of other work. Dev-server-only exposure, not a
    production risk (the production build is static files, no dev server involved).
- No automated test suite — correctness is currently verified via `verify:ai` (backend smoke
  test) and manual/browser-driven checks, not unit/integration tests.
- No DB migration tooling — schema evolution is manual, backed by demo seed data rather than
  real user data that would need a migration path.
- Free-tier Gemini quota (20 req/day) is a real ceiling for anything beyond light demo use;
  moving to a paid tier is a one-line env var change (`GEMINI_DAILY_QUOTA`) plus billing setup
  on Google's side.
