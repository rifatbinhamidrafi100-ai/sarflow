"""Repeatable public metadata discovery; never authenticates or downloads measurements."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from processor.catalog import discover
from scripts.prepare_study_plan import candidates


COLLECTIONS = ('NISAR_L2_GCOV_PROVISIONAL_V1', 'NISAR_L2_GCOV_V1')


def run(lat, lon, collection=COLLECTIONS[0]):
    if not -90 <= lat <= 90 or not -180 <= lon <= 180:
        raise ValueError('Coordinates out of range')
    if collection not in COLLECTIONS:
        raise ValueError('Choose a documented provisional or validated GCOV collection')
    records, truncated = discover({'lat': lat, 'lon': lon},
        {'active': collection},
        {'lookbackDays': 180, 'pageSize': 100, 'maxPages': 3})
    return {'schemaVersion': '1.0', 'preparedAt': datetime.now(timezone.utc).isoformat(),
            'status': 'metadata-candidates-only', 'point': {'lat': lat, 'lon': lon},
            'source': 'NASA CMR', 'collection': collection,
            'query': {'lookbackDays': 180, 'pageSize': 100, 'maxPages': 3},
            'records': records, 'groups': candidates(records), 'truncated': truncated,
            'checks': {'pointFootprintQuery': True, 'rasterGrid': 'not-verified',
                       'calibration': 'not-verified', 'pixelSupport': 'not-verified',
                       'authenticatedAccess': 'not-tested', 'independentReference': 'not-established'},
            'limitations': ['Point footprint intersection does not establish coverage of an entire AOI.',
                            'Filename groups are candidates, not verified compatible measurements.',
                            'Current water algorithm requires at least four compatible acquisitions.',
                            'Use import_gcov.py --check-only for pair metadata checks after manual acquisition; water_pipeline.py checks the full registered series.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lat', type=float, required=True)
    parser.add_argument('--lon', type=float, required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--collection', choices=COLLECTIONS, default=COLLECTIONS[0],
                        help='Search one explicit collection; never mixes product maturities')
    args = parser.parse_args()
    report = run(args.lat, args.lon, args.collection)
    with Path(args.output).open('x', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2, allow_nan=False)
    print(f"Discovered {len(report['records'])} metadata records; {len(report['groups'])} candidate groups. No measurements downloaded.")
