"""Synthetic compatibility regressions; these establish no event accuracy."""
import tempfile
import unittest
from pathlib import Path

from test_water import fixture, h5py, np, BASE, IDENTITY, PARAMS
from gcov_reader import metadata, read_tile


class GCOV150Tests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'fixture.h5'
        fixture(self.path, 0)
        with h5py.File(self.path, 'r+') as f:
            f[IDENTITY + '/productSpecificationVersion'][()] = '1.5.0'
            f[PARAMS + '/rtc/outputBackscatterExpressionConvention'][()] = 'Linear power'
            f[BASE + '/grids/frequencyA/inputDataExceptionMask'] = np.zeros((16, 16), dtype=np.uint8)

    def test_explicit_linear_power_metadata_and_polar_projection(self):
        with h5py.File(self.path, 'r+') as f:
            f[BASE + '/grids/frequencyA/projection'][()] = 3413
            result = metadata(f, 'A', 'HHHH', 'HVHV')
            self.assertEqual(result['productSpecificationVersion'], '1.5.0')
            self.assertEqual(result['expression'], 'linear')
            self.assertEqual(result['epsg'], 3413)

    def test_nonzero_exception_codes_and_invalid_subswaths_are_excluded(self):
        with h5py.File(self.path, 'r+') as f:
            grid = f[BASE + '/grids/frequencyA']
            grid['inputDataExceptionMask'][0, :4] = [0, 2, 255, 8]
            grid['mask'][1, :5] = [0, 1, 5, 6, 255]
            values, valid, known = read_tile(f, 'A', 'HHHH', 0, 0, 16, 16)
            self.assertTrue(known)
            self.assertEqual(valid[0, :4].tolist(), [True, False, False, False])
            self.assertEqual(valid[1, :5].tolist(), [False, True, True, False, False])
            self.assertTrue(np.isnan(values[0, 1]))

    def test_missing_exception_mask_fails_closed(self):
        with h5py.File(self.path, 'r+') as f:
            del f[BASE + '/grids/frequencyA/inputDataExceptionMask']
            _, valid, known = read_tile(f, 'A', 'HHHH', 0, 0, 16, 16)
            self.assertFalse(known)
            self.assertFalse(valid.any())

    def test_malformed_exception_grid_is_rejected(self):
        with h5py.File(self.path, 'r+') as f:
            key = BASE + '/grids/frequencyA/inputDataExceptionMask'
            del f[key]
            f[key] = np.zeros((16, 16), dtype=float)
            with self.assertRaisesRegex(ValueError, 'exception mask'):
                read_tile(f, 'A', 'HHHH', 0, 0, 16, 16)

    def test_unknown_version_and_nonpower_expression_are_rejected(self):
        with h5py.File(self.path, 'r+') as f:
            for expression in ['dB', 'amplitude', '']:
                with self.subTest(expression=expression):
                    f[PARAMS + '/rtc/outputBackscatterExpressionConvention'][()] = expression
                    with self.assertRaisesRegex(ValueError, 'linear gamma0'):
                        metadata(f, 'A', 'HHHH')
            f[IDENTITY + '/productSpecificationVersion'][()] = '9.0.0'
            with self.assertRaisesRegex(ValueError, 'reviewed GCOV'):
                metadata(f, 'A', 'HHHH')
            with self.assertRaisesRegex(ValueError, 'reviewed GCOV'):
                read_tile(f, 'A', 'HHHH', 0, 0, 16, 16)


if __name__ == '__main__':
    unittest.main()
