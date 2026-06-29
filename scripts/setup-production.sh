#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Time Cap production setup"

if ! npx vercel@latest whoami >/dev/null 2>&1; then
  echo "Vercel CLI にログインしてください: npx vercel login"
  exit 1
fi

echo "==> Blob store"
if ! npx vercel@latest blob list-stores 2>/dev/null | grep -q timecap-media; then
  npx vercel@latest blob create-store timecap-media --access private --yes --non-interactive
else
  echo "    timecap-media already exists"
fi

echo "==> API session secret"
if ! npx vercel@latest env ls production 2>/dev/null | grep -q API_SESSION_SECRET; then
  SECRET=$(openssl rand -hex 32)
  printf '%s' "$SECRET" | npx vercel@latest env add API_SESSION_SECRET production --force
  printf '%s' "$SECRET" | npx vercel@latest env add API_SESSION_SECRET preview --force
  echo "    API_SESSION_SECRET added"
else
  echo "    API_SESSION_SECRET already set"
fi

echo "==> Upstash KV (optional — Blob fallback works without it)"
if npx vercel@latest integration add upstash/upstash-kv --name timecap-kv --non-interactive 2>&1 | grep -q terms_acceptance; then
  echo "    Upstash terms need one-time browser acceptance:"
  echo "    https://vercel.com/yushininaba4sj-2351s-projects/~/integrations/accept-terms/upstash?source=cli"
  echo "    Then rerun: npx vercel integration add upstash/upstash-kv --name timecap-kv --non-interactive"
else
  echo "    Upstash KV ready or skipped"
fi

echo "==> Deploy production"
npx vercel@latest deploy --prod --yes --non-interactive

echo "==> Done: https://sealed-psi.vercel.app"
