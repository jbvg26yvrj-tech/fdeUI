"""Authorized teststand check. Restores registration policy and disables its temporary account."""
import json, secrets, sys, time
from pathlib import Path
from smoke_access import Client

def main():
    base, credentials_path = sys.argv[1:]
    admin=Client(base); admin.login(json.loads(Path(credentials_path).read_text()))
    anon=Client(base)
    original=admin.call('GET','/settings/access')
    user=None
    creds={'login':'qa_registration_'+str(int(time.time())),'password':secrets.token_urlsafe(24)}
    try:
        admin.call('PUT','/settings/access',{'registrationEnabled':True})
        user=anon.call('POST','/auth/registration',dict(creds,confirmPassword=creds['password']))
        assert user['activated'] and not user['passwordChangeRequired']
        viewer=Client(base);viewer.login(creds)
        context=viewer.call('GET','/user-context')
        assert not context['roleCodes']
        assert set(context['resourceCodes']) == {'api.user-settings.manage','api.user-context.get'}
        viewer.call('GET','/information')
        for path in ['/pipelines','/sessions','/analytics/config','/settings/access','/settings/ldap','/settings/loki','/audit']:
            viewer.call('GET',path,expected=(403,))
        viewer.call('PUT','/settings/access',{'registrationEnabled':False},expected=(403,))
        anon.call('PUT','/settings/access',{'registrationEnabled':False},expected=(401,))
        admin.call('PUT','/settings/access',{},expected=(400,))
        admin.call('PUT','/settings/access',{'registrationEnabled':False})
        assert anon.call('GET','/auth/providers')['registrationEnabled'] is False
        anon.call('POST','/auth/registration',dict(creds,login=creds['login']+'_blocked',confirmPassword=creds['password']),expected=(403,))
        viewer.login(creds)
        events=admin.call('GET','/audit?targetType=auth.registration_settings&size=20')['content']
        assert any(e['actorName']=='admin' and e['changes'].get('after',{}).get('registration_enabled') is False for e in events)
        print('PASS active registration, no roles, information-only access, ADMIN toggle, disabled API, existing login, audited settings')
    finally:
        admin.call('PUT','/settings/access',original)
        if user: admin.call('PUT','/users/'+user['id'],{'activated':False})
if __name__=='__main__': main()
