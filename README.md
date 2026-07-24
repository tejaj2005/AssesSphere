# AssessSphere — Product Quality Assessment System (PQAS)

[![Live Demo](https://img.shields.io/badge/Live_Demo-asses--sphere.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://asses-sphere.vercel.app/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Express-5.0-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://asses-sphere.vercel.app/)

A comprehensive role-based quality management platform for manufacturing enterprise environments. AssessSphere powers manufacturing quality assurance, inspection plans, supplier evaluations, equipment calibration tracking, and document governance—backed by a 15-agent AI layer (compliance copilot, automated findings/CAPA recommendations, ISO gap analysis, predictive risk scoring, and generative reports).

---

## 🚀 Live Demo

AssessSphere is deployed and live on **Vercel**:

👉 **[https://asses-sphere.vercel.app/](https://asses-sphere.vercel.app/)**

### Demo Credentials

Test the platform instantly with seeded role accounts:

| Role | Email | Password | Primary Access |
|---|---|---|---|
| **Admin** | `admin@qmics.com` | `Admin@2025` | Master Data, User Governance & AI Config |
| **Quality Manager** | `quality@qmics.com` | `Qual@2025` | AI Gap Analysis, Approvals & Quality Plans |
| **Production Manager** | `production@qmics.com` | `Prod@2025` | Production Plans & Inspection Approvals |
| **Stores Manager** | `stores@qmics.com` | `Store@2025` | Material Receiving & Supplier Evaluations |
| **Inspector** | `inspector@qmics.com` | `Insp@2025` | Inspection Reports & Calibration Submissions |
| **Management** | `management@qmics.com` | `Mgmt@2025` | Executive Quality & Performance Analytics |

---

## 🏗️ System Architecture

```
                                  ┌───────────────────────────────┐
                                  │   Vercel Edge & Cloud Hosting │
                                  └───────────────┬───────────────┘
                                                  │
 ┌──────────────────────────┐          ┌──────────┴──────────┐
 │  React SPA Frontend      │ ──HTTP──▶│ Express API Backend │
 │  (Vite + Tailwind CSS)   │          │ (Vercel Serverless) │
 └──────────────────────────┘          └──────────┬──────────┘
                                                  │
                     ┌────────────────────────────┼────────────────────────────┐
                     ▼                            ▼                            ▼
         ┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
         │ MongoDB Atlas         │    │ Google Gemini API     │    │ Groq API              │
         │ Database Storage      │    │ (Structured AI)       │    │ (Streaming Copilot)   │
         └───────────────────────┘    └───────────────────────┘    └───────────────────────┘
```

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS, Framer Motion, React Router v6, Sonner, Recharts.
- **Backend**: Express 5 + Mongoose 9 (MongoDB), JWT authentication, Serverless adapter layer.
- **AI Layer**: Dual-model architecture—**Google Gemini** (`gemini-flash-latest`) for structured data generation and **Groq** (`llama-3.3-70b-versatile`) for streaming compliance copilot chat.
- **Deployment**: Single monorepo deployment on **Vercel** with serverless functions routing `/api/*` requests.

Full breakdown of technology decisions and architectural rationale — see **[TECH_STACK.md](./TECH_STACK.md)**.

---

## 🔑 Role-Based Modules

AssessSphere implements strict multi-tenant role-based access control (RBAC):

| Role | Route Namespace | Core Capabilities |
|---|---|---|
| **Admin** | `/admin` | Master Data (Products, Components, Stages, Suppliers, Equipment, Documents), User & Role Governance, System Settings, AI Feature Controls. |
| **Quality Manager** | `/qm` | AI-Powered ISO Gap Analysis, Quality Plan Management, Inspector Assignments, Calibration Approvals, Inspection Report Review. |
| **Production Manager** | `/pm` | Production Planning, Inspection Plan Reviews, Manufacturing Stage Quality Tracking. |
| **Stores Manager** | `/sm` | Material Received Inspection Plans, Supplier Evaluations, Approved Vendor Lists, Stock & Receiving Dashboards. |
| **Inspector** | `/inspector` | Material, Component, Assembly, and Final Product Inspection Submissions, Calibration Log Submissions. |
| **Management** | `/management` | Executive Dashboards, Supplier Performance Metrics, Plant-wide Quality Analytics. |

---

## 🧠 15 AI-Powered Engines

AssessSphere features 15 specialized AI agents accessible under `/api/ai/*`:

1. **Streaming Compliance Copilot**: Low-latency interactive chat assistant for QA standards.
2. **Auto Findings Generator**: Analyzes raw inspection metrics to detect non-conformances.
3. **CAPA Recommender**: Recommends Root Cause & Corrective/Preventive Action plans.
4. **ISO/QA Gap Analysis Engine**: Assesses process documentation against standard checklists.
5. **Risk Scoring Engine**: Evaluates component & supplier risk indexes.
6. **Quality Scoring Engine**: Computes composite quality scores across stages.
7. **Assessment Assist**: Provides real-time guidance during inspection data entry.
8. **Document Intelligence Agent**: Extracts structured attributes from attached manuals and certificates.
9. **Evidence Validator**: Cross-checks submitted inspection photos/documents with standards.
10. **Predictive Compliance**: Predicts defect likelihood using historical trend analysis.
11. **Smart Scheduler**: Optimizes equipment calibration schedules based on usage patterns.
12. **Benchmarking Engine**: Compares plant metrics against target performance metrics.
13. **Quality Maturity Assessor**: Evaluates organizational quality process maturity levels.
14. **Executive Summary Agent**: Generates condensed briefings for leadership.
15. **Report Generator**: Automatically drafts formal quality compliance reports.

---

## 💻 Local Development Setup

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env       # Configure MONGODB_URI, JWT_SECRET, GEMINI_API_KEY, GROQ_API_KEY
npm run seed               # Seed MongoDB with demo organization, users & catalog data
npm run dev                # Start Express API server on http://localhost:3001
```

### 2. Frontend Setup (in a separate terminal)

```bash
cd frontend
npm install
cp .env.example .env       # Points VITE_API_URL to http://localhost:3001/api
npm run dev                # Start Vite React SPA on http://localhost:5173
```

---

## 🛠️ Verification & Scripts

### Backend (`/backend`)
- `npm run dev` — Start API server with file watch mode.
- `npm run seed` — Populates database with initial demo data.
- `npm run verify:ai` — Smoke test all 15 AI feature endpoints end-to-end.
- `npm run typecheck` — Run TypeScript type checking.

### Frontend (`/frontend`)
- `npm run dev` — Run Vite local dev server.
- `npm run build` — Typecheck and build production SPA assets.
- `npm run preview` — Preview production build output locally.
- `npm run typecheck` — Run TypeScript type checking.

---

## 🌐 Production Deployment

For complete instructions on deploying to **Vercel** (both single monorepo and dual-project setups), see the **[DEPLOYMENT.md](./DEPLOYMENT.md)** guide.
