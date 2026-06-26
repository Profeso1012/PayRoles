# PayRole

Multi-tenant payroll ERP — React 18 + TypeScript + Vite frontend with MSW mock layer.

---

## Prerequisites

- **Node.js** 18 or later
- **pnpm** 8 or later (`npm install -g pnpm`)

---

## Getting started

```bash
# 1. Install dependencies from the repo root
pnpm install

# 2. Start the web app dev server
pnpm --filter web dev
```

The app runs at **http://localhost:5173**

---

## Test accounts

All accounts use the password: `password123`

| Email | Role | What you see after login |
|---|---|---|
| `admin@payrole.io` | Platform Admin | SA portal — all companies |
| `superadmin@dangote.com` | Company Super Admin | Full dashboard for Dangote Cement |
| `amaka@dangote.com` | HR Manager | Employees, Organisation, HR dashboard |
| `emeka@dangote.com` | Payroll Manager | Pay runs, Pay elements, Payroll dashboard |
| `okonkwo@dangote.com` | Finance Director | Approval queue, Payments, Finance dashboard |
| `chidi@dangote.com` | Employee | Own payslips and profile only |

---

## How the mock layer works

All API calls go through **MSW (Mock Service Worker)**, which intercepts every `/api/*` request in the browser. No backend server is needed.

- Mock data lives in `apps/web/src/mocks/data/`
- Request handlers live in `apps/web/src/mocks/handlers/`
- Role checks, 401/403 responses, and state mutations all work as they would in production
- To swap to a real backend: change `VITE_API_URL` in `.env.development` from `/api` to your API server URL

---

## Project structure

```
payrole/
├── apps/
│   └── web/          # React frontend (Vite + Tailwind)
└── packages/
    └── contracts/    # Shared TypeScript types (auth, employee, payroll, etc.)
```

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm --filter web dev` | Start frontend dev server |
| `pnpm --filter web build` | Production build |
| `pnpm --filter web preview` | Preview production build locally |
| `pnpm --filter web type-check` | TypeScript type check |
