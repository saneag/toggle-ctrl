import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    'tunnel', Path(__file__).resolve().parents[1] / 'toggle-ctrl-tunnel.py')
tunnel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tunnel)


class TunnelTests(unittest.TestCase):
    def test_reads_only_current_invocation_logs(self):
        invocation = 'a' * 32
        with patch.object(tunnel.subprocess, 'check_output', side_effect=[
            'InvocationID=' + invocation + '\nActiveState=active\n',
            'Visit https://new-toggle.trycloudflare.com',
        ]) as read:
            self.assertEqual(tunnel.current_url(0), 'https://new-toggle.trycloudflare.com')
            self.assertIn('_SYSTEMD_INVOCATION_ID=' + invocation, read.call_args.args[0])

    def test_inactive_service_does_not_return_stale_logs(self):
        stale = 'InvocationID=' + 'a' * 32 + '\nActiveState=inactive\n'
        with patch.object(tunnel.subprocess, 'check_output', return_value=stale) as read:
            self.assertIsNone(tunnel.current_url(0))
            self.assertEqual(read.call_count, 1)

    def test_updates_public_origin_without_changing_database_credentials(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / '.env'
            path.write_text('DATABASE_URL=private-value\nWEB_APP_URL=http://old\n'
                            'COOKIE_SECURE=false\nBIND_ADDRESS=0.0.0.0\nSMTP_HOST=mail\n')
            path.chmod(0o600)
            tunnel.configure_origin(Path(directory), 'https://new-toggle.trycloudflare.com')
            content = path.read_text()
            self.assertIn('DATABASE_URL=private-value\n', content)
            self.assertIn('SMTP_HOST=mail\n', content)
            self.assertIn('COOKIE_SECURE=true\n', content)
            self.assertIn('BIND_ADDRESS=127.0.0.1\n', content)
            self.assertEqual(content.count('WEB_APP_URL='), 1)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_missing_url_does_not_reconfigure_or_restart_apps(self):
        with patch.object(tunnel.shutil, 'which', return_value='/usr/local/bin/cloudflared'), \
                patch.object(tunnel.subprocess, 'run') as run, \
                patch.object(tunnel, 'current_url', return_value=None), \
                patch.object(tunnel, 'configure_origin') as configure:
            with self.assertRaisesRegex(RuntimeError, 'No public URL'):
                tunnel.start(Path('/app'), 5002, 5003)
            configure.assert_not_called()
            self.assertTrue(all(call.args[0][0] != 'docker' for call in run.call_args_list))

    def test_start_configures_origin_and_recreates_apps_on_selected_ports(self):
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(tunnel.shutil, 'which', return_value='/usr/local/bin/cloudflared'), \
                patch.object(tunnel.subprocess, 'run') as run, \
                patch.object(tunnel, 'current_url', return_value='https://new-toggle.trycloudflare.com'), \
                patch.object(tunnel, 'configure_origin') as configure:
            root = Path(directory)
            tunnel.start(root, 5010, 5011)
            configure.assert_called_once_with(root, 'https://new-toggle.trycloudflare.com')
            service = run.call_args_list[1].args[0]
            self.assertIn('--unit=toggle-ctrl-tunnel.service', service)
            self.assertEqual(service[-1], 'http://127.0.0.1:5010')
            deploy = run.call_args_list[-1]
            self.assertEqual(deploy.args[0][-2:], ['api', 'web'])
            self.assertIn('--no-deps', deploy.args[0])
            self.assertEqual(deploy.kwargs['env']['WEB_PORT'], '5010')
            self.assertEqual(deploy.kwargs['env']['API_PORT'], '5011')


if __name__ == '__main__':
    unittest.main()
