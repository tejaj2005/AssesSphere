# PQAS — Admin Module

Production Quality Assurance System (Admin Module). React + TypeScript + Vite + Tailwind CSS + Framer Motion.

## Quick start

```bash
npm install
npm run dev
```

Opens on http://localhost:5173

## Demo credentials

| Email             | Password   | Role       |
|-------------------|------------|------------|
| priya@pqas.com    | admin123   | Admin      |
| arjun@pqas.com    | admin123   | Management |
| demo@pqas.com     | demo       | Admin      |

## Pages

- `/` — Public marketing/home page
- `/login` — Authentication page
- `/admin` — Dashboard (KPIs, charts, recent activity)
- `/admin/organization` — Organization profile
- `/admin/departments` — Department management
- `/admin/users` — User directory (with bulk actions)
- `/admin/roles` — Roles & permissions matrix
- `/admin/products` + `/admin/products/:id` — Product catalog & detail tabs
- `/admin/components` — Product components
- `/admin/manufacturing-stages` — Draggable mfg stages
- `/admin/assembling-stages` — Draggable assembly stages
- `/admin/inspection-types` — Inspection categories
- `/admin/equipment` — Equipment & calibration tracking
- `/admin/inspection-methods` — System & custom methods
- `/admin/documents` — Manufacturing documents
- `/admin/materials` + `/admin/material-types` — Material inventory
- `/admin/suppliers` — Suppliers & evaluation methods (tabbed)

## Features

- ✅ Light & Dark themes (toggle in topbar/login)
- ✅ Persistent auth (localStorage)
- ✅ Cross-page connected state via DataContext
- ✅ Full CRUD on all 16 entities
- ✅ Form validation (required, email, uniqueness)
- ✅ Toast notifications (Sonner)
- ✅ Skeleton loading (400ms simulated)
- ✅ Page transitions, drawer/modal animations, stagger, count-up
- ✅ Drag-to-reorder stages (@dnd-kit)
- ✅ Search, multi-filter, sort, pagination
- ✅ Bulk user activate/deactivate
- ✅ Audit log (auto-tracks every change → Dashboard activity feed)
- ✅ Responsive: desktop / tablet / mobile sidebar
- ✅ Cascading delete prevention (e.g. can't delete department with users)

## Tech

React 18 · TypeScript · Vite · Tailwind · Framer Motion · React Router v6 · Recharts · @dnd-kit · Sonner · date-fns · Lucide
