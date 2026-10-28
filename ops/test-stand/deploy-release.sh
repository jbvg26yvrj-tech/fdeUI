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
# All build/test steps finish before changing the running application.
export MAVEN_SETTINGS="$stand_dir/tools/maven-settings.xml"
for secret in fde-ldap fde-loki; do
  k get secret "$secret" >/dev/null || { printf 'Missing existing encryption Secret %s; restore the original key before deployment.\n' "$secret" >&2; exit 1; }
done
bash ops/build/release.sh
docker build -f ops/test-stand/Java.Dockerfile -t "fde-local/api:$image_tag" . > logs/image-build.log 2>&1
minikube -p fde image load "fde-local/api:$image_tag" > logs/image-load.log 2>&1
k exec deployment/postgres -- pg_dump -U fdeadmin -d fde -Fc > "$stand_dir/backups/pre-$image_tag.dump"
k get deployment fde-api -o json > "$stand_dir/backups/api-pre-$image_tag.json"
python3 - "$image_tag" <<'PY'
import json, sys
from pathlib import Path
patch={'spec':{'template':{'spec':{'containers':[{'name':'fde-api','image':'fde-local/api:'+sys.argv[1],
 'ports':[{'name':'management','containerPort':9090}],
'startupProbe':{'httpGet':{'path':'/livez','port':8082}},
'livenessProbe':{'httpGet':{'path':'/livez','port':8082}},
'readinessProbe':{'httpGet':{'path':'/readyz','port':8082}},
'env':[
 {'name':'FDE_LDAP_ENCRYPTION_KEY','valueFrom':{'secretKeyRef':{'name':'fde-ldap','key':'FDE_LDAP_ENCRYPTION_KEY'}}},
 {'name':'FDE_LOKI_ENCRYPTION_KEY','valueFrom':{'secretKeyRef':{'name':'fde-loki','key':'FDE_LOKI_ENCRYPTION_KEY'}}},
 {'name':'MANAGEMENT_SERVER_PORT','value':'9090'},
 {'name':'ANALYTICS_SOURCE_TIME_ZONE','value':'UTC'},
 {'name':'ANALYTICS_TEST_STAND','value':'true'}]}]}}}}
Path('release-patch.json').write_text(json.dumps(patch))
PY
k patch deployment fde-api --type=strategic --patch-file release-patch.json
k rollout status deployment/fde-api --timeout=300s
k apply -f ops/monitoring/service.yaml
k get pods
curl --fail --silent --show-error -o /dev/null https://37.235.241.58/
python3 ops/test-stand/smoke_audit.py https://37.235.241.58 "$stand_dir/credentials.json"
python3 ops/test-stand/smoke_client_viewer.py https://37.235.241.58 "$stand_dir/credentials.json"
printf 'Release %s is ready; source %s\n' "$image_tag" "$release_dir"
