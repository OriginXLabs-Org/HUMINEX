# HUMINEX Setup Guide (Azure + .NET + PostgreSQL)

## Overview
This guide configures HUMINEX using:
- Frontend: React + Vite (`Frontend/`)
- Backend: .NET 8 API (`Backend/`)
- Database: PostgreSQL (Azure Database for PostgreSQL recommended)
- Infra target: AKS + Azure services

## Prerequisites
- Node.js 20+
- .NET SDK 8+
- PostgreSQL 16+
- Docker (optional for local integration tests)

## Frontend Setup
```bash
cd Frontend
npm install
```

Create `Frontend/.env.local`:
```env
VITE_API_BASE_URL="http://localhost:5035/api/v1"
```

Run:
```bash
npm run dev
```

## Backend Setup
```bash
dotnet restore Backend/Huminex.slnx
dotnet build Backend/Huminex.slnx
```

Set root `.env.local` (or environment variables):
```env
HUMINEX_Postgres__ConnectionString=Host=localhost;Port=5432;Database=huminex;Username=postgres;Password=postgres
HUMINEX_Postgres__ApplyMigrationsOnStartup=false
HUMINEX_AzureAd__Instance=https://login.microsoftonline.com/
HUMINEX_AzureAd__TenantId=YOUR_TENANT_ID
HUMINEX_AzureAd__ClientId=YOUR_CLIENT_ID
HUMINEX_AzureAd__Audience=api://huminex-api
```

Apply migrations:
```bash
dotnet ef database update \
  --project Backend/src/BuildingBlocks.Infrastructure/Huminex.BuildingBlocks.Infrastructure.csproj \
  --startup-project Backend/src/Api/Huminex.Api/Huminex.Api.csproj \
  --context Huminex.BuildingBlocks.Infrastructure.Persistence.AppDbContext
```

Run API:
```bash
DOTNET_ENVIRONMENT=Development dotnet run --project Backend/src/Api/Huminex.Api
```

Swagger:
- `http://localhost:5035/swagger`
- `https://localhost:7046/swagger`

## Validation
```bash
dotnet test Backend/Huminex.slnx
cd Frontend && npm run build
```

## Deployment Direction
- Containerize backend/frontend
- Push images to Azure Container Registry
- Deploy to AKS (dev/stage/prod)
- Use Key Vault for secrets and GitHub Actions for CI/CD
