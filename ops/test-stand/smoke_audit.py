"""Audit smoke checks on the explicitly disposable FDE teststand. No tokens/passwords printed."""
import json, secrets, sys, time
from pathlib import Path
from urllib.parse import urlencode
from smoke_access import Client

def main():
    base, credentials_file = sys.argv[1:]
    admin = Client(base)
    admin.login(json.loads(Path(credentials_file).read_text()))
    anon = Client(base)
    anon.call('GET','/audit',expected=(401,))
    admin.call('GET','/audit?size=101',expected=(400,))
    stamp = str(int(time.time()))
    canary = 'audit_secret_canary_' + secrets.token_hex(12)
    credentials = {'login':'qa_audit_'+stamp,'password':canary}
    user = None
    pipeline = None
    try:
        user=admin.call('POST','/users',dict(credentials,activated=True))
        admin.call('PUT','/users/'+user['id'],{'passwordChangeRequired':False})
        viewer=Client(base);viewer.login(credentials)
        viewer.call('GET','/audit',expected=(403,))
        viewer.call('POST','/roles',{'code':'QA_AUDIT_DENIED','name':'Denied','clientCodes':['DWH']},expected=(403,))
        anon.call('POST','/auth/login',dict(credentials,password='incorrect_'+canary),expected=(401,403))
        payload={'pipelineName':'QA audit '+stamp,'clientFrom':'DWH','clientTo':'PC','primaryDatacenter':'SP','allOrNothing':False,
            'tasks':[{'taskOrder':1,'typeCode':'SftpDownloadTask','props':{'sourceDir':'/SIMULATION-NO-FILES/'+canary}}]}
        pipeline=admin.call('POST','/pipelines',payload)
        payload['primaryDatacenter']='SC'
        admin.call('PUT','/pipelines/'+pipeline['id'],payload)
        events=admin.call('GET','/audit?'+urlencode({'targetId':pipeline['id'],'size':100}))['content']
        changes=[e for e in events if e['action']=='pipelines.update']
        assert changes and any(e['changes']['before']['primary_datacenter']=='SP' and e['changes']['after']['primary_datacenter']=='SC' for e in changes)
        assert all(e['actorName']=='admin' and e['correlationId'] for e in changes)
        by_actor=admin.call('GET','/audit?actor=admin&size=100')['content']
        assert by_actor and all(e['actorName']=='admin' for e in by_actor)
        failures=admin.call('GET','/audit?result=FORBIDDEN&size=100')['content']
        assert any(e['actor']==user['id'] for e in failures)
        rows=admin.call('GET','/audit?size=100')['content']
        assert canary not in json.dumps(rows)
        print('PASS audit: auth boundaries, 400 validation, admin identity, before/after, filters, forbidden outcomes, secret exclusion',flush=True)
        Path('/tmp/fde-audit-persistence-id.txt').write_text(str(changes[0]['id']))
    finally:
        if pipeline: admin.call('DELETE','/pipelines/'+pipeline['id'])
        if user: admin.call('PUT','/users/'+user['id'],{'activated':False})
if __name__=='__main__': main()
