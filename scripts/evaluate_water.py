"""Evaluate target-date water candidates against an independently prepared raster.

Reference codes: 0 not water, 1 water, nodata excluded. Prediction classes
1/2 are target-date water candidates; 3/4 are not water; 0/5 are excluded.
This evaluates agreement on classified support, not event attribution.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path

import numpy as np
import rasterio

from gcov_reader import file_hash


def metrics(tp, fp, fn, tn):
    def ratio(a, b):
        return a / b if b else None
    return {
        'precision': ratio(tp, tp + fp), 'recall': ratio(tp, tp + fn),
        'f1': ratio(2 * tp, 2 * tp + fp + fn),
        'intersectionOverUnion': ratio(tp, tp + fp + fn),
        'accuracy': ratio(tp + tn, tp + fp + fn + tn),
    }


def evaluate(result_path, reference_path, metadata_path):
    result_path, reference_path = Path(result_path), Path(reference_path)
    report = json.loads(result_path.read_text(encoding='utf-8'))
    provenance = json.loads(Path(metadata_path).read_text(encoding='utf-8'))
    for field in ('source', 'acquisitionTime', 'samplingMethod', 'preparationMethod', 'limitations'):
        if not isinstance(provenance.get(field), str) or not provenance[field].strip():
            raise ValueError('Reference metadata requires nonempty ' + field)
    if provenance.get('independentOfPrediction') is not True:
        raise ValueError('Reference independence must be explicitly declared')
    try:
        acquired = datetime.fromisoformat(provenance['acquisitionTime'].replace('Z', '+00:00'))
        if acquired.tzinfo is None:
            raise ValueError()
    except ValueError:
        raise ValueError('Reference acquisitionTime must be an ISO timestamp with timezone') from None
    if report.get('algorithm') != 'sarflow-water-candidates-v1':
        raise ValueError('Unsupported prediction algorithm')
    data_type = report.get('dataType')
    if data_type not in ('calibrated-measurements', 'synthetic-software-fixture'):
        raise ValueError('Unknown prediction data type')
    prediction = result_path.parent / 'classes.tif'
    prediction_hash = file_hash(prediction)
    if report.get('outputHashes', {}).get('classes.tif') != prediction_hash:
        raise ValueError('Prediction checksum does not match processing receipt')
    totals = dict(truePositive=0, falsePositive=0, falseNegative=0, trueNegative=0)
    reference_valid = classified = evaluated = total = 0
    with rasterio.open(prediction) as pred, rasterio.open(reference_path) as ref:
        # External masks/auxiliary files can alter evaluated pixels without
        # changing classes.tif. The current pipeline hashes only the TIFF.
        if any(Path(name).resolve() != prediction.resolve() for name in pred.files):
            raise ValueError('Prediction sidecars are not covered by the processing checksum')
        if pred.count != 1 or ref.count != 1 or pred.crs is None or ref.crs is None:
            raise ValueError('Single-band rasters with explicit CRS are required')
        if pred.crs != ref.crs or pred.transform != ref.transform or pred.shape != ref.shape:
            raise ValueError('Reference must exactly match prediction CRS, transform and shape; no implicit resampling')
        bounds = list(pred.bounds)
        crs = pred.crs.to_string()
        reference_files = [{'name': Path(name).name, 'sha256': file_hash(name)} for name in ref.files]
        for _, window in pred.block_windows(1):
            p, r = pred.read(1, window=window, masked=True), ref.read(1, window=window, masked=True)
            pv, rv = ~np.ma.getmaskarray(p), ~np.ma.getmaskarray(r)
            if np.any(pv & ~np.isin(p.data, [0, 1, 2, 3, 4, 5])):
                raise ValueError('Unexpected prediction class')
            if np.any(rv & ~np.isin(r.data, [0, 1])):
                raise ValueError('Reference must contain only 0/1 or declared nodata')
            support = pv & np.isin(p.data, [1, 2, 3, 4])
            valid = support & rv
            water = np.isin(p.data, [1, 2])
            truth = r.data == 1
            for key, condition in (
                ('truePositive', water & truth), ('falsePositive', water & ~truth),
                ('falseNegative', ~water & truth), ('trueNegative', ~water & ~truth),
            ):
                totals[key] += int(np.count_nonzero(valid & condition))
            total += p.size
            classified += int(support.sum())
            reference_valid += int(rv.sum())
            evaluated += int(valid.sum())
    return {
        'schemaVersion': '1.0', 'method': 'target-water-pixel-agreement-v1',
        'status': 'software-fixture-only' if data_type == 'synthetic-software-fixture' else ('agreement-computed' if evaluated else 'no-evaluable-support'),
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'predictionSha256': prediction_hash, 'processingReceiptSha256': file_hash(result_path),
        'reference': {**provenance, 'sha256': file_hash(reference_path), 'files': reference_files},
        'scope': {'bounds': bounds, 'crs': crs, 'observations': report.get('observations', [])},
        'sampleUnit': 'raster pixel', 'sampleSize': evaluated,
        'support': {'totalCells': total, 'classifiedCells': classified, 'referenceValidCells': reference_valid,
                    'evaluatedCells': evaluated, 'excludedCells': total - evaluated},
        'confusionMatrix': totals,
        'metrics': metrics(totals['truePositive'], totals['falsePositive'], totals['falseNegative'], totals['trueNegative']),
        'limitations': ['Metrics apply only to joint classified/reference support; exclusions can bias agreement.',
                        'Spatially correlated pixels are not independent statistical samples.',
                        'Reference independence and temporal suitability require human review; metadata declarations are not verification.',
                        'No flood cause, inundated vegetation accuracy, confidence probability or physical area is established.'],
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('result', 'reference', 'metadata', 'output'):
        parser.add_argument(name)
    args = parser.parse_args()
    evaluation = evaluate(args.result, args.reference, args.metadata)
    # Never alter the original processing receipt or overwrite an earlier evaluation.
    with Path(args.output).open('x', encoding='utf-8') as destination:
        json.dump(evaluation, destination, indent=2, allow_nan=False)
