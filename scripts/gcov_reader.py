"""Bounded GCOV Rev E/F reader. No downloads, credentials, or implicit masks."""
import hashlib
from datetime import datetime, timezone
import h5py
import numpy as np
from pyproj import CRS

BASE = '/science/LSAR/GCOV'
IDENTITY = '/science/LSAR/identification'
PARAMS = BASE + '/metadata/processingInformation/parameters'
REVIEWED_SPECIFICATIONS = ('1.2.1', '1.5.0')


def scalar(group, key, required=True):
    if key not in group:
        if required:
            raise ValueError('Required product metadata missing: ' + key)
        return None
    v = group[key][()]
    if isinstance(v, bytes):
        return v.decode('utf-8')
    return str(v)


def flag(value):
    if value is None:
        return None
    if value not in ('True', 'False', 'true', 'false'):
        raise ValueError('Unrecognized processing flag: ' + value)
    return value.lower() == 'true'


def file_hash(path):
    with open(path, 'rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def specification(f):
    version = scalar(f[IDENTITY], 'productSpecificationVersion')
    if version not in REVIEWED_SPECIFICATIONS:
        raise ValueError('Only reviewed GCOV specifications 1.2.1 and 1.5.0 are supported; review newer specifications before adding them')
    return version


def metadata(f, frequency, co, cross=None):
    identity = f[IDENTITY]
    if scalar(identity, 'productType') != 'GCOV':
        raise ValueError('Only GCOV products are supported')
    keys = ['productVersion', 'productSpecificationVersion', 'trackNumber', 'frameNumber',
            'lookDirection', 'orbitPassDirection', 'radarBand', 'processingType', 'isGeocoded']
    result = {k: scalar(identity, k) for k in keys}
    version = specification(f)
    if result['radarBand'] != 'L' or flag(result['isGeocoded']) is not True:
        raise ValueError('Require geocoded L-SAR GCOV')
    if result['lookDirection'] not in ('Left', 'Right') or result['orbitPassDirection'] not in ('Ascending', 'Descending'):
        raise ValueError('Unknown acquisition geometry')
    p = f[PARAMS]
    for k in ['radiometricTerrainCorrectionApplied', 'shadowMaskingApplied', 'rfiMitigationApplied', 'noiseCorrectionApplied']:
        result[k] = flag(scalar(p, k, required=k == 'radiometricTerrainCorrectionApplied'))
    if result['radiometricTerrainCorrectionApplied'] is not True:
        raise ValueError('Radiometric terrain correction must be explicitly applied')
    normalization = scalar(p, 'rtc/outputBackscatterNormalizationConvention').lower().replace('_', '').replace('-', '')
    expression = scalar(p, 'rtc/outputBackscatterExpressionConvention').lower().strip()
    accepted_expressions = ('linear', 'linear power') if version == '1.5.0' else ('linear',)
    if normalization not in ('gamma0', 'gamma naught', 'gamma-naught') or expression not in accepted_expressions:
        raise ValueError('Require explicit linear gamma0 radiometry; no conversion is guessed')
    result.update(frequency=frequency, co=co, cross=cross, normalization=normalization, expression='linear',
                  softwareVersion=scalar(f[BASE + '/metadata/processingInformation/algorithms'], 'softwareVersion'))
    grid = f[f'{BASE}/grids/frequency{frequency}']
    epsg = int(grid['projection'][()]); crs = CRS.from_epsg(epsg)
    if not crs.is_projected or any(a.unit_name != 'metre' for a in crs.axis_info):
        raise ValueError('Require a projected metre grid')
    result['epsg'] = epsg
    for channel in [co, cross]:
        if channel is None:
            continue
        if channel not in ('HHHH', 'HVHV', 'VVVV', 'VHVH') or channel not in grid:
            raise ValueError('Requested diagonal polarization is missing')
        layer = grid[channel]
        unit = layer.attrs.get('units'); unit = unit.decode() if isinstance(unit, bytes) else str(unit)
        if unit != '1' or layer.dtype.kind not in 'fiu':
            raise ValueError('Require real, dimensionless diagonal power; complex covariance is unsupported')
    return result


def read_tile(f, frequency, channel, row, col, height, width):
    version = specification(f)
    grid = f[f'{BASE}/grids/frequency{frequency}']; window = np.s_[row:row+height, col:col+width]
    raster = grid[channel]; values = np.asarray(raster[window], dtype=np.float64)
    if values.shape != (height, width):
        raise ValueError('Window exceeds raster dimensions')
    valid = np.isfinite(values) & (values > 0)
    fill = raster.attrs.get('_FillValue')
    if fill is not None:
        valid &= values != fill
    required_quality = ['mask', 'numberOfLooks']
    if version == '1.5.0':
        required_quality.append('inputDataExceptionMask')
    quality_known = all(key in grid for key in required_quality)
    if quality_known:
        if any(grid[key].shape != raster.shape for key in required_quality):
            raise ValueError('Quality grid shape mismatch')
        mask = np.asarray(grid['mask'][window]); looks = np.asarray(grid['numberOfLooks'][window])
        if mask.shape != values.shape or looks.shape != values.shape:
            raise ValueError('Quality grid shape mismatch')
        valid &= np.isin(mask, [1, 2, 3, 4, 5]) & np.isfinite(looks) & (looks > 0)
        if version == '1.5.0':
            # Rev F Table 5-3: zero is no anomaly; exclude all exception bits,
            # including unknown future codes, rather than interpreting them.
            exceptions = grid['inputDataExceptionMask']
            if exceptions.dtype.kind != 'u' or exceptions.dtype.itemsize != 1:
                raise ValueError('Require unsigned-byte input data exception mask')
            valid &= np.asarray(exceptions[window]) == 0
    else:
        valid[:] = False
    return np.where(valid, values, np.nan), valid, quality_known


def coordinates(f, frequency, row, col, height, width):
    grid = f[f'{BASE}/grids/frequency{frequency}']
    x = grid['xCoordinates'][col:col+width]; y = grid['yCoordinates'][row:row+height]
    if len(x) != width or len(y) != height or min(width, height) < 2:
        raise ValueError('Invalid coordinate window')
    dx, dy = x[1]-x[0], y[1]-y[0]
    if dx <= 0 or dy >= 0 or not np.allclose(np.diff(x), dx, rtol=0, atol=1e-7) or not np.allclose(np.diff(y), dy, rtol=0, atol=1e-7):
        raise ValueError('Require regular north-up native grid')
    return x, y


def acquisition(f):
    identity = f[IDENTITY]
    timestamp = scalar(identity, 'zeroDopplerStartTime')
    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    # Product specification defines UTC even when no suffix is stored.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return {'id': scalar(identity, 'granuleId'), 'date': dt.astimezone(timezone.utc).isoformat(),
            'processingDateTime': scalar(identity, 'processingDateTime')}
