"""Cross-language integration fixture: never an observed scientific result."""
import json
from pathlib import Path
import subprocess
import sys

root = Path(sys.argv[1])
repository = Path(__file__).resolve().parents[1]
subprocess.run([sys.executable, str(repository/'tests/create_water_fixture.py'), str(root)], check=True)
sys.path.insert(0, str(repository/'scripts'))
from water_pipeline import run
from evaluate_water import evaluate
import numpy as np
import rasterio
from rasterio.transform import from_origin

output = root/'result'
run(root/'data/water-inputs/fixture.json', output, {})
# Prescribed fixture truth, not read or derived from the prediction raster.
labels = np.zeros((16, 16), dtype='uint8')
labels[:8] = 1
reference = root/'reference.tif'
with rasterio.open(reference, 'w', driver='GTiff', height=16, width=16, count=1,
                   dtype='uint8', crs='EPSG:32646', transform=from_origin(500000,2700010,10,10)) as dst:
    dst.write(labels, 1)
metadata = root/'reference.json'
metadata.write_text(json.dumps(dict(source='Prescribed synthetic labels', acquisitionTime='2026-01-04T00:00:00Z',
    samplingMethod='All fixture cells', preparationMethod='Known fixture truth; not read from predictions',
    limitations='Software integration only', independentOfPrediction=True)))
(output/'evaluation.json').write_text(json.dumps(evaluate(output/'result.json', reference, metadata), allow_nan=False))
