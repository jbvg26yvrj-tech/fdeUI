"""Reject a release that omits frontend assets, migrations or newly introduced modules."""
from pathlib import Path
from zipfile import ZipFile
root = Path(__file__).resolve().parents[2]
with ZipFile(root / 'target/fde-api-2.0.0.jar') as jar:
    names = set(jar.namelist())
    migrations = list((root / 'src/main/resources/db/migration').glob('*.sql'))
    assert migrations, 'No migrations in source'
    for path in migrations:
        target = 'BOOT-INF/classes/db/migration/' + path.name
        assert jar.read(target) == path.read_bytes(), f'Missing or stale migration: {path.name}'
    assets = [p for p in (root / 'ui/dist').rglob('*') if p.is_file()]
    assert (root / 'ui/dist/index.html').is_file(), 'Frontend was not built'
    for path in assets:
        target = 'BOOT-INF/classes/static/' + str(path.relative_to(root / 'ui/dist'))
        assert jar.read(target) == path.read_bytes(), f'Missing or stale UI asset: {path.name}'
    for module in ('audit', 'analytics', 'ldap', 'loki', 'information'):
        assert any(n.startswith('BOOT-INF/classes/ru/spasibo/bilt/fdeapi/' + module + '/') for n in names), f'Missing module: {module}'
print(f'PASS release artifact: {len(migrations)} exact migrations and {len(assets)} exact UI assets; all feature modules included')
