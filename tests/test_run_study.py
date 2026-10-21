"""Workflow contract tests, not Earthdata authentication or real measurement tests."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('run_study', Path(__file__).resolve().parents[1] / 'scripts/run_study.py')
workflow = importlib.util.module_from_spec(spec)
spec.loader.exec_module(workflow)


class StudyWorkflowTests(unittest.TestCase):
    def test_requires_a_dedicated_absolute_folder(self):
        for path in ['relative-folder', str(Path.cwd().anchor), str(workflow.ROOT), str(Path.home())]:
            with self.assertRaises(ValueError):
                workflow.storage_path(path)

    def test_configuration_is_bounded_and_matches_focused_point(self):
        config = workflow.make_config(24, 8, 2)
        self.assertEqual(config['maxStorageBytes'], 24 * workflow.GIB)
        self.assertEqual(config['maxDownloadsPerCycle'], 2)
        self.assertEqual(config['locations'][0]['lon'], 89.8)
        self.assertEqual(len(config['locations']), 1)
        for values in [(0, 8, 2), (24, 25, 2), (24, 8, 0), (24, 8, 5)]:
            with self.assertRaises(ValueError):
                workflow.make_config(*values)

    def test_preflight_creates_nothing_and_does_not_claim_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'not-created'
            with patch.object(workflow.shutil, 'disk_usage', return_value=SimpleNamespace(free=2 * workflow.GIB)):
                report = workflow.preflight(target, workflow.make_config(24, 8, 2))
            self.assertFalse(target.exists())
            self.assertFalse(report['storageReady'])
            self.assertFalse(report['calibratedRunCompleted'])

    def test_reserve_accounts_for_existing_storage(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            (target / 'small-fixture').write_bytes(b'123')
            with patch.object(workflow.shutil, 'disk_usage', return_value=SimpleNamespace(free=27 * workflow.GIB - 3)):
                report = workflow.preflight(target, workflow.make_config(24, 8, 2))
            self.assertTrue(report['storageReady'])
            self.assertEqual(report['existingStorageBytes'], 3)

    def test_disconnected_storage_root_does_not_loop_forever(self):
        class MissingRoot:
            parent = property(lambda self: self)

            def exists(self):
                return False

        with self.assertRaisesRegex(ValueError, 'drive is unavailable'):
            workflow.preflight(MissingRoot(), workflow.make_config(24, 8, 2))

    def test_prepare_refuses_to_overwrite_a_configuration(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            path = workflow.write_config(target, workflow.make_config(24, 8, 2))
            original = path.read_bytes()
            with self.assertRaises(FileExistsError):
                workflow.write_config(target, workflow.make_config(20, 8, 1))
            self.assertEqual(path.read_bytes(), original)

    def test_commands_are_one_shot_with_authentication_only_for_ingest(self):
        target = Path('operator-selected-storage')
        command = workflow.worker_command(target, target / workflow.CONFIG_NAME)
        self.assertIn('--once', command)
        self.assertNotIn('--earthdata-login', command)
        ingestion = workflow.worker_command(target, target / workflow.CONFIG_NAME, True)
        self.assertIn('--earthdata-login', ingestion)
        self.assertIn('--ingest', ingestion)
        self.assertFalse(any('password' in argument or 'token' in argument for argument in ingestion))


if __name__ == '__main__':
    unittest.main()
