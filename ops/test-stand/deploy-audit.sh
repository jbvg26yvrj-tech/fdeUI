#!/usr/bin/env bash
set -euo pipefail
umask 077
tag=${1:?Release tag required}
[[ "$tag" =~ ^[a-zA-Z0-9_-]+$ ]] || exit 2
stand=/home/fdeadmin/fde/deploy-20261026
release=/home/fdeadmin/fde/releases/$tag
mkdir -p "$release" "$stand/backups"
cd "$release"
tar -xzf "/home/fdeadmin/fde/releases/audit-$tag-source.tar.gz"
tar -xzf "/home/fdeadmin/fde/releases/audit-$tag-dist.tar.gz"
mkdir -p logs
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
export MAVEN_OPTS=-Xmx512m
mvn -s "$stand/tools/maven-settings.xml" -DskipTests package > logs/api-build.log 2>&1
docker build -f ops/test-stand/Java.Dockerfile -t "fde-local/api:$tag" . > logs/image-build.log 2>&1
minikube -p fde image load "fde-local/api:$tag" > logs/image-load.log 2>&1
k() { minikube -p fde kubectl -- -n fde "$@"; }
k exec deployment/postgres -- pg_dump -U fdeadmin -d fde -Fc > "$stand/backups/pre-$tag.dump"
k get deployment fde-api -o json > "$stand/backups/api-pre-$tag.json"
if [ ! -f "$stand/loki-secret.env" ]; then
  python3 - "$stand/loki-secret.env" <<'PY'
import base64, os, sys
from pathlib import Path
Path(sys.argv[1]).write_text('FDE_LOKI_ENCRYPTION_KEY=' + base64.b64encode(os.urandom(32)).decode() + '\n')
PY
fi
chmod 600 "$stand/loki-secret.env"
k create secret generic fde-loki --from-env-file="$stand/loki-secret.env" --dry-run=client -o yaml | k apply -f -
python3 - "$tag" <<'PY'
import json,sys
from pathlib import Path
patch={'spec':{'template':{'spec':{'containers':[{'name':'fde-api','image':'fde-local/api:'+sys.argv[1], 'ports':[{'name':'management','containerPort':9090}], 'startupProbe':{'httpGet':{'path':'/livez','port':8082}}, 'livenessProbe':{'httpGet':{'path':'/livez','port':8082}}, 'readinessProbe':{'httpGet':{'path':'/readyz','port':8082}}, 'env':[
 {'name':'FDE_LOKI_ENCRYPTION_KEY','valueFrom':{'secretKeyRef':{'name':'fde-loki','key':'FDE_LOKI_ENCRYPTION_KEY'}}},
 {'name':'MANAGEMENT_SERVER_PORT','value':'9090'},
 {'name':'ANALYTICS_SOURCE_TIME_ZONE','value':'UTC'},
 {'name':'ANALYTICS_TEST_STAND','value':'true'}]}]}}}}
Path('audit-release-patch.json').write_text(json.dumps(patch))
PY
k patch deployment fde-api --type=strategic --patch-file audit-release-patch.json
k rollout status deployment/fde-api --timeout=300s
k apply -f ops/monitoring/service.yaml
k get pods
curl --fail --silent --show-error -o /dev/null https://37.235.241.58/
