import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.discover_water_study import run


class DiscoveryTests(unittest.TestCase):
    def test_validated_collection_is_explicit_and_preserved(self):
        with patch('scripts.discover_water_study.discover', return_value=([], False)) as fetch:
            report = run(25.15, 89.8, 'NISAR_L2_GCOV_V1')
        self.assertEqual(report['collection'], 'NISAR_L2_GCOV_V1')
        self.assertEqual(fetch.call_args.args[1]['active'], 'NISAR_L2_GCOV_V1')
        self.assertEqual(report['checks']['calibration'], 'not-verified')

    def test_unknown_collection_is_rejected_before_network(self):
        with patch('scripts.discover_water_study.discover') as fetch:
            with self.assertRaises(ValueError):
                run(25.15, 89.8, 'NISAR_L2_GCOV_BETA_V1')
            fetch.assert_not_called()

    def test_missing_observations_remain_missing(self):
        with patch('scripts.discover_water_study.discover', return_value=([], False)):
            report = run(25.15, 89.8)
        self.assertEqual(report['records'], [])
        self.assertEqual(report['groups'], [])
        self.assertEqual(report['checks']['calibration'], 'not-verified')
        self.assertEqual(report['status'], 'metadata-candidates-only')

    def test_invalid_coordinates_fail_before_network(self):
        with patch('scripts.discover_water_study.discover') as fetch:
            for lat, lon in [(91, 0), (0, 181), (float('nan'), 0)]:
                with self.assertRaises(ValueError):
                    run(lat, lon)
            fetch.assert_not_called()

    def test_truncation_is_preserved(self):
        with patch('scripts.discover_water_study.discover', return_value=([], True)):
            self.assertTrue(run(25.15, 89.8)['truncated'])
