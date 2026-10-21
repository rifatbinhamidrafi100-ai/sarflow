import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from prepare_study_plan import candidates


class AccessPlanTests(unittest.TestCase):
    def test_filename_group_does_not_mix_mode_or_duplicate_acquisition(self):
        def record(i, mode='2005', revision='001'):
            return {'id': f'G{i}', 'acquired': f'2026-09-{i:02d}T12:00:00Z', 'revision': revision,
                    'title': f'NISAR_L2_PR_GCOV_031_019_D_076_{mode}_DHDH_M_202609{i:02d}T120000_202609{i:02d}T120030_P05023_N_F_J_001'}
        rows = [record(i) for i in range(1, 6)] + [record(5, revision='002')] + [record(i, '4005') for i in range(1, 4)]
        groups = candidates(rows)
        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0]['availableDistinctTimes'], 5)
        self.assertEqual(len(groups[0]['accessCandidates']), 4)
        self.assertEqual(groups[0]['accessCandidates'][-1]['revision'], '002')

    def test_unknown_product_names_are_not_selected(self):
        self.assertEqual(candidates([{'title': 'unknown', 'id': 'G1', 'acquired': 'date', 'revision': '1'}]), [])


if __name__ == '__main__':
    unittest.main()
