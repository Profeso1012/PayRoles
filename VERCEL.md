# Deploying PayRole to Vercel

This is a pnpm monorepo. Vercel needs to be told where the frontend app lives and how to build it.

---

## One-time Vercel project setup

### 1. Import the repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `PayRoles` GitHub repository
3. Vercel auto-detects it as a Vite project — **stop here and override the settings below before deploying**

### 2. Configure the project settings

In the Vercel project configuration screen, set these **exactly**:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `apps/web` |
| **Build Command** | `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter web build` |
| **Output Directory** | `dist` |
| **Install Command** | *(leave blank — handled by Build Command above)* |

> **Why the custom Build Command?** Vercel sets the working directory to `apps/web` (the Root Directory), so we first `cd` back to the repo root to run `pnpm install` across the whole workspace (which resolves the `packages/contracts` dependency), then build the web app.

### 3. Environment variables

Add these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Value | Environment |
|---|---|---|
| `VITE_API_URL` | `https://your-api-server.com` | Production |
| `VITE_API_URL` | `/api` | Preview / Development |
| `VITE_APP_NAME` | `PayRole` | All |
| `VITE_APP_ENV` | `production` | Production |
| `VITE_APP_ENV` | `development` | Preview / Development |

> **Note:** Preview deployments can keep `VITE_API_URL=/api` so MSW still runs in the browser and no real backend is needed.

### 4. Deploy

Click **Deploy**. Vercel will:
1. Clone the repo
2. Run `cd ../.. && pnpm install --frozen-lockfile`
3. Build `apps/web` with Vite
4. Serve the `dist/` folder as a static site

---

## SPA routing fix

Vite builds a single-page app. Vercel needs to redirect all routes to `index.html` so React Router handles them.

Create `apps/web/public/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Or place `vercel.json` at the repo root (if Root Directory is set to `apps/web` this is not needed — Vercel handles SPAs automatically for Vite projects).

---

## Subsequent deploys

Every push to `main` triggers an automatic redeploy. Pull request branches get isolated Preview URLs automatically.

---

## Troubleshooting

**Build fails with `Cannot find module '@contracts/types/...'`**
The build command must run `pnpm install` from the repo root, not just `apps/web`. Confirm the Build Command starts with `cd ../..`.

**Page refreshes show 404**
The SPA rewrite rule is missing. Add the `vercel.json` from the section above.

**MSW service worker not registering**
MSW is for development only. In production `VITE_APP_ENV=production`, the service worker is not started. All API calls go to `VITE_API_URL` directly.
