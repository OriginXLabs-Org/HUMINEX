# HUMINEX Architecture Docs

This folder is the engineering documentation source of truth for HUMINEX.

## Structure

- `docs.json` + `*.mdx`: Mintlify-compatible source docs
- `site/`: publishable static docs portal (Mintlify-style UX)
- `version.json`: semantic version metadata shown in footer

## Deploy to Azure (DNS-less endpoint)

```bash
bash infra/azure/scripts/deploy-architecture-docs.sh
```

The deployment script creates/reuses a storage account tagged as engineering docs and publishes to Azure Static Website endpoint (`*.web.core.windows.net`).

## Versioning

- Semantic version in `version.json`
- GitHub Action `.github/workflows/architecture-docs-deploy.yml` auto bumps patch/minor/major and republishes
