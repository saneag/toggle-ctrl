#!/usr/bin/env python3
"""One-time migration for alex's Ubuntu home server. Run prepare, then cutover."""
import argparse
import datetime
import ipaddress
import json
import os
from pathlib import Path
import pwd
import secrets
import shutil
import subprocess


HOME = Path('/home/alex')
TOGGLE = HOME / 'toggle-ctrl'
FRIENDO = HOME / 'proiect-de-curs/proiect-de-curs-backend'
STATE = Path('/var/lib/home-apps-setup/state.json')
SOURCE = 'proiect-de-curs-backend-postgres-1'
DATABASES = {
    'toggle-ctrl-dev': 'toggle_ctrl_dev',
    'toggle-ctrl-prod': 'toggle_ctrl_prod',
    'friendo-dev': 'friendo_dev',
    'friendo-prod': 'friendo_prod',
}


def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def output(args):
    return subprocess.check_output(args, text=True).strip()


def sql(statement, database='postgres'):
    return subprocess.check_output(
        ['runuser', '-u', 'postgres', '--', 'psql', '-X', '-v', 'ON_ERROR_STOP=1',
         '-At', '-d', database], input=statement, text=True).strip()


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def private_write(path, content, owner=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as stream:
        stream.write(content)
    os.chmod(path, 0o600)
    if owner:
        os.chown(path, owner.pw_uid, owner.pw_gid)


def save(state):
    STATE.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    private_write(STATE, json.dumps(state, indent=2))


def update_env(path, values):
    lines = path.read_text().splitlines() if path.exists() else []
    result = []
    for line in lines:
        key = line.split('=', 1)[0].strip()
        if key not in values:
            result.append(line)
    result.extend(f'{key}={value}' for key, value in values.items())
    private_write(path, '\n'.join(result) + '\n', pwd.getpwnam('alex'))


def compose(directory, *args, host=False, ports=False):
    command = ['docker', 'compose', '--project-directory', str(directory)]
    if host:
        command += ['-f', str(directory / 'compose.host-postgres.yaml')]
    if ports:
        # Preserve Friendo's established ports instead of scanning during cutover.
        environment = {**os.environ, 'FRONTEND_PORT': '5000', 'BACKEND_PORT': '5001'}
    else:
        environment = os.environ.copy()
    return run(command + list(args), env=environment)


def dump_host(database, target):
    with target.open('wb') as stream:
        run(['runuser', '-u', 'postgres', '--', 'pg_dump', '-Fc', '--quote-all-identifiers',
             '-d', database], stdout=stream)


def restore(database, source):
    # stdin avoids granting the postgres OS user access to the private backup directory.
    with source.open('rb') as stream:
        run(['runuser', '-u', 'postgres', '--', 'pg_restore', '--single-transaction',
             '--no-owner', '--no-acl', '--role', DATABASES[database], '-d', database], stdin=stream)


def counts(database):
    tables = sql("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", database)
    return {table: int(sql('SELECT count(*) FROM public."' + table.replace('"', '""') + '"', database))
            for table in tables.splitlines() if table}


def source_counts():
    query = '''SELECT json_object_agg(name, n) FROM (
        SELECT 'users' AS name, count(*) AS n FROM users UNION ALL
        SELECT 'posts', count(*) FROM posts UNION ALL
        SELECT 'comments', count(*) FROM comments UNION ALL
        SELECT 'reactions', count(*) FROM reactions UNION ALL
        SELECT 'follows', count(*) FROM follows UNION ALL
        SELECT 'follow_requests', count(*) FROM follow_requests) q;'''
    result = subprocess.check_output(
        ['docker', 'exec', '-i', SOURCE, 'sh', '-c',
         'exec psql -X -At -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}"'],
        input=query, text=True)
    return json.loads(result)


def prepare():
    if STATE.exists():
        state = json.loads(STATE.read_text())
        if state['phase'] == 'configured':
            build_prepared(state)
            return
        raise RuntimeError('Setup state already exists; inspect it before rerunning prepare.')
    for tool in ['docker', 'psql', 'pg_dump', 'pg_restore', 'runuser']:
        if not shutil.which(tool):
            raise RuntimeError(f'Missing required command: {tool}')
    if not (FRIENDO / '.env').is_file():
        raise RuntimeError('Missing Friendo server .env')
    source_counts()  # Validate source schema before creating anything.
    if sql("SELECT count(*) FROM pg_database WHERE datname='toggle-ctrl'") != '1':
        raise RuntimeError('Expected existing toggle-ctrl source database')
    for database, role in DATABASES.items():
        if sql(f'SELECT count(*) FROM pg_database WHERE datname={literal(database)}') != '0':
            raise RuntimeError(f'Target database already exists: {database}; refusing to overwrite')
        if sql(f'SELECT count(*) FROM pg_roles WHERE rolname={literal(role)}') != '0':
            raise RuntimeError(f'Target role already exists: {role}; refusing to change credentials')
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = Path('/var/backups/home-apps') / timestamp
    backup.mkdir(parents=True, mode=0o700)
    os.chmod(backup, 0o700)
    shutil.copy2(FRIENDO / '.env', backup / 'friendo.env.before')
    if (TOGGLE / '.env').exists():
        shutil.copy2(TOGGLE / '.env', backup / 'toggle.env.before')
    dump_host('toggle-ctrl', backup / 'toggle-ctrl-original.dump')
    state = {'backup': str(backup), 'phase': 'preparing',
             'passwords': {role: secrets.token_hex(24) for role in DATABASES.values()}}
    save(state)
    for database, role in DATABASES.items():
        ability = 'CREATEDB' if database.endswith('-dev') else 'NOCREATEDB'
        sql(f'CREATE ROLE "{role}" LOGIN NOSUPERUSER NOCREATEROLE NOREPLICATION {ability} '
            f'PASSWORD {literal(state["passwords"][role])};')
        sql(f'CREATE DATABASE "{database}" OWNER "{role}" TEMPLATE template0;')
        sql(f'REVOKE ALL ON DATABASE "{database}" FROM PUBLIC;')
    restore('toggle-ctrl-dev', backup / 'toggle-ctrl-original.dump')
    if counts('toggle-ctrl') != counts('toggle-ctrl-dev'):
        raise RuntimeError('Toggle development copy row counts do not match; original remains intact')
    networks = output(['docker', 'network', 'ls', '--format', '{{.Name}}']).splitlines()
    if 'home-apps' not in networks:
        run(['docker', 'network', 'create', '--driver', 'bridge', 'home-apps'])
    network = json.loads(output(['docker', 'network', 'inspect', 'home-apps']))[0]
    if network['Driver'] != 'bridge':
        raise RuntimeError('home-apps must be a bridge network')
    subnet = next(item['Subnet'] for item in network['IPAM']['Config'] if ':' not in item['Subnet'])
    ipaddress.ip_network(subnet)
    state['docker_subnet'] = subnet
    hba = Path(sql('SHOW hba_file;'))
    shutil.copy2(hba, backup / 'pg_hba.conf.before')
    rules = f'''# BEGIN home-apps managed access
host all toggle_ctrl_dev,friendo_dev 192.168.0.0/24 scram-sha-256
host all toggle_ctrl_dev,friendo_dev 127.0.0.1/32 scram-sha-256
host toggle-ctrl-prod toggle_ctrl_prod {subnet} scram-sha-256
host friendo-prod friendo_prod {subnet} scram-sha-256
host all toggle_ctrl_prod,friendo_prod 0.0.0.0/0 reject
host all toggle_ctrl_prod,friendo_prod ::/0 reject
# END home-apps managed access
'''
    original = hba.read_text()
    hba.write_text(rules + original)
    errors = sql("SELECT line_number || ': ' || error FROM pg_hba_file_rules WHERE error IS NOT NULL;")
    if errors:
        hba.write_text(original)
        raise RuntimeError(f'Invalid HBA rules (original restored): {errors}')
    sql('SELECT pg_reload_conf();')
    credentials = {}
    for database, role in DATABASES.items():
        host = '192.168.0.16' if database.endswith('-dev') else 'host.docker.internal'
        credentials[database] = f'postgresql://{role}:{state["passwords"][role]}@{host}:5432/{database}'
    config = HOME / '.config/home-apps'
    config.mkdir(parents=True, exist_ok=True, mode=0o700)
    user = pwd.getpwnam('alex')
    os.chown(HOME / '.config', user.pw_uid, user.pw_gid)
    os.chown(config, user.pw_uid, user.pw_gid)
    private_write(config / 'databases.json', json.dumps(credentials, indent=2) + '\n', user)
    shutil.copy2(TOGGLE / 'deploy/compose.home-server.yaml', TOGGLE / 'compose.override.yaml')
    os.chown(TOGGLE / 'compose.override.yaml', user.pw_uid, user.pw_gid)
    update_env(TOGGLE / '.env', {
        'DATABASE_URL': credentials['toggle-ctrl-prod'],
        'WEB_APP_URL': 'http://192.168.0.16:5002', 'BIND_ADDRESS': '0.0.0.0',
        'COOKIE_SECURE': 'false',
    })
    state['phase'] = 'configured'
    save(state)
    build_prepared(state)


def build_prepared(state):
    # Build before interrupting the running Friendo application.
    compose(FRIENDO, 'build', 'migrate', 'api', 'frontend', host=True)
    compose(TOGGLE, 'build')
    state['phase'] = 'prepared'
    save(state)
    print(f'PREPARED. Backups: {state["backup"]}. No deployed app has been stopped.', flush=True)


def cutover():
    state = json.loads(STATE.read_text())
    if state['phase'] != 'prepared':
        raise RuntimeError(f'Expected prepared phase, found {state["phase"]}; inspect before retrying')
    backup = Path(state['backup'])
    # Refuse merging into any nonempty target database.
    for database in ['friendo-prod', 'friendo-dev', 'toggle-ctrl-prod']:
        if counts(database):
            raise RuntimeError(f'Target database is not empty: {database}')
    run(['docker', 'stop', 'proiect-de-curs-backend-api-1'])
    state['phase'] = 'source-api-stopped'
    save(state)
    before = source_counts()
    with (backup / 'friendo-final.dump').open('wb') as stream:
        run(['docker', 'exec', SOURCE, 'sh', '-c',
             'exec pg_dump -Fc --quote-all-identifiers -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}"'],
            stdout=stream)
    # Archive uploads with the API stopped; same named volume is reused after cutover.
    with (backup / 'friendo-uploads.tar').open('wb') as stream:
        run(['docker', 'cp', 'proiect-de-curs-backend-api-1:/app/build/uploads', '-'], stdout=stream)
    for database in ['friendo-prod', 'friendo-dev']:
        restore(database, backup / 'friendo-final.dump')
        after = counts(database)
        if any(after.get(table) != count for table, count in before.items()):
            raise RuntimeError(f'Row counts differ after restoring {database}')
    state['source_counts'] = before
    state['phase'] = 'restored'
    save(state)
    credentials = json.loads((HOME / '.config/home-apps/databases.json').read_text())
    update_env(FRIENDO / '.env', {
        'COMPOSE_FILE': 'compose.host-postgres.yaml',
        'DATABASE_URL': credentials['friendo-prod'],
        'FRONTEND_PORT': '5000', 'BACKEND_PORT': '5001',
    })
    compose(FRIENDO, 'up', '-d', '--wait', '--wait-timeout', '180', host=True, ports=True)
    # Nginx must resolve the recreated API on the new network.
    compose(FRIENDO, 'restart', 'frontend', host=True, ports=True)
    run(['bash', str(TOGGLE / 'scripts/start-toggle-ctrl.sh')],
        env={**os.environ, 'HOME': str(HOME), 'TOGGLE_CTRL_DIR': str(TOGGLE)})
    # Make the installed helper files usable by the normal SSH user.
    user = pwd.getpwnam('alex')
    for name in ['.deploy-ports', '.deploy.lock']:
        path = TOGGLE / name
        if path.exists():
            os.chown(path, user.pw_uid, user.pw_gid)
    helper = HOME / 'bin/start-toggle-ctrl'
    shutil.copy2(TOGGLE / 'scripts/start-toggle-ctrl-wrapper.sh', helper)
    helper.chmod(0o755)
    os.chown(helper, user.pw_uid, user.pw_gid)
    state['phase'] = 'deployed'
    save(state)
    print('DEPLOYED. Verify login, records, uploads, and database connections before retiring the old container.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['prepare', 'cutover'])
    args = parser.parse_args()
    if os.geteuid() != 0:
        parser.error('Run with sudo')
    os.umask(0o077)
    (prepare if args.phase == 'prepare' else cutover)()
