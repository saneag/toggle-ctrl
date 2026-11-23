import os
from pathlib import Path
import subprocess
import tempfile
import unittest


LAUNCHER = Path(__file__).resolve().parents[1] / 'start-toggle-ctrl.sh'


class PullTests(unittest.TestCase):
    def run_launcher(self, dirty=False, pull_failure=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'compose.yaml').write_text('services: {}\n')
            (root / '.env').write_text('DATABASE_URL=keep-private\n')
            binary = root / 'bin'
            binary.mkdir()
            git = binary / 'git'
            git.write_text('''#!/bin/sh
echo "git $*" >> "$CHECK_LOG"
case "$*" in
  *" status "*) [ "$CHECK_DIRTY" = 1 ] && echo ' M tracked-file'; exit 0 ;;
  *" pull "*) [ "$CHECK_PULL_FAIL" = 1 ] && exit 42; exit 0 ;;
esac
''')
            docker = binary / 'docker'
            docker.write_text('''#!/bin/sh
echo "docker $*" >> "$CHECK_LOG"
[ "$1" = info ] && exit 0
exit 43
''')
            git.chmod(0o755)
            docker.chmod(0o755)
            log = root / 'calls.log'
            result = subprocess.run(['bash', str(LAUNCHER), 'start'], capture_output=True,
                                    text=True, env={**os.environ,
                                    'TOGGLE_CTRL_DIR': str(root),
                                    'PATH': str(binary) + ':' + os.environ['PATH'],
                                    'CHECK_LOG': str(log), 'CHECK_DIRTY': '1' if dirty else '0',
                                    'CHECK_PULL_FAIL': '1' if pull_failure else '0'})
            self.assertEqual((root / '.env').read_text(), 'DATABASE_URL=keep-private\n')
            return result, log.read_text()

    def test_dirty_checkout_stops_before_pull_and_docker(self):
        result, calls = self.run_launcher(dirty=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('pull', calls)
        self.assertNotIn('docker ', calls)

    def test_failed_pull_stops_before_docker(self):
        result, calls = self.run_launcher(pull_failure=True)
        self.assertEqual(result.returncode, 42)
        self.assertNotIn('docker ', calls)

    def test_fast_forward_pull_precedes_docker(self):
        result, calls = self.run_launcher()
        self.assertEqual(result.returncode, 43)  # Stub stops at Compose validation.
        self.assertLess(calls.index('pull --ff-only'), calls.index('docker info'))


if __name__ == '__main__':
    unittest.main()
