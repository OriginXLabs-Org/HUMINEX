# HUMINEX Entra Auth Flow (UI + API + Swagger + Postman)

## 1. Core Principle
HUMINEX uses **Microsoft Entra ID** for authentication.

- There is **no backend signup/register API** for production login.
- Tokens are issued by **Entra**, not by `/api/v1/auth/login`.
- Backend API validates Entra JWT and authorizes by scope + role.

## 2. Required App Registrations

### API App
- Name: `huminex-api-app`
- App ID: `40efefe7-8bc1-4452-9261-8f1973a0b5fa`
- Application ID URI: `api://40efefe7-8bc1-4452-9261-8f1973a0b5fa`
- Delegated scope: `access_as_user`
- App roles: `Admin`, `Employer`, `Employee`

### SPA App
- Name: `huminex-spa-app`
- App ID: `8585bece-66ed-405c-bfa5-568689345f91`
- API permission: delegated scope `access_as_user` on `huminex-api-app`
- Redirect URIs (SPA platform):
  - `http://localhost:8080`
  - `https://www.gethuminex.com`

## 3. Where User Is Created
Create/invite users in **Microsoft Entra Admin Center**:

- `Microsoft Entra ID -> Users -> New user / Invite external user`

Then assign API role in:

- `Enterprise applications -> huminex-api-app -> Users and groups -> Add user/group`
- Select role: `Admin` / `Employer` / `Employee`

## 4. Frontend Environment
Set in `Frontend/.env.local`:

```env
VITE_API_BASE_URL="https://api.gethuminex.com/api/v1"
VITE_AZURE_AD_TENANT_ID="798c33e1-22be-463e-be2f-2920646fa78c"
VITE_AZURE_AD_CLIENT_ID="8585bece-66ed-405c-bfa5-568689345f91"
VITE_AZURE_AD_API_SCOPE="api://40efefe7-8bc1-4452-9261-8f1973a0b5fa/access_as_user"
VITE_AZURE_AD_REDIRECT_URI="http://localhost:8080"
```

For production, `VITE_AZURE_AD_REDIRECT_URI` should be your production frontend origin.

## 5. Login Flow (UI)
1. Open one of:
   - `/portal/login`
   - `/tenant/login`
   - `/admin/login`
2. Click `Continue with Huminex`.
3. MSAL opens Entra sign-in.
4. After login, UI receives access token.
5. UI calls `/api/v1/users/me` and applies role-based routing.

## 6. Swagger Testing with Real Token
1. Login in UI first.
2. In browser devtools, copy token from local storage key `huminex_api_session` -> `access_token`.
3. Open Swagger:
   - `https://api.gethuminex.com/swagger/index.html`
4. Click `Authorize` and paste:
   - `Bearer <access_token>`
5. Test endpoints:
   - `GET /api/v1/users/me`
   - `GET /api/v1/payroll/runs`

## 7. Postman Testing
Use OAuth 2.0 Authorization Code + PKCE:

- Auth URL: `https://login.microsoftonline.com/798c33e1-22be-463e-be2f-2920646fa78c/oauth2/v2.0/authorize`
- Token URL: `https://login.microsoftonline.com/798c33e1-22be-463e-be2f-2920646fa78c/oauth2/v2.0/token`
- Client ID: `8585bece-66ed-405c-bfa5-568689345f91`
- Scope: `api://40efefe7-8bc1-4452-9261-8f1973a0b5fa/access_as_user openid profile email`
- Callback URL: Postman callback (or your configured redirect URI)

Then call API with `Authorization: Bearer <token>`.

## 8. Claims You Must See in Access Token
Expected token payload includes:

- `aud = api://40efefe7-8bc1-4452-9261-8f1973a0b5fa`
- `scp` contains `access_as_user`
- `roles` contains assigned role (`Admin` / `Employer` / `Employee`)

## 9. Backend Authorization Behavior
- Scope-based access: delegated scope must be present.
- Role-based access: endpoints with `[Authorize(Roles = "Admin")]` require `roles` claim containing `Admin`.

## 10. Troubleshooting Quick Map
- **My APIs empty**: wrong tenant/app or missing API service principal.
- **Admin consent fails**: service principal missing or wrong API selected.
- **No roles in token**: role not assigned in Enterprise App (or wrong app selected).
- **401/403 in API**: wrong `aud`/scope/role, or token not sent in `Authorization` header.

## 11. Automation Script
Use this idempotent fixer/validator:

```bash
bash infra/azure/scripts/fix-entra-auth.sh
```

It validates and repairs:
- service principals
- delegated permission wiring
- admin consent
- SPA redirect URIs
- user role assignment
