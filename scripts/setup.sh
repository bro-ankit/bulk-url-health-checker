#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Checking Docker is available"
if ! docker info > /dev/null 2>&1; then
  echo "Docker does not appear to be running. Start Docker Desktop (or your Docker daemon) and re-run this script." >&2
  exit 1
fi

echo "==> Copying .env.example -> .env where missing (never overwrites an existing .env)"
for example in apps/api/.env.example apps/worker/.env.example; do
  target="${example%.example}"
  if [ -f "$target" ]; then
    echo "    $target already exists, leaving it as is"
  else
    cp "$example" "$target"
    echo "    created $target"
  fi
done
if [ -f apps/web/.env.example ] && [ ! -f apps/web/.env.local ]; then
  cp apps/web/.env.example apps/web/.env.local
  echo "    created apps/web/.env.local"
elif [ -f apps/web/.env.local ]; then
  echo "    apps/web/.env.local already exists, leaving it as is"
fi

echo "==> Installing dependencies"
pnpm install

echo "==> Starting Postgres, Redis, and LocalStack (S3), waiting for health checks"
docker compose up -d --wait

echo "==> Building shared-contracts (apps/api and apps/worker import its compiled dist)"
pnpm build:packages

echo
echo "Setup complete. Postgres, Redis, and LocalStack are up and healthy."
echo "Run 'pnpm dev' to start the API, worker, and web app together."
echo "(The API applies pending MikroORM migrations itself on boot, no separate migrate step needed.)"
