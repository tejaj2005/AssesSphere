# AssessSphere — Vercel Deployment Guide

This repository is fully configured for deployment on **Vercel**. You can deploy AssessSphere using either **Option 1 (Recommended: Single Vercel Project)** or **Option 2 (Separate Frontend & Backend Vercel Projects)**.

---

## Prerequisites

Before deploying to Vercel, ensure you have:
1. A **MongoDB Atlas** database connection string (`mongodb+srv://...`).
   > **Important**: In MongoDB Atlas, go to **Network Access** -> **IP Access List** and add `0.0.0.0/0` (Allow Access from Anywhere) so Vercel's serverless functions can connect to MongoDB.
2. A **Google Gemini API Key** (`GEMINI_API_KEY`).
3. A **Groq API Key** (`GROQ_API_KEY`).
4. A random string for JWT signing (`JWT_SECRET`).

---

## Option 1: Single Unified Vercel Project (Monorepo Setup — Recommended)

Deploy both the React SPA Frontend and Express Node.js Serverless API in a single Vercel project with one click.

### Steps:
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." -> "Project"**.
2. Import your GitHub repository.
3. Keep **Framework Preset** as **Other** (or Vite).
4. Set **Root Directory** to `./` (the root of the repo).
5. Open **Environment Variables** and add the following keys:

| Environment Variable Key | Description | Example Value |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas Connection String | `mongodb+srv://user:pass@cluster.mongodb.net/assesssphere` |
| `JWT_SECRET` | Secret key for JWT session tokens | `random_secure_secret_string_32_chars` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `GROQ_API_KEY` | Groq API Key | `gsk_...` |
| `NODE_ENV` | Runtime environment | `production` |
| `VITE_API_URL` | Frontend API endpoint path | `/api` |
| `VITE_AI_API_URL` | Frontend AI endpoint path | `/api/ai` |
| `ALLOWED_ORIGINS` | Permitted origins | `https://<your-vercel-app>.vercel.app` |

6. Click **Deploy**. Vercel will build the frontend SPA and set up the serverless backend functions at `/api/*`.

---

## Option 2: Deploying Frontend & Backend as 2 Separate Vercel Projects

If you prefer keeping the frontend and backend in separate Vercel projects:

### Step 2A: Deploy Backend (`backend/`)
1. In Vercel, click **"Add New..." -> "Project"**.
2. Select your repository and set **Root Directory** to `backend`.
3. Add the backend environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS=https://<your-frontend-app>.vercel.app`
4. Click **Deploy**. Note down your backend URL (e.g. `https://assesssphere-backend.vercel.app`).

### Step 2B: Deploy Frontend (`frontend/`)
1. In Vercel, click **"Add New..." -> "Project"**.
2. Select your repository and set **Root Directory** to `frontend`.
3. Framework preset: **Vite**.
4. Add the frontend environment variables:
   - `VITE_API_URL=https://assesssphere-backend.vercel.app/api`
   - `VITE_AI_API_URL=https://assesssphere-backend.vercel.app/api/ai`
5. Click **Deploy**.

---

## Deploying via Vercel CLI

If you have the `vercel` CLI installed locally:

```bash
# Login to Vercel
vercel login

# Deploy Preview Build
vercel

# Deploy to Production
vercel --prod
```

---

## Verification & Health Check

Once deployed, test your API health endpoint by opening:
`https://<your-app>.vercel.app/api/health`

It should return:
```json
{
  "status": "ok",
  "timestamp": "2026-07-23T..."
}
