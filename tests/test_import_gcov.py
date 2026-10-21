"""Synthetic software fixtures only; these tests establish no event accuracy."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_water import fixture, h5py, BASE, IDENTITY
from import_gcov import parser, import_window, readiness_report


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.files = [self.root / f'local-name-{i}.h5' for i in range(2)]
        for i, path in enumerate(self.files):
            fixture(path, i)
        self.argv = [*(str(p) for p in self.files), '--id', 'test-input', '--title', 'Software fixture',
                     '--location', 'Test only', '--row', '0', '--col', '0', '--size', '16', '--check-only']

    def test_utc_and_product_identity_do_not_depend_on_local_filename(self):
        with h5py.File(self.files[0], 'r+') as f:
            f[IDENTITY + '/zeroDopplerStartTime'][()] = '2026-01-01T00:00:00'
        dataset = import_window(parser().parse_args(self.argv))
        self.assertEqual(dataset['observations'][0]['date'], '2026-01-01T00:00:00.000Z')
        self.assertEqual(dataset['observations'][0]['sourceId'], 'SYNTHETIC-FIXTURE-0')

    def test_cli_check_writes_nothing_and_reports_only_support(self):
        before = set(self.root.iterdir())
        result = subprocess.run([sys.executable, str(Path(__file__).resolve().parents[1] / 'scripts/import_gcov.py'), *self.argv], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['commonValidCells'], 256)
        self.assertFalse(report['eventValidated'])
        self.assertNotIn(str(self.root), result.stdout)
        self.assertEqual(before, set(self.root.iterdir()))

    def test_disjoint_valid_support_is_reported_as_zero(self):
        for i, path in enumerate(self.files):
            with h5py.File(path, 'r+') as f:
                mask = f[BASE + '/grids/frequencyA/mask']
                mask[:] = 0
                mask[i * 8:(i + 1) * 8, :] = 1
        report = readiness_report(import_window(parser().parse_args(self.argv)))
        self.assertEqual(report['commonValidCells'], 0)
        self.assertEqual([o['validCells'] for o in report['observations']], [128, 128])

    def test_small_irregular_grid_is_rejected(self):
        for path in self.files:
            with h5py.File(path, 'r+') as f:
                key = BASE + '/grids/frequencyA/xCoordinates'
                values = f[key][:].astype(float)
                values[5] += .00001
                del f[key]
                f[key] = values
        with self.assertRaisesRegex(ValueError, 'regular north-up'):
            import_window(parser().parse_args(self.argv))

    def test_duplicate_product_identity_is_rejected(self):
        with h5py.File(self.files[1], 'r+') as f:
            f[IDENTITY + '/granuleId'][()] = 'SYNTHETIC-FIXTURE-0'
        with self.assertRaisesRegex(ValueError, 'Duplicate product identifiers'):
            import_window(parser().parse_args(self.argv))

    def test_missing_quality_is_rejected(self):
        with h5py.File(self.files[0], 'r+') as f:
            del f[BASE + '/grids/frequencyA/mask']
        with self.assertRaisesRegex(ValueError, 'no valid positive intensity'):
            import_window(parser().parse_args(self.argv))


if __name__ == '__main__':
    unittest.main()
