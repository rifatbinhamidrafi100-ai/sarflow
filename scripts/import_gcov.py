"""Import a small compatible GCOV window. Never downloads or handles credentials.

The operator must independently review product calibration and quality masks.
This conservative importer accepts only north-up projected metre grids and
checks product masks directly; an acknowledgment is not validation. Run --help for usage.
"""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('files', nargs='+', type=Path, help='Two or more local NISAR GCOV HDF5 products')
    p.add_argument('--id', required=True, help='Unique lowercase hyphenated dataset ID')
    p.add_argument('--title', required=True)
    p.add_argument('--location', required=True)
    p.add_argument('--phenomenon', choices=['wetland', 'agriculture', 'disturbance'], default='wetland')
    p.add_argument('--frequency', choices=['A', 'B'], default='A')
    p.add_argument('--polarization', choices=['HHHH', 'HVHV', 'VHVH', 'VVVV'], default='HHHH')
    p.add_argument('--row', type=int, required=True)
    p.add_argument('--col', type=int, required=True)
    p.add_argument('--size', type=int, default=128, help='Native-pixel window, 3 to 256; no resampling')
    p.add_argument('--quality-reviewed', action='store_true', help='Acknowledge external review of calibration, geometry, and quality masks')
    p.add_argument('--output', type=Path, required=True, help='New JSON path; existing files are refused')
    return p


def import_window(args):
    import re
    import h5py
    import numpy as np
    from pyproj import CRS, Transformer
    from gcov_reader import metadata, read_tile
    # --quality-reviewed is retained for CLI compatibility, never treated as validation.
    if not re.fullmatch(r'[a-z0-9-]+', args.id) or args.id in ['delta', 'fields', 'forest']:
        raise ValueError('Use a unique lowercase dataset ID, distinct from built-in IDs')
    if not 2 <= len(args.files) <= 30 or not 3 <= args.size <= 256 or min(args.row, args.col) < 0:
        raise ValueError('Require 2–30 products, a 3–256 pixel window, and nonnegative offsets')
    if args.output.exists():
        raise ValueError('Output already exists; choose a new filename')
    observations, files, reference = [], [], None
    def text(group, key):
        value = group[key][()]
        return value.decode() if isinstance(value, bytes) else str(value)
    for filename in args.files:
        with h5py.File(filename, 'r') as f:
            identity = f['/science/LSAR/identification']
            if text(identity, 'productType') != 'GCOV':
                raise ValueError('Only GCOV intensity products are supported')
            checked_metadata = metadata(f, args.frequency, args.polarization)
            grid = f[f'/science/LSAR/GCOV/grids/frequency{args.frequency}']
            epsg = int(grid['projection'][()])
            crs = CRS.from_epsg(epsg)
            if not crs.is_projected or any(axis.unit_name != 'metre' for axis in crs.axis_info):
                raise ValueError('Require a projected grid in metres')
            x = grid['xCoordinates'][args.col:args.col+args.size]
            y = grid['yCoordinates'][args.row:args.row+args.size]
            if len(x) != args.size or len(y) != args.size:
                raise ValueError('Window extends beyond the raster')
            dx, dy = float(x[1]-x[0]), float(y[1]-y[0])
            if dx <= 0 or dy >= 0 or not np.allclose(np.diff(x), dx) or not np.allclose(np.diff(y), dy):
                raise ValueError('Require regular eastward x and north-to-south y coordinates')
            signature = (epsg, text(identity, 'trackNumber'), text(identity, 'frameNumber'), text(identity, 'lookDirection'), text(identity, 'orbitPassDirection'), json.dumps(checked_metadata, sort_keys=True))
            if reference is None:
                reference = (signature, x.copy(), y.copy())
                transform = Transformer.from_crs(crs, 'EPSG:4326', always_xy=True)
                corners = [transform.transform(xx, yy) for xx, yy in [(x[0]-dx/2, y[0]-dy/2), (x[-1]+dx/2, y[0]-dy/2), (x[-1]+dx/2, y[-1]+dy/2), (x[0]-dx/2, y[-1]+dy/2)]]
                bounds = [min(c[0] for c in corners), min(c[1] for c in corners), max(c[0] for c in corners), max(c[1] for c in corners)]
                if bounds[2]-bounds[0] > 1 or bounds[3]-bounds[1] > 1 or bounds[1] < -85 or bounds[3] > 85:
                    raise ValueError('Window is outside the supported small non-polar display extent')
            elif signature != reference[0] or not np.array_equal(x, reference[1]) or not np.array_equal(y, reference[2]):
                raise ValueError('Products differ in CRS, track/frame/look direction or exact grid; coregister externally')
            raster = grid[args.polarization]
            values, valid, quality_known = read_tile(f, args.frequency, args.polarization, args.row, args.col, args.size, args.size)
            if not valid.any():
                raise ValueError('Window has no valid positive intensity cells')
            acquired = datetime.fromisoformat(text(identity, 'zeroDopplerStartTime').replace('Z', '+00:00')).astimezone(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
            observations.append({'id': filename.stem, 'sourceId': filename.stem, 'date': acquired, 'power': [float(v) if ok else None for v, ok in zip(values.ravel(), valid.ravel())]})
        with filename.open('rb') as stream:
            sha = hashlib.file_digest(stream, 'sha256').hexdigest()
        files.append({'name': filename.name, 'sha256': sha})
    observations.sort(key=lambda o: o['date'])
    if len({o['date'] for o in observations}) != len(observations):
        raise ValueError('Duplicate acquisition times cannot form a chronological series')
    return {'id': args.id, 'title': args.title, 'location': args.location, 'phenomenon': args.phenomenon, 'status': 'observed', 'description': 'Native GCOV window with subswath validity applied; terrain exclusions and event attribution are not validated.', 'bounds': bounds, 'width': args.size, 'height': args.size, 'pixelAreaM2': None, 'crs': f'EPSG:{epsg}', 'polarization': args.polarization, 'track': reference[0][1], 'unit': 'linear power', 'provenance': {'source': 'Operator-supplied NISAR L-SAR GCOV HDF5', 'url': 'https://science.nasa.gov/mission/nisar/', 'product': f'GCOV frequency{args.frequency} {args.polarization}', 'created': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'), 'license': 'Source product terms apply; consult NASA/ASF distribution metadata', 'processing': [f'Native window row={args.row}, col={args.col}, size={args.size}', 'Apply GCOV subswath mask 1-5 and numberOfLooks; reject nonfinite, nonpositive and declared fill values', 'No resampling or radiometric recalibration', 'Pairwise common-valid mask; optional 3x3 mean; log-ratio; threshold'], 'limitations': ['Radiometry, versions and processing metadata are checked for compatibility. This is not independent calibration validation.', 'GCOV mask values 1-5 and positive finite numberOfLooks are required. Terrain/layover exclusion is not established by this mask.', 'Map display uses an axis-aligned geographic envelope; projected grid rotation is approximate in the display only.', 'Physical area is withheld pending assessment of projection and valid quality support.', 'No event classification, displacement estimate or validated confidence.'], 'files': files}, 'observations': observations}


if __name__ == '__main__':
    args = parser().parse_args()
    try:
        dataset = import_window(args)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open('x', encoding='utf-8') as output:
            json.dump(dataset, output, allow_nan=False)
        print(f'Wrote {len(dataset["observations"])} observations. Validate through the SARFlow API before analysis.')
    except (ValueError, KeyError, OSError, ImportError) as exc:
        raise SystemExit(f'Import stopped: {exc}')
