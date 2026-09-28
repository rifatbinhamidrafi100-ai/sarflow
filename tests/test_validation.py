"""Software fixtures only: these tests demonstrate gates, not scientific accuracy."""
import copy
import json
import tempfile
import unittest
from pathlib import Path
import sys

import numpy as np
import rasterio
from rasterio.transform import from_origin

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from processor.validation import evaluate, confusion, metrics, _hash


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.addCleanup(self.temp.cleanup)
        self.manifest = {'cases': [], 'policy': {
            'minCases': 1, 'minEvents': 1, 'minTerrains': 1, 'minSeasons': 1,
            'minPositivePixels': 1, 'minNegativePixels': 1,
            'minCoverage': .9, 'minPrecisionLower': .01, 'minRecallLower': .01,
            'maxFalsePositiveRate': .1, 'maxMissRate': .1}}
        self.path = self.root/'references.json'
        self.add_case('a')

    def raster(self, path, data, transform=None):
        with rasterio.open(path, 'w', driver='GTiff', width=data.shape[1], height=data.shape[0],
                           count=1, dtype=data.dtype, crs='EPSG:32646',
                           transform=transform or from_origin(500000, 2600000, 20, 20), nodata=255) as ds:
            ds.write(data, 1)

    def add_case(self, name, predicted=None, labels=None, offset=0, terrain='flat', season='wet'):
        directory = self.root/name
        directory.mkdir()
        if predicted is None:
            predicted = np.array([[2, 4], [2, 4]], dtype=np.uint8)
        if labels is None:
            labels = np.array([[1, 0], [1, 0]], dtype=np.uint8)
        transform = from_origin(500000+offset, 2600000, 20, 20)
        self.raster(directory/'classes.tif', predicted, transform)
        self.raster(directory/'labels.tif', labels, transform)
        result = {'dataType': 'calibrated-measurements', 'algorithm': 'sarflow-water-candidates-v1',
                  'parameters': {'change_db': 3},
                  'observations': [{'date': f'2026-01-0{i}', 'sha256': 'a'*64} for i in range(1, 5)],
                  'window': {'width': predicted.shape[1], 'height': predicted.shape[0], 'transform': list(transform)[:6]},
                  'compatibility': {'epsg': 32646}, 'outputHashes': {'classes.tif': _hash(directory/'classes.tif')}}
        (directory/'result.json').write_text(json.dumps(result))
        self.manifest['cases'].append({'id': name, 'eventId': name, 'split': 'held-out',
            'dataType': 'independent-reference', 'source': 'test fixture, not real reference',
            'method': 'manual test labels', 'reviewer': 'test reviewer',
            'independenceStatement': 'Test-only attestation', 'date': '2026-01-04',
            'terrain': terrain, 'season': season, 'labels': name+'/labels.tif',
            'classes': name+'/classes.tif', 'result': name+'/result.json'})
        return directory

    def run_evaluation(self):
        self.path.write_text(json.dumps(self.manifest))
        return evaluate(self.root/'a', self.path)

    def test_confusion_and_abstentions(self):
        counts = confusion(np.array([2, 2, 4, 4, 0, 5, 2]), np.array([1, 0, 1, 0, 1, 0, 255]))
        self.assertEqual(counts, dict(tp=1, fp=1, fn=1, tn=1, abstainedPositive=1,
                                     abstainedNegative=1, excluded=1, insufficient=1, referenceUnknown=1))
        values = metrics(counts)
        self.assertEqual(values['recall'], .5)
        self.assertAlmostEqual(values['effectiveRecall'], 1/3)
        self.assertAlmostEqual(values['missRate'], 2/3)
        empty = metrics(confusion(np.array([0]), np.array([255])))
        self.assertIsNone(empty['precision'])
        self.assertIsNone(empty['recallLower95'])

    def test_digest_bound_approval_and_source_change(self):
        first = self.run_evaluation()
        self.assertFalse(first['publication']['eligible'])
        self.assertIsNone(first['publication']['areaKm2'])
        self.manifest['approval'] = {'signedOffBy': 'test-only reviewer', 'statement': 'test-only approval',
                                     'evaluationDigest': first['evaluationDigest']}
        approved = self.run_evaluation()
        self.assertTrue(approved['publication']['eligible'])
        self.assertGreater(approved['publication']['areaKm2'], 0)
        self.assertLess(approved['publication']['areaKm2'], .001)
        self.manifest['cases'][0]['source'] = 'changed source provenance'
        changed = self.run_evaluation()
        self.assertFalse(changed['publication']['eligible'])
        self.assertNotEqual(first['evaluationDigest'], changed['evaluationDigest'])
        self.assertTrue((self.root/'a/evaluation.json').is_file())

    def test_wrong_grid(self):
        self.raster(self.root/'a/labels.tif', np.array([[1, 0], [1, 0]], dtype=np.uint8),
                    from_origin(500001, 2600000, 20, 20))
        with self.assertRaisesRegex(ValueError, 'grid'):
            self.run_evaluation()

    def test_wrong_date(self):
        self.manifest['cases'][0]['date'] = '2026-01-03'
        with self.assertRaisesRegex(ValueError, 'date'):
            self.run_evaluation()

    def test_duplicates(self):
        self.manifest['cases'].append(copy.deepcopy(self.manifest['cases'][0]))
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            self.run_evaluation()

    def test_overlap(self):
        self.add_case('b', labels=np.array([[1, 0], [0, 1]], dtype=np.uint8), offset=10)
        self.manifest['cases'][1]['eventId'] = 'a'
        with self.assertRaisesRegex(ValueError, 'overlapping'):
            self.run_evaluation()

    def test_synthetic_rejected(self):
        path = self.root/'a/result.json'
        result = json.loads(path.read_text())
        result['dataType'] = 'synthetic-software-fixture'
        path.write_text(json.dumps(result))
        with self.assertRaisesRegex(ValueError, 'Synthetic'):
            self.run_evaluation()

    def test_hash_tampering(self):
        self.raster(self.root/'a/classes.tif', np.ones((2, 2), dtype=np.uint8))
        with self.assertRaisesRegex(ValueError, 'hash'):
            self.run_evaluation()

    def test_failure_revokes_old_approval(self):
        report = self.run_evaluation()
        self.manifest['approval'] = {'signedOffBy': 'test reviewer', 'statement': 'test',
                                     'evaluationDigest': report['evaluationDigest']}
        self.assertTrue(self.run_evaluation()['publication']['eligible'])
        self.manifest['cases'][0]['date'] = 'wrong date'
        with self.assertRaises(ValueError):
            self.run_evaluation()
        saved = json.loads((self.root/'a/evaluation.json').read_text())
        self.assertFalse(saved['publication']['eligible'])

    def test_stratum_false_positives_and_misses_gate(self):
        self.add_case('b', predicted=np.array([[2, 4], [2, 4]], dtype=np.uint8),
                      labels=np.array([[0, 1], [0, 1]], dtype=np.uint8), offset=100,
                      terrain='mountain', season='dry')
        report = self.run_evaluation()
        self.assertFalse(report['publication']['eligible'])
        reasons = report['publication']['reasons']
        self.assertTrue(any('terrain:mountain: falsePositiveRate' in r for r in reasons))
        self.assertTrue(any('season:dry: missRate' in r for r in reasons))

    def test_unknown_candidate_reference_withholds(self):
        self.raster(self.root/'a/labels.tif', np.array([[255, 0], [1, 0]], dtype=np.uint8))
        report = self.run_evaluation()
        self.assertIn('Some current candidate pixels have no reference labels', report['publication']['reasons'])


if __name__ == '__main__':
    unittest.main()
