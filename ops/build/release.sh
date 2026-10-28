#!/usr/bin/env bash
# Complete API+UI release from source. Requires Java17, Maven, Node22, npm and Python3.
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root"
for tool in java mvn node npm python3; do command -v "$tool" >/dev/null; done
node -e 'if(Number(process.versions.node.split(".")[0])<22) throw Error("Node22+ required")'
mkdir -p logs
(cd ui && npm ci --no-audit --no-fund && npm run test:run && npx --no-install tsc --noEmit && HTTPS=false VITE_HOST=127.0.0.1 VITE_PORT=5173 VITE_API_BACKEND_PORT= npm run build) > logs/ui-build.log 2>&1
mvn_args=()
if [ -n "${MAVEN_SETTINGS:-}" ]; then mvn_args+=(-s "$MAVEN_SETTINGS"); fi
mvn "${mvn_args[@]}" clean verify > logs/api-build.log 2>&1
python3 ops/build/verify-artifact.py
