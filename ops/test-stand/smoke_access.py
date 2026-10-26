"""End-to-end access checks for an explicitly disposable FDE test stand.

Usage: python3 smoke_access.py https://host /private/path/admin-credentials.json
Creates labelled test pipelines and two users; deactivates the users in finally.
Never prints passwords or tokens. HTTPS certificate validation stays enabled.
"""
import http.cookiejar
import json
import secrets
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

class Client:
    def __init__(self, base):
        self.base = base.rstrip('/') + '/api/v1'
        self.token = None
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(self, method, path, body=None, expected=(200, 201, 204)):
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = 'Bearer ' + self.token
        request = urllib.request.Request(self.base + path, method=method, headers=headers,
            data=None if body is None else json.dumps(body).encode())
        try:
            response = self.opener.open(request, timeout=40)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw = response.read()
            assert response.code in expected, f'{method} {path}: HTTP {response.code}, expected {expected}'
            return json.loads(raw) if raw else None

    def login(self, credentials):
        result = self.call('POST', '/auth/login', credentials)
        self.token = result['accessToken']
        return result

def main():
    base, credentials_path = sys.argv[1:]
    public = Client(base)
    providers = public.call('GET', '/auth/providers')
    assert isinstance(providers['ldapEnabled'], bool)
    public.call('GET', '/settings/ldap', expected=(401,))
    admin = Client(base)
    admin.login(json.loads(Path(credentials_path).read_text()))
    settings = admin.call('GET', '/settings/ldap')
    assert 'bindPassword' not in settings
    assert isinstance(settings['bindPasswordConfigured'], bool)
    admin.call('GET', '/settings/ldap/sync')
    roles = {r['code']: r for r in admin.call('GET', '/roles?size=100')['content']}
    for code in ('DWH', 'PC', 'OFD', 'PI', 'LKPP', 'SDP'):
        assert code in roles and code in roles[code]['clientCodes'], code
    stamp = str(int(time.time()))
    users = []
    try:
        clients = []
        for suffix in ('empty', 'dwh'):
            creds = {'login': f'qa_{suffix}_{stamp}', 'password': secrets.token_urlsafe(24)}
            user = admin.call('POST', '/users', dict(creds, activated=True))
            users.append(user['id'])
            admin.call('PUT', '/users/' + user['id'], {'passwordChangeRequired': False})
            client = Client(base)
            client.login(creds)
            clients.append(client)
        empty, dwh = clients
        assert not empty.call('GET', '/user-context')['roleCodes']
        for path in ('/pipelines', '/settings/ldap', '/users'):
            empty.call('GET', path, expected=(403,))
        empty.call('POST', '/roles', {'code': 'QA_DENIED', 'name': 'Denied', 'clientCodes': ['DWH']}, expected=(403,))
        admin.call('POST', '/roles/' + roles['DWH']['id'] + '/users', {'targetId': users[1]})
        fixtures = []
        for source, target in [('DWH', 'PC'), ('OFD', 'DWH'), ('PC', 'OFD'), ('DWH-TEST', 'OFD')]:
            pipeline = admin.call('POST', '/pipelines', {'pipelineName': f'QA scope {stamp} {source} to {target}',
                'clientFrom': source, 'clientTo': target, 'primaryDatacenter': 'SP', 'allOrNothing': False,
                'tasks': [{'taskOrder': 1, 'typeCode': 'SftpDownloadTask', 'props': {'sourceDir': '/SIMULATION-NO-FILES'}}]})
            fixtures.append(pipeline['id'])
        listing = dwh.call('GET', '/pipelines?size=100')
        visible = {item['id'] for item in listing['content']}
        assert set(fixtures[:2]) <= visible
        assert not set(fixtures[2:]) & visible
        for pid in fixtures[:2]:
            dwh.call('GET', '/pipelines/' + pid)
        for pid in fixtures[2:]:
            dwh.call('GET', '/pipelines/' + pid, expected=(403, 404))
            dwh.call('GET', '/schedules/' + pid, expected=(403, 404))
        dwh.call('POST', '/triggers/manual', {'pipelineId': fixtures[0]}, expected=(403,))
        dwh.call('GET', '/settings/ldap', expected=(403,))
        # Execute only labelled simulation fixtures on the approved stub executor.
        session_ids = []
        for pid in (fixtures[0], fixtures[2]):
            admin.call('POST', '/triggers/manual', {'pipelineId': pid}, expected=(200, 201, 202))
            for attempt in range(20):
                sessions = admin.call('GET', '/sessions?pipelineId=' + pid)['content']
                if sessions:
                    session_ids.append(sessions[0]['id'])
                    break
                time.sleep(0.5)
            else:
                raise AssertionError('Stub session was not created')
        own_sessions = dwh.call('GET', '/sessions?pipelineId=' + fixtures[0] + '&size=1')
        assert len(own_sessions['content']) == 1
        hidden_sessions = dwh.call('GET', '/sessions?pipelineId=' + fixtures[2] + '&size=1')
        assert hidden_sessions['content'] == [] and hidden_sessions['totalElements'] == 0
        dwh.call('GET', '/sessions/' + session_ids[0])
        dwh.call('GET', '/sessions/' + session_ids[1], expected=(403, 404))
        dwh.call('POST', '/triggers/stop', {'sessionId': session_ids[0]}, expected=(403,))
        custom = admin.call('POST', '/roles', {'code': 'QA_' + stamp, 'name': 'QA scope role', 'clientCodes': ['pc']})
        assert custom['clientCodes'] == ['PC']
        admin.call('POST', '/roles/' + custom['id'] + '/users', {'targetId': users[1]})
        # A new data scope without read grants contributes to the existing DWH read grants.
        visible = {item['id'] for item in dwh.call('GET', '/pipelines?size=100')['content']}
        assert fixtures[2] in visible and fixtures[3] not in visible
        admin.call('PUT', '/users/' + users[1], {'activated': False})
        dwh.call('GET', '/user-context', expected=(401, 403))
        dwh.call('POST', '/auth/refresh', expected=(401, 403))
        print('PASS providers, LDAP settings redaction/admin guards, six roles, no-role denial, source/destination scopes, direct IDs, session pagination/counts, read-only grants, custom role union, stale-token revocation', flush=True)
    finally:
        for uid in users:
            admin.call('PUT', '/users/' + uid, {'activated': False})

if __name__ == '__main__':
    main()
