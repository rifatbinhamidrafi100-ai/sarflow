"""Known numerical fixtures; these are not scientific validation observations."""
import json
from pathlib import Path
import sys
import subprocess
import tempfile
import unittest

import numpy as np
import rasterio
from rasterio.transform import from_origin

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from evaluate_water import evaluate, metrics
from gcov_reader import file_hash


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.write('classes.tif', [1, 2, 3, 4, 0, 5])
        self.write('reference.tif', [1, 0, 1, 0, 1, 0])
        self.report = {'algorithm': 'sarflow-water-candidates-v1', 'dataType': 'synthetic-software-fixture',
                       'outputHashes': {'classes.tif': file_hash(self.root / 'classes.tif')}}
        (self.root / 'result.json').write_text(json.dumps(self.report))
        self.meta = dict(source='software fixture', acquisitionTime='2026-01-04T00:00:00Z',
                         samplingMethod='all fixture cells', preparationMethod='known labels',
                         limitations='synthetic', independentOfPrediction=True)
        (self.root / 'metadata.json').write_text(json.dumps(self.meta))

    def write(self, name, values, offset=0):
        with rasterio.open(self.root / name, 'w', driver='GTiff', height=2, width=3,
                           count=1, dtype='uint8', nodata=255, crs='EPSG:32646',
                           transform=from_origin(500000 + offset, 2700000, 10, 10)) as dst:
            dst.write(np.array(values, dtype='uint8').reshape(2, 3), 1)

    def run_evaluation(self):
        return evaluate(self.root / 'result.json', self.root / 'reference.tif', self.root / 'metadata.json')

    def test_known_confusion_and_exclusions(self):
        result = self.run_evaluation()
        self.assertEqual(result['sampleSize'], 4)
        self.assertEqual(result['support']['excludedCells'], 2)
        self.assertEqual(set(result['confusionMatrix'].values()), {1})
        self.assertEqual(result['metrics']['f1'], .5)
        self.assertEqual(result['metrics']['intersectionOverUnion'], 1 / 3)
        self.assertEqual(result['status'], 'software-fixture-only')

    def test_zero_denominators_are_not_perfect_scores(self):
        self.assertTrue(all(value is None for value in metrics(0, 0, 0, 0).values()))
        self.assertIsNone(metrics(0, 0, 0, 5)['precision'])

    def test_reference_nodata_excluded(self):
        self.write('reference.tif', [255] * 6)
        result = self.run_evaluation()
        self.assertEqual(result['sampleSize'], 0)
        self.assertIsNone(result['metrics']['accuracy'])

    def test_misaligned_grid_rejected(self):
        self.write('reference.tif', [1] * 6, offset=10)
        with self.assertRaisesRegex(ValueError, 'exactly match'):
            self.run_evaluation()

    def test_invalid_reference_rejected(self):
        self.write('reference.tif', [2] * 6)
        with self.assertRaisesRegex(ValueError, 'only 0/1'):
            self.run_evaluation()

    def test_changed_prediction_rejected(self):
        self.write('classes.tif', [1] * 6)
        with self.assertRaisesRegex(ValueError, 'checksum'):
            self.run_evaluation()

    def test_external_prediction_mask_rejected(self):
        with rasterio.Env(GDAL_TIFF_INTERNAL_MASK=False):
            with rasterio.open(self.root / 'classes.tif', 'r+') as dst:
                dst.write_mask(np.array([[255, 0, 0], [255, 255, 255]], dtype='uint8'))
        with self.assertRaisesRegex(ValueError, 'sidecars'):
            self.run_evaluation()

    def test_reference_timezone_required(self):
        self.meta['acquisitionTime'] = '2026-01-04T00:00:00'
        (self.root / 'metadata.json').write_text(json.dumps(self.meta))
        with self.assertRaisesRegex(ValueError, 'timezone'):
            self.run_evaluation()

    def test_reference_independence_required(self):
        self.meta['independentOfPrediction'] = False
        (self.root / 'metadata.json').write_text(json.dumps(self.meta))
        with self.assertRaisesRegex(ValueError, 'independence'):
            self.run_evaluation()

    def test_cli_exports_and_preserves_existing_receipt(self):
        output = self.root / 'evaluation.json'
        command = [sys.executable, str(Path(__file__).resolve().parents[1] / 'scripts/evaluate_water.py'),
                   str(self.root / 'result.json'), str(self.root / 'reference.tif'),
                   str(self.root / 'metadata.json'), str(output)]
        first = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(first.returncode, 0, first.stderr)
        original = output.read_bytes()
        self.assertEqual(json.loads(original)['sampleSize'], 4)
        second = subprocess.run(command, capture_output=True, text=True)
        self.assertNotEqual(second.returncode, 0)
        self.assertEqual(output.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
