"""Explicit, local preparation for the focused study. No credential arguments or logs."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GIB = 1024 ** 3
CONFIG_NAME = 'sarflow-study-config.json'


def storage_path(value: str) -> Path:
    supplied = Path(value).expanduser()
    if not supplied.is_absolute() or '..' in supplied.parts:
        raise ValueError('Choose an absolute storage folder without parent traversal.')
    for part in (supplied, *supplied.parents):
        if part.is_symlink() or getattr(part, 'is_junction', lambda: False)():
            raise ValueError('Choose a storage path without symlinks or junctions.')
    target = supplied.resolve()
    if target == Path(target.anchor) or target == ROOT or target == Path.home():
        raise ValueError('Choose a dedicated subfolder, not a drive root, home or source root.')
    if target.exists() and not target.is_dir():
        raise ValueError('The storage path is not a directory.')
    return target


def make_config(budget_gib: int, max_file_gib: int, downloads: int) -> dict:
    if not 1 <= budget_gib <= 128 or not 1 <= max_file_gib <= min(budget_gib, 64):
        raise ValueError('Choose a 1–128 GiB budget and a 1–64 GiB per-file cap within it.')
    if not 1 <= downloads <= 4:
        raise ValueError('Choose one to four download attempts per explicit cycle.')
    return {
        'intervalSeconds': 21600, 'lookbackDays': 365, 'maxPages': 5,
        'pageSize': 100, 'maxDownloadsPerCycle': downloads,
        'maxFileBytes': max_file_gib * GIB, 'maxStorageBytes': budget_gib * GIB,
        'processTimeoutSeconds': 900, 'windowPixels': 256,
        'locations': [{'id': 'brahmaputra', 'name': 'Brahmaputra radar-change study',
                       'lat': 25.15, 'lon': 89.8}],
    }


def preflight(target: Path, config: dict, reserve_gib: int = 3) -> dict:
    if not 1 <= reserve_gib <= 20:
        raise ValueError('Reserve must be between 1 and 20 GiB.')
    probe = target
    while not probe.exists():
        if probe.parent == probe:
            raise ValueError('The selected storage drive is unavailable. Connect it or choose an available drive.')
        probe = probe.parent
    free = shutil.disk_usage(probe).free
    used = sum(p.stat().st_size for p in target.rglob('*') if p.is_file()) if target.exists() else 0
    remaining = max(0, config['maxStorageBytes'] - used)
    return {
        'freeBytes': free, 'existingStorageBytes': used,
        'remainingConfiguredBudgetBytes': remaining,
        'reserveBytes': reserve_gib * GIB,
        'storageReady': free >= remaining + reserve_gib * GIB,
        'authentication': 'manual interactive sign-in required for ingestion; not checked',
        'calibratedRunCompleted': False,
        'independentValidation': 'not-established-by-preflight',
    }


def write_config(target: Path, config: dict) -> Path:
    target.mkdir(parents=True, exist_ok=True)
    destination = target / CONFIG_NAME
    # Never replace a reviewed configuration or an existing user's file.
    with destination.open('x', encoding='utf-8') as handle:
        json.dump(config, handle, indent=2)
        handle.write('\n')
    return destination


def worker_command(target: Path, config_path: Path, ingest: bool = False) -> list[str]:
    command = [sys.executable, '-m', 'processor.service', '--once',
               '--storage', str(target), '--config', str(config_path)]
    if ingest:
        command.extend(['--ingest', '--earthdata-login'])
    return command


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['check', 'prepare', 'discover', 'ingest', 'status'])
    parser.add_argument('--storage', required=True, help='Dedicated absolute folder chosen by you')
    parser.add_argument('--budget-gib', type=int, default=24, help='Used only when preparing a new config')
    parser.add_argument('--max-file-gib', type=int, default=8, help='Per-file cap in a new config')
    parser.add_argument('--downloads', type=int, default=2, help='Attempts per explicitly requested cycle')
    parser.add_argument('--reserve-gib', type=int, default=3, help='Preflight free-space reserve')
    args = parser.parse_args()
    target = storage_path(args.storage)
    config_path = target / CONFIG_NAME
    if config_path.is_symlink():
        raise ValueError('Configuration symlinks are not supported.')
    if config_path.exists():
        config = json.loads(config_path.read_text(encoding='utf-8-sig'))
    else:
        config = make_config(args.budget_gib, args.max_file_gib, args.downloads)
    sys.path.insert(0, str(ROOT))
    from processor.worker import validate_config
    config = validate_config(config)
    if args.action == 'check':
        print(json.dumps(preflight(target, config, args.reserve_gib), indent=2))
        return 0
    if args.action == 'prepare':
        if config_path.exists():
            raise ValueError('Configuration already exists and was preserved. Use check/discover or choose a new dedicated folder.')
        write_config(target, config)
        print('Prepared a local study configuration. No login, download or processing occurred.')
        return 0
    if not config_path.is_file():
        raise ValueError('Run prepare first; no existing configuration was found.')
    if args.action == 'status':
        if not (target / 'monitoring.sqlite').is_file():
            raise ValueError('No processor state exists yet. Run discover first.')
        return subprocess.run([sys.executable, '-m', 'processor.cli', 'status', '--storage', str(target)], cwd=ROOT).returncode
    if args.action == 'ingest':
        if not preflight(target, config, args.reserve_gib)['storageReady']:
            raise ValueError('Insufficient free space for the remaining budget plus reserve; nothing downloaded.')
        if not sys.stdin.isatty():
            raise ValueError('Run ingestion in your own interactive terminal for manual Earthdata sign-in.')
    # Inherit the user's terminal; never capture or persist an authentication transcript.
    code = subprocess.run(worker_command(target, config_path, args.action == 'ingest'), cwd=ROOT).returncode
    print('Inspect status for actual outcomes. A finished cycle does not establish a processed or validated result.')
    return code


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, OSError) as error:
        # Do not print exception details, file contents, authentication redirects or tokens.
        if isinstance(error, ValueError):
            raise SystemExit(str(error)) from None
        raise SystemExit('Local workflow could not access the selected storage/configuration. Nothing was deleted.') from None
