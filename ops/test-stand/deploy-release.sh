#!/usr/bin/env bash
# Run from an extracted source release on the existing fdeadmin test server.
set -euo pipefail
umask 077
release_dir=$(pwd)
image_tag=${1:?Supply a unique release tag}
[[ "$image_tag" =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 2
stand_dir=/home/fdeadmin/fde/deploy-20261026
export MAVEN_OPTS="-Xmx512m"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$stand_dir/tools/node/bin:$JAVA_HOME/bin:$PATH"
mkdir -p "$stand_dir/backups" logs
k() { minikube -p fde kubectl -- -n fde "$@"; }
# Build before changing the running stand. Full test suites run before invoking this release script.
(cd ui && npm ci --no-audit --no-fund && VITE_HOST=127.0.0.1 VITE_PORT=5173 HTTPS=false VITE_API_BACKEND_PORT= npm run build) > logs/ui-build.log 2>&1
mvn -s "$stand_dir/maven-settings.xml" -DskipTests package > logs/api-build.log 2>&1
docker build -f ops/test-stand/Java.Dockerfile -t "fde-local/api:$image_tag" . > logs/image-build.log 2>&1
minikube -p fde image load "fde-local/api:$image_tag" > logs/image-load.log 2>&1
k exec deployment/postgres -- pg_dump -U fdeadmin -d fde -Fc > "$stand_dir/backups/pre-$image_tag.dump"
k get deployment fde-api -o json > "$stand_dir/backups/api-pre-$image_tag.json"
if [ ! -f "$stand_dir/ldap-secret.env" ]; then
  python3 - "$stand_dir/ldap-secret.env" <<'PY'
import base64, os, sys
from pathlib import Path
Path(sys.argv[1]).write_text('FDE_LDAP_ENCRYPTION_KEY=' + base64.b64encode(os.urandom(32)).decode() + '\n')
PY
fi
chmod 600 "$stand_dir/ldap-secret.env"
k create secret generic fde-ldap --from-env-file="$stand_dir/ldap-secret.env" --dry-run=client -o yaml | k apply -f -
python3 - "$image_tag" <<'PY'
import json, sys
from pathlib import Path
patch={'spec':{'template':{'spec':{'containers':[{'name':'fde-api','image':'fde-local/api:'+sys.argv[1],
'env':[{'name':'FDE_LDAP_ENCRYPTION_KEY','valueFrom':{'secretKeyRef':{'name':'fde-ldap','key':'FDE_LDAP_ENCRYPTION_KEY'}}}]}]}}}}
Path('release-patch.json').write_text(json.dumps(patch))
PY
k patch deployment fde-api --type=strategic --patch-file release-patch.json
k rollout status deployment/fde-api --timeout=300s
k get pods
curl --fail --silent --show-error -o /dev/null https://37.235.241.58/
printf 'Release %s is ready; source %s\n' "$image_tag" "$release_dir"
