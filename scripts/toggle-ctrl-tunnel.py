#!/usr/bin/env python3
"""Manage Toggle Ctrl's Cloudflare Quick Tunnel and matching application origin."""
import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time


UNIT = 'toggle-ctrl-tunnel.service'
URL_PATTERN = r'https://[a-z0-9-]+\.trycloudflare\.com\b'


def current_url(timeout=30):
    deadline = time.monotonic() + timeout
    while True:
        try:
            properties = subprocess.check_output(
                ['systemctl', 'show', UNIT, '--property=InvocationID', '--property=ActiveState'],
                text=True, timeout=5)
        except subprocess.CalledProcessError:
            properties = ''
        fields = dict(line.split('=', 1) for line in properties.splitlines() if '=' in line)
        invocation = fields.get('InvocationID', '')
        if fields.get('ActiveState') == 'active' and re.fullmatch(r'[0-9a-f]{32}', invocation):
            logs = subprocess.check_output(
                ['journalctl', '-b', '--no-pager', '-o', 'cat',
                 '_SYSTEMD_INVOCATION_ID=' + invocation], text=True, timeout=5)
            urls = re.findall(URL_PATTERN, logs)
            if urls:
                return urls[-1]
        if time.monotonic() >= deadline:
            return None
        time.sleep(1)


def configure_origin(app_dir, url):
    path = app_dir / '.env'
    values = {'WEB_APP_URL': url, 'COOKIE_SECURE': 'true', 'BIND_ADDRESS': '127.0.0.1'}
    lines = [line for line in path.read_text().splitlines()
             if line.split('=', 1)[0].strip() not in values]
    lines.extend(f'{key}={value}' for key, value in values.items())
    # Opening the existing file preserves its owner and private permissions.
    path.write_text('\n'.join(lines) + '\n')


def start(app_dir, web_port, api_port):
    cloudflared = shutil.which('cloudflared')
    if not cloudflared:
        print('App is running. Install cloudflared to print a public HTTPS URL.')
        return
    subprocess.run(['systemctl', 'stop', UNIT], check=False, stderr=subprocess.DEVNULL)
    # A separate transient service survives SSH logout, like Friendo's tunnel.
    subprocess.run([
        'systemd-run', '--unit=' + UNIT, '--collect',
        '--property=Restart=on-failure', '--property=RestartSec=5',
        '--', cloudflared, '--no-autoupdate', 'tunnel', '--url',
        f'http://127.0.0.1:{web_port}',
    ], check=True)
    print('Waiting for the Toggle Ctrl public URL...', flush=True)
    url = current_url()
    if not url:
        raise RuntimeError('No public URL yet. Run the helper with "tunnel" to retry, '
                           'or inspect sudo journalctl -u ' + UNIT)
    configure_origin(app_dir, url)
    command = ['docker', 'compose', '--project-directory', str(app_dir),
               '--env-file', str(app_dir / '.env'), '-f', str(app_dir / 'compose.yaml')]
    override = app_dir / 'compose.override.yaml'
    if override.exists():
        command += ['-f', str(override)]
    environment = {**os.environ, 'WEB_PORT': str(web_port), 'API_PORT': str(api_port),
                   'WEB_APP_URL': url, 'COOKIE_SECURE': 'true', 'BIND_ADDRESS': '127.0.0.1'}
    subprocess.run(command + ['up', '-d', '--no-deps', '--wait', '--wait-timeout',
                             '180', 'api', 'web'], env=environment, check=True)
    print(f'Public website: {url}', flush=True)
    print('This temporary URL changes when the tunnel restarts. Use HTTPS to sign in.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('app_dir', type=Path)
    parser.add_argument('web_port', type=int)
    parser.add_argument('api_port', type=int)
    parser.add_argument('action', choices=['start', 'stop', 'status'])
    args = parser.parse_args()
    if not all(1 <= port <= 65535 for port in [args.web_port, args.api_port]):
        parser.error('Ports must be between 1 and 65535')
    if os.geteuid() != 0:
        os.execvp('sudo', ['sudo', '--', 'python3', str(Path(__file__).resolve()), *sys.argv[1:]])
    if args.action == 'start':
        start(args.app_dir.resolve(), args.web_port, args.api_port)
    elif args.action == 'stop':
        subprocess.run(['systemctl', 'stop', UNIT], check=False)
    else:
        url = current_url(timeout=0)
        print(f'Public website: {url}' if url else 'No active Toggle Ctrl tunnel URL.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        print(f'Toggle Ctrl tunnel: {error}', file=sys.stderr)
        sys.exit(1)
