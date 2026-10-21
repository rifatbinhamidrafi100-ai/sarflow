"""Reproduce a bounded single-product check. No network or authentication."""
import argparse
import json
import sys
from pathlib import Path

import h5py
import numpy as np
from pyproj import Transformer

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gcov_reader import metadata, read_tile, coordinates, acquisition, file_hash

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('file', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
if args.output.exists():
    raise SystemExit('Preserving existing report; choose a new output filename.')

# Deterministic diagnostic selection from the retained 49-window mask probe.
row, col, size = 11450, 5785, 64
with h5py.File(args.file, 'r') as source:
    info = metadata(source, 'A', 'HHHH', 'HVHV')
    x, y = coordinates(source, 'A', row, col, size, size)
    to_geo = Transformer.from_crs(info['epsg'], 4326, always_xy=True)
    report = {
        'sourceFile': args.file.name,
        'sourceBytes': args.file.stat().st_size,
        'sourceSha256': file_hash(args.file),
        'acquisition': acquisition(source),
        'metadata': info,
        'readerAccepted': True,
        'window': {'row': row, 'col': col, 'height': size, 'width': size,
                   'selection': 'First fully supported diagnostic window in retained mask probe; no event-based selection',
                   'centerLonLat': list(to_geo.transform(float(x[size//2]), float(y[size//2]))),
                   'pixelSpacingMetres': [float(x[1]-x[0]), float(y[1]-y[0])]},
        'qualityRule': 'Finite positive power; mask code 1-5; positive finite looks; inputDataExceptionMask == 0',
        'channels': {},
        'changeCalculated': False,
        'independentValidation': False,
        'limitations': [
            'A single acquisition provides no temporal change result.',
            'Valid GCOV support does not establish water, flooding, damage, or cause.',
            'Shadow masking, noise correction, and RFI mitigation are false in this product.',
            'Polar projected pixel spacing does not establish ground surface area.',
            'This Arctic window is a reader verification case, separate from Brahmaputra.',
        ],
    }
    for channel in ['HHHH', 'HVHV']:
        values, valid, known = read_tile(source, 'A', channel, row, col, size, size)
        supported = values[valid]
        report['channels'][channel] = {
            'qualityKnown': bool(known),
            'validPixels': int(valid.sum()),
            'totalPixels': int(values.size),
            'meanLinearGamma0': float(supported.mean()) if supported.size else None,
            'decibelsOfMeanPower': float(10*np.log10(supported.mean())) if supported.size else None,
        }
with args.output.open('x', encoding='utf-8') as stream:
    json.dump(report, stream, indent=2, allow_nan=False)
print(json.dumps(report, indent=2, allow_nan=False))
