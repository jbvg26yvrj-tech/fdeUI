"""Verify client viewer policy on an authorized test stand, without running flows.

Usage: python3 smoke_client_viewer.py https://host /private/admin-credentials.json
Uses existing labelled QA scope pipelines. Creates a disposable role and user,
then deactivates the user and removes only that role. Never prints credentials.
"""
import json
import secrets
import sys
import time
from pathlib import Path
from urllib.parse import urlencode
from smoke_access import Client


def main():
    base, credentials_path = sys.argv[1:]
    admin = Client(base)
    admin.login(json.loads(Path(credentials_path).read_text()))
    pipelines = admin.call('GET', '/pipelines?size=100')['content']
    fixtures = [p for p in pipelines if p['pipelineName'].startswith('QA scope ')]
    own = [p for p in fixtures if 'DWH' in (p['clientFrom'], p['clientTo'])]
    hidden = [p for p in fixtures if 'DWH' not in (p['clientFrom'], p['clientTo'])]
    assert own and hidden, 'Existing QA scope fixtures required'
    assert any(p['clientFrom'] == 'DWH' for p in own)
    assert any(p['clientTo'] == 'DWH' for p in own)
    assert any(p['clientFrom'] == 'DWH-TEST' for p in hidden)
    stamp = str(int(time.time()))
    role_id = user_id = None
    try:
        role = admin.call('POST', '/roles', {
            'code': 'QA_VIEWER_' + stamp, 'name': 'QA disposable client viewer',
            'clientCodes': ['DWH']})
        role_id = role['id']
        creds = {'login': 'qa_viewer_' + stamp, 'password': secrets.token_urlsafe(24)}
        user_id = admin.call('POST', '/users', dict(creds, activated=True))['id']
        admin.call('PUT', '/users/' + user_id, {'passwordChangeRequired': False})
        viewer = Client(base)
        viewer.login(creds)
        viewer.call('GET', '/analytics/config', expected=(403,))
        admin.call('POST', '/roles/' + role_id + '/users', {'targetId': user_id})
        context = viewer.call('GET', '/user-context')
        pages = {c for c in context['resourceCodes'] if c.startswith('page.')}
        assert pages == {'page.pipelines', 'page.sessions', 'page.analytics'}, pages
        visible = {p['id'] for p in viewer.call('GET', '/pipelines?size=100')['content']}
        assert {p['id'] for p in own} <= visible
        assert not {p['id'] for p in hidden} & visible
        for pipeline in own:
            pid = pipeline['id']
            viewer.call('GET', '/pipelines/' + pid)
            viewer.call('GET', '/schedules/' + pid, expected=(200, 404))
            options = viewer.call('GET', '/analytics/pipelines?' + urlencode({'query': pid}))
            assert options['totalElements'] == 1
        for pipeline in hidden:
            pid = pipeline['id']
            viewer.call('GET', '/pipelines/' + pid, expected=(403, 404))
            viewer.call('GET', '/schedules/' + pid, expected=(403, 404))
            assert not viewer.call('GET', '/sessions?pipelineId=' + pid)['content']
            options = viewer.call('GET', '/analytics/pipelines?' + urlencode({'query': pid}))
            assert options['totalElements'] == 0
        period = urlencode({'from': '2026-10-01T00:00:00', 'to': '2026-11-01T00:00:00', 'bucket': 'day'})
        overview = viewer.call('GET', '/analytics/overview?' + period)
        sessions = viewer.call('GET', '/analytics/sessions?' + period)
        assert overview['summary']['sessions'] == sessions['totalElements']
        assert all(s['pipelineId'] in visible for s in sessions['content'])
        # Give this disposable role legacy write grants deliberately: they must not work.
        resources = admin.call('GET', '/resources/list')
        legacy = {'api.triggers.manual', 'api.triggers.stop', 'api.schedules.create',
                  'api.schedules.update', 'api.schedules.delete', 'api.pipelines.create',
                  'api.pipelines.update', 'api.pipelines.delete', 'page.permissions', 'page.logs'}
        selected = [r for r in resources if r['code'] in legacy]
        assert len(selected) == len(legacy)
        for resource in selected:
            admin.call('POST', '/roles/' + role_id + '/resources', {'targetId': resource['id']})
        assert not legacy & set(viewer.call('GET', '/user-context')['resourceCodes'])
        missing = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
        for method, path, body in [
            ('POST', '/triggers/manual', {'pipelineId': missing}),
            ('POST', '/triggers/stop', {'sessionId': missing}),
            ('POST', '/schedules', {'pipelineId': missing, 'cronExpression': '0 0 0 1 1 *'}),
            ('PUT', '/schedules/' + missing, {'cronExpression': '0 0 0 1 1 *'}),
            ('DELETE', '/schedules/' + missing, None),
            ('PUT', '/pipelines/' + missing, {}),
            ('DELETE', '/pipelines/' + missing, None),
        ]:
            viewer.call(method, path, body, expected=(403,))
        for path in ('/users', '/roles', '/settings/ldap', '/settings/loki', '/logs/connections'):
            viewer.call('GET', path, expected=(403,))
        admin.call('PUT', '/users/' + user_id, {'activated': False})
        viewer.call('GET', '/user-context', expected=(401, 403))
        print('PASS client auto-read, menu policy, source/destination scope, exact codes, analytics, schedules, legacy write denial, admin-only sections, deactivation')
    finally:
        if user_id:
            admin.call('PUT', '/users/' + user_id, {'activated': False})
        if role_id:
            if user_id:
                admin.call('DELETE', '/roles/' + role_id + '/users/' + user_id)
            admin.call('DELETE', '/roles/' + role_id)


if __name__ == '__main__':
    main()
