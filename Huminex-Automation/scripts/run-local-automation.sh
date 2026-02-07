#!/usr/bin/env bash
set -euo pipefail

pushd "$(dirname "$0")/.." >/dev/null

npm install
npx playwright install --with-deps chromium

npm run test:api
npm run test:ui

popd >/dev/null
