"""Offline, bounded reference evaluation; never invents validation observations.

evaluate(result_dir, reference_manifest) writes evaluation.json atomically. Manifest
cases identify independently reviewed binary *new-water* labels (0/1/255), an
unaltered result.json and classes.tif, acquisition day, terrain and season. Paths
are relative to the manifest. Review/independence fields are human attestations,
not facts established by this software. No reprojection or label interpolation.

Two-stage approval: first evaluate, inspect evidence and evaluationDigest; then
set approval={evaluationDigest: ..., signedOffBy: ..., statement: ...} and rerun.
This is an offline human sign-off, not a cryptographic identity/signature service.
Approval is scoped to these exact bytes, policy, evaluator and current result;
it never validates a future acquisition. Policy overrides are offline only.
"""
import hashlib
import json
import math
import os
import tempfile
from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import transform_bounds
from pyproj import Geod, Transformer

DEFAULT_POLICY = {
    'minCases': 6, 'minEvents': 3, 'minTerrains': 2, 'minSeasons': 2,
    'minPositivePixels': 100, 'minNegativePixels': 100,
    'minCoverage': .95, 'minPrecisionLower': .9, 'minRecallLower': .9,
    'maxFalsePositiveRate': .05, 'maxMissRate': .1,
}


def _hash(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def _canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()


def _text(obj, key):
    value = obj.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError('Missing reference attestation: ' + key)
    return value.strip()


def _ratio(a, b):
    return a / b if b else None


def wilson_lower(successes, total):
    """95% Wilson lower bound for pixel proportions; not spatial independence."""
    if not total:
        return None
    z = 1.959963984540054
    p = successes / total
    return (p + z*z/(2*total) - z*math.sqrt(p*(1-p)/total + z*z/(4*total*total))) / (1+z*z/total)


def confusion(predicted, reference):
    known = np.isin(reference, [0, 1])
    decided = np.isin(predicted, [1, 2, 3, 4]) & known
    positive = predicted == 2
    count = lambda mask: int(np.count_nonzero(mask))
    return {
        'tp': count(decided & positive & (reference == 1)),
        'fp': count(decided & positive & (reference == 0)),
        'fn': count(decided & ~positive & (reference == 1)),
        'tn': count(decided & ~positive & (reference == 0)),
        'abstainedPositive': count(known & ~decided & (reference == 1)),
        'abstainedNegative': count(known & ~decided & (reference == 0)),
        'excluded': count(known & np.isin(predicted, [0, 255])),
        'insufficient': count(known & (predicted == 5)),
        'referenceUnknown': count(~known),
    }


def metrics(counts):
    tp, fp, fn, tn = (counts[k] for k in ('tp', 'fp', 'fn', 'tn'))
    ap, an = counts['abstainedPositive'], counts['abstainedNegative']
    positives, negatives = tp+fn+ap, fp+tn+an
    return {**counts, 'positivePixels': positives, 'negativePixels': negatives,
            'precision': _ratio(tp, tp+fp), 'recall': _ratio(tp, tp+fn),
            'falsePositiveRate': _ratio(fp, fp+tn), 'missRate': _ratio(fn+ap, positives),
            'effectiveRecall': _ratio(tp, positives),
            'coverage': _ratio(tp+fp+fn+tn, positives+negatives),
            'precisionLower95': wilson_lower(tp, tp+fp),
            'recallLower95': wilson_lower(tp, positives)}


def _aggregate(cases):
    keys = confusion(np.array([], dtype=int), np.array([], dtype=int))
    return metrics({key: sum(c['counts'][key] for c in cases) for key in keys})


def _policy(manifest):
    overrides = manifest.get('policy', {})
    if not isinstance(overrides, dict) or set(overrides) - set(DEFAULT_POLICY):
        raise ValueError('Unknown validation policy')
    policy = {**DEFAULT_POLICY, **overrides}
    for key, value in policy.items():
        if key.startswith('min') and key in ('minCases', 'minEvents', 'minTerrains', 'minSeasons', 'minPositivePixels', 'minNegativePixels'):
            if type(value) is not int or value < 1:
                raise ValueError('Validation sample minimums must be positive integers')
        elif type(value) not in (int, float) or not math.isfinite(value) or not 0 < value <= 1:
            raise ValueError('Validation rate thresholds must be in (0, 1]')
    return policy


def _check_metrics(value, policy, scope):
    reasons = []
    for metric, threshold, minimum in [
        ('positivePixels', 'minPositivePixels', True), ('negativePixels', 'minNegativePixels', True),
        ('coverage', 'minCoverage', True), ('precisionLower95', 'minPrecisionLower', True),
        ('recallLower95', 'minRecallLower', True), ('falsePositiveRate', 'maxFalsePositiveRate', False),
        ('missRate', 'maxMissRate', False),
    ]:
        v = value[metric]
        if v is None or (v < policy[threshold] if minimum else v > policy[threshold]):
            reasons.append(scope + ': ' + metric + ' does not meet ' + threshold)
    return reasons


def _result(path):
    value = json.loads(path.read_text(encoding='utf-8-sig'))
    if value.get('dataType') != 'calibrated-measurements':
        raise ValueError('Synthetic or untyped results cannot be scientifically evaluated')
    if value.get('algorithm') != 'sarflow-water-candidates-v1' or not isinstance(value.get('parameters'), dict):
        raise ValueError('Unsupported algorithm or missing parameters')
    observations = value.get('observations', [])
    if len(observations) < 4 or any(not isinstance(o.get('sha256'), str) or len(o['sha256']) != 64 for o in observations):
        raise ValueError('Result requires source measurement hashes')
    return value


def _area(classes_path):
    total = 0.
    geod = Geod(ellps='WGS84')
    with rasterio.open(classes_path) as ds:
        to_geo = Transformer.from_crs(ds.crs, 'EPSG:4326', always_xy=True)
        for row, col in np.argwhere(ds.read(1) == 2):
            corners = [ds.transform * (col, row), ds.transform * (col+1, row),
                       ds.transform * (col+1, row+1), ds.transform * (col, row+1)]
            lon, lat = to_geo.transform(*zip(*corners))
            area, _ = geod.polygon_area_perimeter(lon, lat)
            if not math.isfinite(area):
                raise ValueError('Cannot establish finite geodesic pixel area')
            total += abs(area)
    return total / 1_000_000


def _evaluate(result_dir: Path, reference_manifest: Path) -> dict:
    """Evaluate bounded held-out cases and withhold publication unless all gates pass."""
    result_dir, reference_manifest = Path(result_dir).resolve(), Path(reference_manifest).resolve()
    current_path = result_dir / 'result.json'
    current = _result(current_path)
    manifest = json.loads(reference_manifest.read_text(encoding='utf-8-sig'))
    raw_cases = manifest.get('cases')
    if not isinstance(raw_cases, list) or not 1 <= len(raw_cases) <= 100:
        raise ValueError('Reference manifest requires 1–100 cases')
    policy = _policy(manifest)
    cases = []; seen_ids = set(); seen_labels = set(); seen_results = set(); current_matches = []
    for case in raw_cases:
        fields = {k: _text(case, k) for k in ('id', 'eventId', 'source', 'method', 'reviewer',
                   'independenceStatement', 'date', 'terrain', 'season')}
        if case.get('split') != 'held-out' or case.get('dataType') != 'independent-reference':
            raise ValueError('Only independently attested held-out references are accepted')
        if fields['id'] in seen_ids:
            raise ValueError('Duplicate reference case')
        seen_ids.add(fields['id'])
        paths = {k: (reference_manifest.parent / _text(case, k)).resolve() for k in ('labels', 'classes', 'result')}
        if paths['classes'] != paths['result'].parent / 'classes.tif':
            raise ValueError('Classes must belong to the specified result')
        result = _result(paths['result'])
        if result['algorithm'] != current['algorithm'] or result['parameters'] != current['parameters']:
            raise ValueError('All references must evaluate identical algorithm and parameters')
        target_day = max(o['date'] for o in result['observations'])[:10]
        if fields['date'] != target_day:
            raise ValueError('Reference date must match target acquisition day')
        hashes = {k: _hash(v) for k, v in paths.items()}
        if hashes['result'] in seen_results:
            raise ValueError('Duplicate evaluated result')
        seen_results.add(hashes['result'])
        if result.get('outputHashes', {}).get('classes.tif') != hashes['classes']:
            raise ValueError('Classification output hash does not match result provenance')
        if hashes['labels'] in seen_labels:
            raise ValueError('Duplicate reference raster')
        seen_labels.add(hashes['labels'])
        with rasterio.open(paths['labels']) as ref, rasterio.open(paths['classes']) as pred:
            if ref.count != 1 or pred.count != 1 or not ref.crs or ref.crs != pred.crs or ref.transform != pred.transform or ref.shape != pred.shape:
                raise ValueError('Reference and classification grid must match exactly')
            if not 1 <= ref.width*ref.height <= 1024*1024:
                raise ValueError('Reference evaluation exceeds bounded window size')
            if not np.issubdtype(np.dtype(ref.dtypes[0]), np.integer) or not np.issubdtype(np.dtype(pred.dtypes[0]), np.integer):
                raise ValueError('Classification and reference must be integer categorical rasters')
            labels, classes = ref.read(1), pred.read(1)
            if ref.nodata not in (None, 255) or pred.nodata not in (None, 255) or not np.isin(labels, [0, 1, 255]).all() or not np.isin(classes, [0, 1, 2, 3, 4, 5, 255]).all():
                raise ValueError('Invalid categorical labels or nodata')
            if np.any((ref.read_masks(1) == 0) & (labels != 255)) or np.any((pred.read_masks(1) == 0) & (classes != 255)):
                raise ValueError('Hidden raster masks are not accepted; encode nodata explicitly')
            window = result.get('window', {})
            if window.get('height') != pred.height or window.get('width') != pred.width or window.get('transform') != list(pred.transform)[:6] or result.get('compatibility', {}).get('epsg') != pred.crs.to_epsg():
                raise ValueError('Result grid provenance does not match classification')
            bounds = list(transform_bounds(pred.crs, 'EPSG:4326', *pred.bounds, densify_pts=21))
            for previous in cases:
                a = previous['bounds']
                if previous['date'] == fields['date'] and max(a[0], bounds[0]) < min(a[2], bounds[2]) and max(a[1], bounds[1]) < min(a[3], bounds[3]):
                    raise ValueError('Duplicate or overlapping event/date reference windows')
            counts = confusion(classes, labels)
            complete_candidate_reference = bool(np.all(labels[classes == 2] != 255))
        entry = {**fields, 'hashes': hashes, 'bounds': bounds, 'counts': counts,
                 'candidateReferenceComplete': complete_candidate_reference}
        cases.append(entry)
        if paths['result'] == current_path and hashes['result'] == _hash(current_path):
            current_matches.append(entry)
    strata = {}
    for field in ('terrain', 'season'):
        for name in sorted({c[field] for c in cases}):
            strata[field + ':' + name] = _aggregate([c for c in cases if c[field] == name])
    for terrain, season in sorted({(c['terrain'], c['season']) for c in cases}):
        strata['terrain-season:' + terrain + '/' + season] = _aggregate([c for c in cases if c['terrain'] == terrain and c['season'] == season])
    overall = _aggregate(cases)
    evidence = {'schemaVersion': 1, 'currentResultSha256': _hash(current_path),
                'evaluatorSha256': _hash(Path(__file__)), 'algorithm': current['algorithm'],
                'parameters': current['parameters'], 'policy': policy, 'cases': cases,
                'metrics': overall, 'strata': strata}
    digest = hashlib.sha256(_canonical(evidence)).hexdigest()
    reasons = _check_metrics(overall, policy, 'overall')
    for scope, values in strata.items():
        reasons.extend(_check_metrics(values, policy, scope))
    for count, minimum, label in [(len(cases), 'minCases', 'cases'),
        (len({c['eventId'] for c in cases}), 'minEvents', 'independent events'),
        (len({c['terrain'] for c in cases}), 'minTerrains', 'terrain categories'),
        (len({c['season'] for c in cases}), 'minSeasons', 'seasons')]:
        if count < policy[minimum]:
            reasons.append('Insufficient ' + label)
    if len(current_matches) != 1:
        reasons.append('Current result lacks one exact held-out reference match')
    elif not current_matches[0]['candidateReferenceComplete']:
        reasons.append('Some current candidate pixels have no reference labels')
    approval = manifest.get('approval', {})
    if not isinstance(approval, dict) or approval.get('evaluationDigest') != digest or not str(approval.get('signedOffBy') or '').strip() or not str(approval.get('statement') or '').strip():
        reasons.append('Missing human sign-off bound to this evaluation digest')
    eligible = not reasons
    report = {**evidence, 'evaluationDigest': digest,
        'review': approval if eligible else None,
        'scope': 'Only this exact reference-evaluated result; no future acquisition, confirmed flood, or causal attribution.',
        'limitations': ['Reference independence and reviewer identity are offline human attestations.',
                       'Pixel Wilson bounds do not account for spatial correlation; no event-level uncertainty claim.',
                       'Strata cover only supplied terrain/season categories; no geographic generalization.',
                       'Abstentions are excluded from conditional confusion rates and penalized in effective recall and coverage.'],
        'publication': {'eligible': eligible, 'reasons': reasons,
                        'classification': 'reference-evaluated new-water candidate' if eligible else None,
                        'areaKm2': _area(result_dir/'classes.tif') if eligible else None}}
    _write_atomic(result_dir, report)
    return report


def _write_atomic(result_dir, report):
    fd, temporary = tempfile.mkstemp(prefix='.evaluation-', suffix='.json', dir=result_dir)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, allow_nan=False)
        os.replace(temporary, result_dir/'evaluation.json')
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def evaluate(result_dir: Path, reference_manifest: Path) -> dict:
    """Evaluate and atomically replace the report, revoking old approval on failure.

    Invalid evidence raises ValueError (I/O errors may raise OSError). If a result
    directory exists, any old eligible report is replaced with a withheld report.
    A serving layer must additionally recheck result and output hashes before use.
    """
    result_dir = Path(result_dir).resolve()
    try:
        return _evaluate(result_dir, reference_manifest)
    except Exception:
        if result_dir.is_dir():
            _write_atomic(result_dir, {
                'schemaVersion': 1, 'evaluationDigest': None,
                'publication': {'eligible': False, 'classification': None, 'areaKm2': None,
                                'reasons': ['Reference evaluation failed; previous approval revoked.']}})
        raise
