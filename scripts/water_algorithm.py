"""Experimental water candidates, not OPERA output. Pure tile arithmetic."""
import numpy as np

LEGEND = {0: 'Excluded or unavailable product quality', 1: 'Persistent water candidate',
          2: 'New water candidate, not confirmed flood', 3: 'Receding water candidate',
          4: 'Non-water-like signal', 5: 'Insufficient evidence'}


def classify(co, cross, terrain, co_db=-17., cross_db=-24., change_db=3., margin_db=1.):
    if co.ndim != 3 or not 4 <= co.shape[0] <= 30:
        raise ValueError('Require three or more baseline dates plus one target (4–30 dates)')
    if not (-35 <= co_db <= -5 and -40 <= cross_db <= -10 and .5 <= change_db <= 10 and .1 <= margin_db <= 3):
        raise ValueError('Parameters outside supported experimental ranges')
    if cross is not None and cross.shape != co.shape:
        raise ValueError('Polarization shape mismatch')
    common = np.all(np.isfinite(co) & (co > 0), axis=0)
    if cross is not None:
        common &= np.all(np.isfinite(cross) & (cross > 0), axis=0)
    with np.errstate(invalid='ignore', divide='ignore'):
        a = 10 * np.log10(co)
        baseline = np.median(a[:-1], axis=0)
        delta = a[-1] - baseline
        pair_delta = a[-1] - a[-2]
    classes = np.zeros(co.shape[1:], dtype=np.uint8)
    classes[common] = 5
    reasons = np.zeros_like(classes)  # bitmask, separate from classifications
    reasons[~common] |= 1
    if terrain is None:
        terrain = np.full(classes.shape, 255)
    if terrain.shape != classes.shape:
        raise ValueError('Terrain mask shape mismatch')
    unknown_terrain = ~np.isin(terrain, [0, 1, 2, 3])
    excluded_terrain = np.isin(terrain, [1, 2, 3])
    reasons[unknown_terrain] |= 2; reasons[excluded_terrain] |= 4
    classes[excluded_terrain] = 0
    eligible = common & (terrain == 0)
    if cross is None:
        reasons[:] |= 8
    else:
        with np.errstate(invalid='ignore', divide='ignore'):
            b = 10 * np.log10(cross)
        water = (a < co_db-margin_db) & (b < cross_db-margin_db)
        dry = (a > co_db+margin_db) & (b > cross_db+margin_db)
        stable_water = np.all(water[:-1], axis=0)
        stable_dry = np.all(dry[:-1], axis=0)
        classes[eligible & stable_water & water[-1]] = 1
        classes[eligible & stable_dry & water[-1] & (delta <= -change_db)] = 2
        classes[eligible & stable_water & dry[-1] & (delta >= change_db)] = 3
        classes[eligible & stable_dry & dry[-1]] = 4
        reasons[eligible & (classes == 5)] |= 16
    # The baseline is generic signal change, including outside water evidence support.
    anomaly = np.where(common, (np.abs(pair_delta) >= change_db).astype(np.uint8), 255).astype(np.uint8)
    return {'classes': classes, 'reasons': reasons, 'delta': np.where(common, delta, np.nan),
            'baseline': np.where(common, baseline, np.nan), 'target': np.where(common, a[-1], np.nan),
            'anomaly': anomaly, 'common': common,
            'perDateValid': [int(np.count_nonzero(np.isfinite(frame))) for frame in co],
            'temporalMeansDb': [float(10*np.log10(np.mean(frame[common]))) if common.any() else None for frame in co]}
