"""Summarize public metadata already discovered by SARFlow. Never logs in or downloads imagery."""
import argparse
import json
import sqlite3
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


def candidates(rows):
    groups = defaultdict(list)
    for row in rows:
        parts = row['title'].split('_')
        if len(parts) < 17 or parts[:4] != ['NISAR', 'L2', 'PR', 'GCOV']:
            continue
        # Filename fields only: actual HDF5 calibration, geometry and quality still need verification.
        key = '_'.join(parts[5:11] + parts[13:14])
        groups[key].append(dict(row))
    result = []
    for key, records in groups.items():
        dates = {}
        for record in sorted(records, key=lambda r: (r['acquired'], r['revision']), reverse=True):
            dates.setdefault(record['acquired'], record)
        ordered = sorted(dates.values(), key=lambda r: r['acquired'])
        if len(ordered) >= 4:
            result.append({'filenameGroup': key, 'availableDistinctTimes': len(ordered), 'accessCandidates': ordered[-4:]})
    return sorted(result, key=lambda group: group['accessCandidates'][-1]['acquired'], reverse=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', default='data/monitoring/monitoring.sqlite')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    output = Path(args.output)
    if output.exists():
        raise ValueError('Output already exists; choose a new report filename')
    database = Path(args.database).resolve()
    con = sqlite3.connect(database.as_uri() + '?mode=ro', uri=True)
    con.row_factory = sqlite3.Row
    try:
        locations = []
        for location in con.execute('SELECT id,name,checked,state FROM locations ORDER BY id'):
            rows = con.execute('SELECT id,revision,acquired,title FROM granules WHERE location=?', (location['id'],)).fetchall()
            locations.append({**dict(location), 'discoveredMetadataRecords': len(rows), 'candidateGroups': candidates(rows)})
        report = {'preparedAt': datetime.now(timezone.utc).isoformat(), 'status': 'metadata-only-access-plan',
                  'source': 'NASA CMR public metadata already stored by the local processor',
                  'guide': 'https://nisar-docs.asf.alaska.edu/earthaccess/',
                  'limitations': ['These are access candidates, not reviewed compatible observations or a selected disaster case.',
                                 'Filename grouping does not verify projected grid, calibration, masking, processing version compatibility or temporal suitability.',
                                 'No calibrated products have been downloaded by this script. Use official tools with manual Earthdata authentication.',
                                 'Flood evaluation also needs an aligned documented terrain mask and independent event/date-matched reference evidence.'],
                  'locations': locations}
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(f'Wrote public metadata access plan for {len(locations)} locations; no measurements downloaded.')
    finally:
        con.close()


if __name__ == '__main__':
    main()
