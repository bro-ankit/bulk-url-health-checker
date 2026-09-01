$ErrorActionPreference = "Stop"
$RequiredNodeMajor = 20

Write-Host "==> Checking Node.js"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error "Node.js is not installed. Install Node $RequiredNodeMajor+ from https://nodejs.org/ (or via nvm-windows: https://github.com/coreybutler/nvm-windows), then re-run this script."
    exit 1
}
$nodeVersion = (node -v).TrimStart("v")
$nodeMajor = [int]($nodeVersion.Split(".")[0])
if ($nodeMajor -lt $RequiredNodeMajor) {
    Write-Error "Node.js v$nodeVersion is installed, but this repo needs Node $RequiredNodeMajor+. Upgrade via https://nodejs.org/ or nvm-windows, then re-run this script."
    exit 1
}
Write-Host "    node v$nodeVersion OK"

Write-Host "==> Checking pnpm"
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
    Write-Host "    pnpm not found, installing via the official standalone installer"
    iwr https://get.pnpm.io/install.ps1 -useb | iex
    Write-Host "    pnpm installed. Open a new terminal so 'pnpm' is on PATH, then re-run this script."
    exit 0
}
Write-Host "    pnpm $(pnpm -v) OK"

Write-Host "==> Checking Docker"
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Error "Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop/, then re-run this script."
    exit 1
}
try {
    docker info | Out-Null
} catch {
    Write-Error "Docker is installed but not running. Start Docker Desktop, then re-run this script."
    exit 1
}
Write-Host "    docker OK, daemon is running"

Write-Host ""
Write-Host "All prerequisites are satisfied. Next: run 'pnpm bootstrap' from the repo root."
