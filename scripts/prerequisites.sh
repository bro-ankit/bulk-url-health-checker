#!/usr/bin/env bash
set -euo pipefail

REQUIRED_NODE_MAJOR=20

echo "==> Checking Node.js"
if ! command -v node > /dev/null 2>&1; then
  echo "Node.js is not installed." >&2
  echo "Install Node ${REQUIRED_NODE_MAJOR}+ from https://nodejs.org/ (or via nvm: https://github.com/nvm-sh/nvm), then re-run this script." >&2
  exit 1
fi

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "Node.js $(node -v) is installed, but this repo needs Node ${REQUIRED_NODE_MAJOR}+." >&2
  echo "Upgrade via https://nodejs.org/ or nvm (https://github.com/nvm-sh/nvm), then re-run this script." >&2
  exit 1
fi
echo "    node $(node -v) OK"

echo "==> Checking pnpm"
if ! command -v pnpm > /dev/null 2>&1; then
  echo "    pnpm not found, installing via the official standalone installer"
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  echo "    pnpm installed. Open a new terminal (or source your shell profile) so 'pnpm' is on PATH, then re-run this script."
  exit 0
fi
echo "    pnpm $(pnpm -v) OK"

echo "==> Checking Docker"
if ! command -v docker > /dev/null 2>&1; then
  echo "Docker is not installed." >&2
  echo "Install Docker Desktop from https://www.docker.com/products/docker-desktop/, then re-run this script." >&2
  exit 1
fi
if ! docker info > /dev/null 2>&1; then
  echo "Docker is installed but not running. Start Docker Desktop, then re-run this script." >&2
  exit 1
fi
echo "    docker $(docker --version | sed 's/,.*//') OK, daemon is running"

echo
echo "All prerequisites are satisfied. Next: run 'pnpm bootstrap' from the repo root."
