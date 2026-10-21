"""Build and verify a local, allowlisted source handoff; never uploads files."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs' / 'submission'
OUTPUT = ROOT / 'output' / 'nasa-submission-2026-10-20'
SOURCE_ZIP = OUTPUT / 'SARFlow-source-2026-10-20.zip'
DOCS_ZIP = OUTPUT / 'SARFlow-submission-documents-2026-10-20.zip'

FOLDERS = ('src', 'server', 'shared', 'api', 'public', 'scripts', 'processor', 'tests', '.github', 'deploy')
ROOT_FILES = (
    'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts',
    'playwright.config.ts', 'eslint.config.js', '.prettierrc.json', '.gitignore',
    '.vercelignore', '.dockerignore', 'vercel.json', 'index.html', 'README.md',
    'SCIENTIFIC_NOTES.md', 'DATA_PROVENANCE.md', 'WATER_WORKFLOW.md', 'START-SARFLOW.cmd',
)
EXTRA_DOCS = (
    'docs/automatic-monitoring.md', 'docs/automatic-monitoring-design.md',
    'docs/EVIDENCE_PACKAGE.md', 'docs/INVESTIGATION-DELIVERY.md',
    'docs/implementation/2026-10-20-source-readability.md',
    'docs/implementation/2026-10-20-vercel-preview.md',
)
BLOCKED_PARTS = {
    '.git', '.vercel', 'node_modules', '__pycache__', '.pytest_cache',
    '.venv', '.venv-water', 'test-results', 'playwright-report',
}
BLOCKED_SUFFIXES = {'.pyc', '.pyo', '.pem', '.key', '.pfx', '.p12', '.sqlite', '.db', '.log'}
SECRET_PATTERNS = (
    re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    re.compile(rb'gh[pousr]_[A-Za-z0-9]{30,}'),
    re.compile(rb'github_pat_[A-Za-z0-9_]{50,}'),
    re.compile(rb'AKIA[0-9A-Z]{16}'),
    re.compile(rb'sk-proj-[A-Za-z0-9_-]{40,}'),
)


def approved(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    return (
        not path.is_symlink()
        and path.is_file()
        and ROOT in path.resolve().parents
        and not any(part in BLOCKED_PARTS for part in relative.parts)
        and not path.name.startswith('.env')
        and path.suffix.lower() not in BLOCKED_SUFFIXES
    )


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_api_inventory() -> None:
    rows = [
        ('NASA CMR', 'https://cmr.earthdata.nasa.gov/search/granules.json', 'dynamic catalogue metadata', 'no key for public discovery', 'server/catalog.ts;server/global-radar.ts;server/place-observatory.ts'),
        ('NASA CMR collections', 'https://cmr.earthdata.nasa.gov/search/collections.json', 'optional processor collection review', 'no key for public discovery', 'processor/catalog.py'),
        ('NASA GIBS', 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi', 'NISAR browse visualization; not calibrated measurements', 'no key in configured requests', 'server/global-radar.ts'),
        ('EOX Sentinel-2 cloudless', 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg', 'static 2024 optical background', 'no key in configured URL', 'src/pages/World.tsx'),
        ('Open-Meteo geocoding', 'https://geocoding-api.open-meteo.com/v1/search', 'dynamic place-name search; not weather', 'no key in configured requests', 'server/places.ts'),
        ('OSM Nominatim', 'https://nominatim.openstreetmap.org/reverse', 'dynamic place labels', 'no key; paced upstream requests', 'server/places.ts'),
        ('OSM tiles', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', 'street map context', 'no key; usage policy applies', 'src/components/GeoMap.tsx'),
        ('Copernicus EMS / UNESCO', 'https://mapping.emergency.copernicus.eu/activations/EMSR927/', 'static imported optical reference; not live API or water truth', 'not applicable to bundled reference', 'public/data/references/rasuwa-emsr927.json'),
        ('Earthdata / ASF', 'https://nisar-docs.asf.alaska.edu/earthaccess/', 'optional local calibrated file access; actual processing not completed', 'manual interactive login; not persisted', 'processor/ingest.py'),
    ]
    with (DOCS / 'API_INVENTORY.csv').open('w', encoding='utf-8', newline='') as handle:
        writer = csv.writer(handle)
        writer.writerow(('service', 'endpoint_or_reference', 'use_and_evidence', 'authentication', 'source_files'))
        writer.writerows(rows)


def main() -> None:
    DOCS.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if SOURCE_ZIP.exists() or DOCS_ZIP.exists():
        raise SystemExit('Refusing to replace an existing submission ZIP; choose a new output name.')
    write_api_inventory()
    paths = {ROOT / name for name in ROOT_FILES + EXTRA_DOCS}
    for folder in FOLDERS:
        paths.update((ROOT / folder).rglob('*'))
    paths.update(DOCS.rglob('*'))
    candidates = sorted((p for p in paths if approved(p)), key=lambda p: p.relative_to(ROOT).as_posix())
    missing = [name for name in ROOT_FILES + EXTRA_DOCS if not (ROOT / name).is_file()]
    if missing:
        raise SystemExit(f'Missing required source/document files: {missing}')
    # Report only the file name if the scan fails, never a matching secret value.
    entries = []
    for path in candidates:
        data = path.read_bytes()
        if any(pattern.search(data) for pattern in SECRET_PATTERNS):
            raise SystemExit(f'Potential credential pattern: excluded from handoff pending review: {path.relative_to(ROOT)}')
        entries.append({'path': path.relative_to(ROOT).as_posix(), 'bytes': len(data), 'sha256': digest(data)})
    manifest = {
        'schemaVersion': '1.0.0',
        'project': 'SARFlow',
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'gitBaseCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'snapshotStatus': 'Current working source including uncommitted changes; not identical to GitHub base.',
        'scientificStatus': 'Real NASA browse imagery and metadata; no completed real calibrated numerical validation.',
        'exclusions': 'Git history, credentials, environments, dependencies, local data, caches and generated outputs.',
        'fileCount': len(entries),
        'files': entries,
    }
    manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
    with ZipFile(SOURCE_ZIP, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
        for path, entry in zip(candidates, entries):
            archive.write(path, entry['path'])
        archive.writestr('SOURCE_MANIFEST.json', manifest_bytes)
    with ZipFile(DOCS_ZIP, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
        for path in sorted(DOCS.iterdir()):
            if path.is_file():
                archive.write(path, path.name)
    with ZipFile(SOURCE_ZIP) as archive:
        assert archive.testzip() is None, 'ZIP CRC check failed'
        assert len(set(archive.namelist())) == len(entries) + 1
        for entry in entries:
            data = archive.read(entry['path'])
            assert digest(data) == entry['sha256'], 'Manifest hash mismatch'
            assert approved(ROOT / entry['path']), 'Disallowed archive entry'
        assert json.loads(archive.read('SOURCE_MANIFEST.json')) == manifest
    with ZipFile(DOCS_ZIP) as archive:
        assert archive.testzip() is None, 'Documentation ZIP CRC check failed'
    report = {
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'includedSourceFiles': len(entries),
        'checks': ['allowlisted file paths', 'blocked secret/environment names', 'symlink exclusion',
                   'limited credential-pattern scan (not a complete security audit)', 'ZIP CRC integrity',
                   'every source entry matches SHA-256 manifest', 'documentation ZIP integrity'],
        'archives': [
            {'file': path.name, 'bytes': path.stat().st_size, 'sha256': digest(path.read_bytes())}
            for path in (SOURCE_ZIP, DOCS_ZIP)
        ],
        'applicationChanges': 'None; documentation and packaging helper only.',
        'limits': 'Not an extracted clean-room build, scientific validation, public-access check or submission.',
    }
    (OUTPUT / 'PACKAGE_VERIFICATION.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
