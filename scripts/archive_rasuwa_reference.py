"""Archive public CEMS vectors via UNESCO. No login, cookies, private data, or raster classification."""
import argparse
import hashlib
import io
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen
from pyproj import CRS

DATASET = 'https://ihp-wins.unesco.org/en/dataset/damage-grading-syapru-besi-and-timure-rasuwa-district-nepal-27-august-2026'
BASE = 'https://ihp-wins.unesco.org/dataset/6ae71288-ec4b-4cd0-ad02-9bdc7f43df5d/resource/'
SOURCES = {
    'event': ('observed-event.zip', BASE+'84cd6198-8049-4700-b97c-db87b751d2b9/download/emsr927_aoi01_gra_product_observedeventa_v1.zip'),
    'aoi': ('area-of-interest.zip', BASE+'8cacb136-232e-4404-b667-b604abbf9539/download/emsr927_aoi01_gra_product_areaofinteresta_v1.zip'),
}


def read_layer(raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        if len(archive.infolist()) > 20 or sum(i.file_size for i in archive.infolist()) > 10_000_000:
            raise ValueError('Reference archive exceeds expanded budget')
        def one(suffix):
            names = [n for n in archive.namelist() if n.lower().endswith(suffix)]
            if len(names) != 1: raise ValueError('Ambiguous reference archive member')
            return archive.read(names[0])
        if CRS.from_wkt(one('.prj').decode('utf-8')).to_epsg() != 4326:
            raise ValueError('Only documented geographic EPSG:4326 reference coordinates are supported')
        source = one('.json')
        data = json.loads(source)
        if data.get('type') != 'FeatureCollection' or not 1 <= len(data.get('features', [])) <= 2000:
            raise ValueError('Expected bounded nonempty reference features')
        # Strip obsolete GeoJSON crs declaration; coordinates remain unmodified EPSG:4326.
        features = []
        for feature in data['features']:
            geometry = feature.get('geometry', {})
            if geometry.get('type') not in ('Polygon', 'MultiPolygon'):
                raise ValueError('Expected polygonal reference layer')
            polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
            for polygon in polygons:
                for ring in polygon:
                    if not 4 <= len(ring) <= 50000 or ring[0][:2] != ring[-1][:2]:
                        raise ValueError('Reference rings must be bounded and closed')
                    for point in ring:
                        if len(point) != 2 or not (84 < point[0] < 87 and 27 < point[1] < 30):
                            raise ValueError('Unexpected coordinate dimension or study-region position')
            features.append({'type': 'Feature', 'properties': feature.get('properties', {}), 'geometry': geometry})
        return {'type': 'FeatureCollection', 'features': features}, hashlib.sha256(source).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='public/data/references/rasuwa-emsr927.json')
    args = parser.parse_args()
    output = Path(args.output)
    if output.exists(): raise ValueError('Output exists; preserve the archive and choose a new filename')
    cache = Path('data/reference-sources'); cache.mkdir(parents=True, exist_ok=True)
    layers, sources = {}, []
    for kind, (name, url) in SOURCES.items():
        target = cache/name
        if target.exists(): raw = target.read_bytes()
        else:
            with urlopen(url, timeout=30) as response: raw = response.read(5_000_001)
            if len(raw) > 5_000_000: raise ValueError('Reference response exceeds byte budget')
            # Validate before keeping the response. Never extract archive paths.
            read_layer(raw); target.write_bytes(raw)
        layers[kind], member_hash = read_layer(raw)
        sources.append({'layer': kind, 'url': url, 'archiveSha256': hashlib.sha256(raw).hexdigest(),
                        'sourceGeojsonSha256': member_hash, 'bytes': len(raw)})
    categories = {f['properties'].get('obj_desc') for f in layers['event']['features']}
    if categories != {'Landslide'}: raise ValueError('Source categories changed; review before relabeling')
    payload = {
        'version': 1, 'id': 'emsr927-aoi01-v1', 'regionId': 'nepal-rasuwa',
        'title': 'Syapru Besi: externally mapped mass movement',
        'producer': 'Copernicus Emergency Management Service - Rapid Mapping', 'distributor': 'UNESCO IHP-WINS',
        'product': 'EMSR927 AOI01 GRA PRODUCT v1', 'eventDate': '2026-08-26',
        'referenceObservationDate': '2026-08-27', 'referenceObservationType': 'Optical photo-interpretation (WorldView-3)',
        'published': '2026-08-27', 'retrieved': datetime.now(timezone.utc).isoformat(),
        'sourcePage': DATASET, 'officialPage': 'https://mapping.emergency.copernicus.eu/activations/EMSR927/',
        'terms': 'https://mapping.emergency.copernicus.eu/terms-and-conditions/',
        'attribution': 'European Union, 2026. Copernicus EMS Rapid Mapping EMSR927 AOI01 v1; distributed via UNESCO IHP-WINS. Display adapted by SARFlow; no endorsement.',
        'status': 'external-mapped-reference-not-field-validated', 'comparisonStatus': 'not-evaluated',
        'limitations': [
            'This source maps mass movement / landslide, not a binary floodwater or new-water mask.',
            'External optical interpretation is not SARFlow detection and has not been field-validated.',
            'The optical observation date differs from the selected radar dates; event evolution can affect agreement.',
            'Only AOI01 Syapru Besi is included. Missing mapped features outside this AOI do not mean no impact.',
            'No calibrated NISAR mask or quantitative spatial agreement has been computed for this comparison.',
        ], 'sources': sources, **layers,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(payload, ensure_ascii=True, separators=(',', ':'), allow_nan=False).encode()
    output.write_bytes(raw)
    print(json.dumps({'output': args.output, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                      'eventFeatures': len(layers['event']['features']), 'aoiFeatures': len(layers['aoi']['features'])}))


if __name__ == '__main__': main()
