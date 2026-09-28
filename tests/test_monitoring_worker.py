"""Monitoring regression tests. All measurements here are synthetic software fixtures.

The mocked discovery does not attest to NASA origin; no real science validation
or network download occurs. Publication must stay withheld for these fixtures.
"""
import copy
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from processor import catalog, ingest, worker
from processor.store import Store, now, publication_current
from pyproj import Transformer
import h5py


class MonitoringTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.store = Store(self.root/'state')
        self.addCleanup(lambda: self.store.close())
        self.config = json.loads((ROOT/'processor/config.json').read_text())
        self.policy = json.loads((ROOT/'shared/collection-policy.json').read_text())
        self.loc = {'id': 'fixture', 'name': 'Software fixture only', 'lon': 93.0005, 'lat': 24.4}
        self.config.update(windowPixels=16, maxPages=2, pageSize=2, locations=[self.loc])

    def record(self, i=1, revision='2026-01-01:a'):
        return {'id': f'G{i}-ASF', 'revision': revision, 'acquired': f'2026-01-{i:02d}T00:00:00+00:00',
                'title': f'product-{i}', 'url': f'https://nisar.asf.earthdatacloud.nasa.gov/product-{i}.h5'}

    def entry(self, i=1):
        return {'id': f'G{i}-ASF', 'time_start': f'2026-01-{i:02d}T00:00:00Z',
                'updated': '2026-01-09T00:00:00Z', 'revision_id': 1, 'title': f'product-{i}',
                'links': [{'rel': 'http://esipfed.org/ns/fedsearch/1.1/data#',
                           'href': f'https://nisar.asf.earthdatacloud.nasa.gov/product-{i}.h5'}]}

    def fetch(self, url, headers=None):
        if 'collections.json' in url:
            return {'feed': {'entry': [{'short_name': self.policy['active']}, {'short_name': 'NISAR_L2_GCOV_NEW'}]}}, {}
        return {'feed': {'entry': [self.entry()]}}, {}

    def fixtures(self):
        run = subprocess.run([sys.executable, str(ROOT/'tests/create_water_fixture.py'), str(self.root)],
                             capture_output=True, timeout=30)
        self.assertEqual(run.returncode, 0, run.stderr.decode())
        self.inputs = self.root/'data/water-inputs'
        lon, lat = Transformer.from_crs(32646, 4326, always_xy=True).transform(500075, 2699935)
        self.loc.update(lon=lon, lat=lat, terrain={'file': str(self.inputs/'terrain.tif'),
                        'source': 'Synthetic software test', 'method': 'Fixture only'})
        return [self.inputs/f'{i}.h5' for i in range(4)]

    def ready_fixtures(self):
        for i, path in enumerate(self.fixtures()):
            info = ingest.inspect(path, self.loc, 16, self.policy)
            record = self.record(i+1)
            self.store.record('fixture', record)
            row = self.store.pending('fixture', 10)[-1]
            self.store.update(row, state='compatible', path=str(path), sha256=ingest.file_hash(path),
                              compatibility=info['compatibility'], metadata=json.dumps(info))

    def test_durable_dedup_and_restart(self):
        record = self.record()
        self.store.record('fixture', record)
        self.store.record('fixture', record)
        row = self.store.pending('fixture', 10)[0]
        self.store.update(row, state='downloading', attempts=1)
        self.store.job('job', 'fixture', record['acquired'], 'processing')
        self.store.close()
        self.store = Store(self.root/'state')
        self.store.recover()
        self.assertEqual(len(self.store.pending('fixture', 10)), 1)
        self.assertEqual(self.store.pending('fixture', 10)[0]['attempts'], 1)
        self.assertEqual(self.store.db.execute('SELECT state FROM jobs').fetchone()[0], 'retry')

    def test_new_revision_supersedes_even_when_not_downloaded(self):
        old = self.record(revision='2026-01-01:a')
        self.store.record('fixture', old)
        self.store.update(self.store.pending('fixture', 10)[0], state='compatible')
        self.assertEqual(len(self.store.ready('fixture')), 1)
        self.store.record('fixture', self.record(revision='2026-01-02:a'))
        self.assertEqual(len(self.store.ready('fixture')), 0)

    def test_bounded_cursor_and_duplicate_records(self):
        calls = []
        def fetch(url, headers):
            calls.append(headers)
            return {'feed': {'entry': [self.entry(1), self.entry(2)]}}, {'cmr-search-after': 'cursor'}
        records, truncated = catalog.discover(self.loc, self.policy, self.config, fetch)
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls, [{}, {'CMR-Search-After': 'cursor'}])
        self.assertEqual(len(records), 2)
        self.assertTrue(truncated)

    def test_download_allowlist_and_ambiguous_links(self):
        self.assertTrue(catalog.safe_download_url('https://datapool.asf.alaska.edu/a.h5'))
        for url in ['http://nisar.asf.earthdatacloud.nasa.gov/a.h5', 'https://evil.test/a.h5',
                    'https://asf.alaska.edu.evil.test/a.h5', 'https://user:secret@asf.alaska.edu/a.h5',
                    'https://asf.alaska.edu/a.h5?token=hidden', 'https://asf.alaska.edu:123/a.h5']:
            self.assertFalse(catalog.safe_download_url(url))
        entry = self.entry()
        entry['links'].append({**entry['links'][0], 'href': 'https://asf.alaska.edu/other.h5'})
        records, _ = catalog.discover(self.loc, self.policy, self.config,
                                      lambda *args: ({'feed': {'entry': [entry]}}, {}))
        self.assertIsNone(records[0]['url'])

    def test_authentication_required_keeps_no_download(self):
        with patch.object(worker, 'download', side_effect=ingest.AuthenticationRequired('test')):
            worker.cycle(self.store, self.config, self.policy, ingest=True, fetch=self.fetch)
        row = self.store.pending('fixture', 10)[0]
        self.assertEqual(row['state'], 'authentication-required')
        self.assertIsNone(row['path'])
        self.assertEqual(self.store.status(self.policy, 300)['locations'][0]['state'], 'authentication-required')

    def test_metadata_only_cycle_does_not_download_or_process(self):
        with patch.object(worker, 'download') as download, patch.object(worker, 'process_groups') as process:
            worker.cycle(self.store, self.config, self.policy, fetch=self.fetch)
            download.assert_not_called(); process.assert_not_called()
        status = self.store.status(self.policy, 300)
        self.assertEqual(status['locations'][0]['state'], 'metadata-only')
        self.assertEqual(status['locations'][0]['discovered'], 1)
        self.assertEqual(status['alerts'], [])
        self.assertIn('NISAR_L2_GCOV_NEW', status['collections']['unreviewed'])
        self.assertNotIn('url', json.dumps(status))

    def test_transient_and_storage_download_failures_remain_retryable(self):
        for error in (ingest.DownloadUnavailable('temporary'),ingest.StorageLimit('capacity')):
            with patch.object(worker,'download',side_effect=error):
                worker.cycle(self.store,self.config,self.policy,ingest=True,fetch=self.fetch)
            self.assertEqual(self.store.pending('fixture',10)[0]['state'],'retry')

    def test_compatibility_signature_and_missing_baseline(self):
        self.ready_fixtures()
        rows = self.store.ready('fixture')
        self.assertEqual(len({r['compatibility'] for r in rows}), 1)
        with h5py.File(self.inputs/'3.h5', 'r+') as f:
            f['/science/LSAR/identification/trackNumber'][()] = '2'
        changed = ingest.inspect(self.inputs/'3.h5', self.loc, 16, self.policy)
        self.assertNotEqual(changed['compatibility'], rows[0]['compatibility'])
        self.store.update(rows[-1], compatibility=changed['compatibility'], metadata=json.dumps(changed))
        self.assertEqual(worker.process_groups(self.store, self.loc, self.config), 0)
        self.assertEqual(self.store.db.execute('SELECT COUNT(*) FROM jobs').fetchone()[0], 0)

    def test_process_groups_software_fixture_end_to_end_withholds(self):
        self.ready_fixtures()
        self.assertEqual(worker.process_groups(self.store, self.loc, self.config), 1)
        job = self.store.db.execute('SELECT * FROM jobs').fetchone()
        self.assertEqual(job['state'], 'complete')
        report = json.loads((Path(job['result_path'])/'result.json').read_text())
        self.assertEqual(report['counts']['2'], 64)
        self.assertIsNone(report['areaKm2'])
        self.assertIsNone(job['publication'])
        self.store.set('checkedAt', now())
        self.assertEqual(self.store.status(self.policy, 300)['alerts'], [])
        self.assertEqual(worker.process_groups(self.store, self.loc, self.config), 0)
        self.assertEqual(self.store.db.execute('SELECT COUNT(*) FROM jobs').fetchone()[0], 1)

    def test_publication_stale_guard(self):
        file = self.root/'guard.json'; file.write_text('original')
        publication = {'eligible': True, 'guard': {str(file): ingest.file_hash(file)},
                       'collectionPolicy': ingest.file_hash(ROOT/'shared/collection-policy.json')}
        self.assertTrue(publication_current(publication))
        file.write_text('changed')
        self.assertFalse(publication_current(publication))
        file.unlink()
        self.assertFalse(publication_current(publication))

    def test_invalid_config_rejected(self):
        for key, value in [('intervalSeconds', 1), ('maxPages', True), ('windowPixels', 2048),
                           ('maxFileBytes', -1), ('locations', [])]:
            config = copy.deepcopy(self.config); config[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                worker.validate_config(config)
        config = copy.deepcopy(self.config); config['locations'][0]['lat'] = float('nan')
        with self.assertRaises(ValueError): worker.validate_config(config)

    def test_source_mutation_revokes_processing_reuse(self):
        self.ready_fixtures()
        self.assertEqual(worker.process_groups(self.store,self.loc,self.config),1)
        with h5py.File(self.inputs/'3.h5','r+') as f:
            f['/science/LSAR/GCOV/grids/frequencyA/HHHH'][0,0]=.123
        self.assertEqual(worker.process_groups(self.store,self.loc,self.config),0)
        self.assertEqual(len(self.store.ready('fixture')),3)
        self.assertIsNone(self.store.db.execute('SELECT publication FROM jobs').fetchone()[0])

    def test_identical_windows_in_two_locations_get_separate_jobs(self):
        self.ready_fixtures()
        original=list(self.store.ready('fixture'))
        for row in original:
            record=dict(row);self.store.record('other',record)
            other=self.store.db.execute('SELECT * FROM granules WHERE location=? AND id=?',('other',row['id'])).fetchone()
            self.store.update(other,**{k:row[k] for k in ('state','path','sha256','compatibility','metadata')})
        self.assertEqual(worker.process_groups(self.store,self.loc,self.config),1)
        self.assertEqual(worker.process_groups(self.store,{**self.loc,'id':'other'},self.config),1)
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM jobs').fetchone()[0],2)

    def test_failed_collection_check_revokes_fresh_heartbeat(self):
        self.store.set('checkedAt',now())
        worker.cycle(self.store,self.config,self.policy,fetch=lambda *args: ({'feed':{'entry':[]}},{}))
        self.assertEqual(self.store.status(self.policy,300)['status'],'stale')
        self.assertEqual(self.store.status(self.policy,300)['alerts'],[])

    def test_bad_ports_boolean_coordinates_and_parameters_rejected(self):
        self.assertFalse(catalog.safe_download_url('https://asf.alaska.edu:bad/a.h5'))
        for change in [{'lat':True},{'parameters':{'change_db':float('nan')}},{'terrain':{}},{'referenceManifest':False}]:
            config=copy.deepcopy(self.config);config['locations'][0].update(change)
            with self.assertRaises(ValueError):worker.validate_config(config)

    def test_numeric_revision_order_is_preserved(self):
        first=self.entry();second={**first,'revision_id':10}
        old,_=catalog.discover(self.loc,self.policy,self.config,lambda *a:({'feed':{'entry':[first]}},{}))
        new,_=catalog.discover(self.loc,self.policy,self.config,lambda *a:({'feed':{'entry':[second]}},{}))
        self.assertGreater(new[0]['revision'],old[0]['revision'])


if __name__ == '__main__':
    unittest.main()
