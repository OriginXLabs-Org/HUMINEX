# Frontend Workspace (Target Layout)

This workspace is prepared for monorepo migration.

- Current active app source: `Frontend/`
- Target app path: `frontend/apps/huminex-web`
- Shared UI package target: `frontend/packages/ui-kit`

Use this directory when splitting into app/package workspaces.

## Local Entra Setup

Copy `Frontend/.env.example` to `Frontend/.env.local` and configure:

- `VITE_API_BASE_URL`
- `VITE_AZURE_AD_TENANT_ID`
- `VITE_AZURE_AD_CLIENT_ID` (SPA app registration)
- `VITE_AZURE_AD_API_SCOPE` (API app scope, e.g. `api://<api-app-id>/access_as_user`)
- `VITE_AZURE_AD_REDIRECT_URI` (shared fallback; defaults to origin)
- `VITE_AZURE_AD_ADMIN_REDIRECT_URI` (recommended: `/admin/login`)
- `VITE_AZURE_AD_TENANT_REDIRECT_URI` (recommended: `/tenant/login`)

Run frontend:

```bash
npm --prefix Frontend run dev
```
