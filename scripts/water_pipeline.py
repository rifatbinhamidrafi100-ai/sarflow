"""Bounded local GCOV processing. Registration manifest supplies local paths, never the API."""
import argparse
import json
from contextlib import ExitStack
from pathlib import Path
import h5py
import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.windows import Window
from gcov_reader import metadata, coordinates, acquisition, read_tile, file_hash
from water_algorithm import classify, LEGEND


def read_terrain(terrain, window):
    """Only unmasked, explicit schema codes are known; never cast unknowns to zero."""
    masked = terrain.read(1, window=window, masked=True)
    # Promote first: 255 cannot be represented by int8 or bool source dtypes.
    values = masked.astype(np.float64).filled(255)
    return np.where(np.isin(values, [0, 1, 2, 3]), values, 255).astype(np.uint8)


def run(manifest_path, output, parameters):
    parameters = {'co_db': -17., 'cross_db': -24., 'change_db': 3., 'margin_db': 1., **parameters}
    manifest_path = Path(manifest_path); output = Path(output)
    m = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
    if m.get('dataType') not in ('calibrated-measurements', 'synthetic-software-fixture'):
        raise ValueError('Manifest must distinguish calibrated measurements from synthetic software fixtures')
    paths = m.get('files', [])
    if not 4 <= len(paths) <= 30 or len(set(paths)) != len(paths):
        raise ValueError('Register 4–30 unique GCOV files: at least three baseline dates and one target')
    row, col, height, width = [m.get(k) for k in ('row', 'col', 'height', 'width')]
    if any(type(v) is not int for v in [row, col, height, width]) or min(row, col) < 0 or not (16 <= height <= 1024 and 16 <= width <= 1024):
        raise ValueError('Window requires nonnegative integer offsets and dimensions 16–1024')
    frequency, co, cross = m.get('frequency', 'A'), m.get('co', 'HHHH'), m.get('cross')
    if frequency not in ('A', 'B') or (co, cross) not in [('HHHH', 'HVHV'), ('VVVV', 'VHVH'), ('HHHH', None), ('VVVV', None)]:
        raise ValueError('Unsupported co/cross polarization pair')
    output.mkdir(parents=True, exist_ok=True)
    if (output/'result.json').exists():
        raise ValueError('Refusing to overwrite a completed result')
    with ExitStack() as stack:
        products = []; reference = None; xy = None
        for name in paths:
            path = (manifest_path.parent/name).resolve()
            if not path.is_file() or path.suffix.lower() not in ('.h5', '.hdf5'):
                raise ValueError('Registered local GCOV file unavailable')
            f = stack.enter_context(h5py.File(path, 'r'))
            meta = metadata(f, frequency, co, cross); x, y = coordinates(f, frequency, row, col, height, width)
            if reference is None:
                reference, xy = meta, (x, y)
            elif meta != reference or not np.array_equal(x, xy[0]) or not np.array_equal(y, xy[1]):
                raise ValueError('Acquisitions differ in grid, geometry, radiometry, version or processing flags')
            products.append((acquisition(f), f, path))
        products.sort(key=lambda p: p[0]['date'])
        if len({p[0]['date'] for p in products}) != len(products) or len({p[0]['id'] for p in products}) != len(products):
            raise ValueError('Duplicate acquisition dates or identifiers')
        x, y = xy; dx, dy = float(x[1]-x[0]), float(y[1]-y[0])
        transform = from_origin(float(x[0]-dx/2), float(y[0]-dy/2), dx, -dy)
        terrain = None; terrain_provenance = None
        if m.get('terrain'):
            t = m['terrain']
            if not t.get('source') or not t.get('method'):
                raise ValueError('Terrain exclusion raster requires source and method')
            path = (manifest_path.parent/t['file']).resolve()
            terrain = stack.enter_context(rasterio.open(path))
            # Terrain raster covers the selected window exactly. No silent resampling.
            if terrain.crs.to_epsg() != reference['epsg'] or terrain.transform != transform or (terrain.height, terrain.width) != (height, width):
                raise ValueError('Terrain raster must exactly match the selected window CRS, transform and shape')
            terrain_provenance = {'sha256': file_hash(path), 'source': t['source'], 'method': t['method'],
                                  'files': [{'name': Path(name).name, 'sha256': file_hash(name)} for name in terrain.files],
                                  'codes': '0 clear, 1 layover, 2 shadow, 3 both, 255 unknown; other codes unknown'}
        profile = dict(driver='GTiff',height=height,width=width,crs=f"EPSG:{reference['epsg']}",transform=transform,
                       tiled=True,blockxsize=256,blockysize=256,compress='deflate')
        outputs = {}
        for key, dtype, nodata in [('classes','uint8',255),('reasons','uint8',255),('anomaly','uint8',255),('delta','float32',float('nan')),('baseline','float32',float('nan')),('target','float32',float('nan'))]:
            outputs[key] = stack.enter_context(rasterio.open(output/(key+'.tif'),'w',count=1,dtype=dtype,nodata=nodata,**profile))
        counts = {str(k): 0 for k in LEGEND}; common_count = 0; anomaly_count = 0; valid_counts = np.zeros(len(products),dtype=np.int64)
        sums = np.zeros(len(products)); previews = []; quality_missing = set()
        for rr in range(0,height,256):
            for cc in range(0,width,256):
                hh, ww = min(256,height-rr), min(256,width-cc); aa=[]; bb=[]
                for i, (_, f, _) in enumerate(products):
                    a, _, known = read_tile(f,frequency,co,row+rr,col+cc,hh,ww);aa.append(a)
                    if not known: quality_missing.add(i)
                    if cross:
                        b, _, known = read_tile(f,frequency,cross,row+rr,col+cc,hh,ww);bb.append(b)
                terrain_values = read_terrain(terrain, Window(cc,rr,ww,hh)) if terrain else None
                result = classify(np.stack(aa),np.stack(bb) if cross else None,terrain_values,**parameters)
                n = int(result['common'].sum());common_count += n
                for i,a in enumerate(aa):
                    sums[i] += np.sum(a[result['common']]);valid_counts[i] += np.isfinite(a).sum()
                for key,dst in outputs.items():dst.write(result[key].astype(dst.dtypes[0]),1,window=Window(cc,rr,ww,hh))
                for k in LEGEND:counts[str(k)] += int(np.count_nonzero(result['classes']==k))
                anomaly_count += int(np.count_nonzero(result['anomaly']==1))
                # Lossless categorical tile, no reconstructed radar imagery.
                colors=np.array([[150,150,150],[40,95,170],[25,155,160],[189,115,38],[221,224,210],[104,84,123]],dtype=np.uint8)
                image=colors[result['classes']];name=f'tile-{rr}-{cc}.png'
                with rasterio.open(output/name,'w',driver='PNG',height=hh,width=ww,count=3,dtype='uint8') as dst:
                    dst.write(image.transpose(2,0,1))
                for mode in ['baseline', 'target', 'delta']:
                    array=result[mode];valid=np.isfinite(array)
                    gray=np.clip(np.nan_to_num((array+35)/35 if mode!='delta' else (array+10)/20)*255,0,255).astype(np.uint8)
                    rgb=np.repeat(gray[:,:,None],3,axis=2);rgb[~valid]=[150,100,150]
                    with rasterio.open(output/f'{mode}-{rr}-{cc}.png','w',driver='PNG',height=hh,width=ww,count=3,dtype='uint8') as dst:dst.write(rgb.transpose(2,0,1))
                previews.append({'file':name,'row':rr,'col':cc,'width':ww,'height':hh})
        evidence=[{**a,'file':p.name,'sha256':file_hash(p)} for a,_,p in products]
        report={'algorithm':'sarflow-water-candidates-v1','dataType':m['dataType'],'location':m.get('location','Registered window'),
                'parameters':parameters,'window':{'row':row,'col':col,'height':height,'width':width,'transform':list(transform)[:6]},
                'compatibility':reference,'observations':evidence,'manifestSha256':file_hash(manifest_path),
                'terrain':terrain_provenance,'counts':counts,'legend':LEGEND,'commonValidCells':common_count,
                'perDateValidCells':valid_counts.tolist(),'temporalMeansDb':(10*np.log10(sums/common_count)).tolist() if common_count else [None]*len(products),
                'thresholdBaseline':{'definition':'abs(target dB - immediately previous dB) >= change_db on all-date common support','candidateCells':anomaly_count,'eventAccuracy':None},
                'areaKm2':None,'areaReason':'Ground pixel area and terrain support have not been independently justified; counts only.',
                'qualityMissingAcquisitions':sorted(quality_missing),'reasonBits':{'1':'missing/invalid product support','2':'unknown terrain','4':'layover/shadow exclusion','8':'missing cross polarization','16':'ambiguous or unstable signal'},
                'previews':previews,'outputs':list(outputs),'accuracyEvaluation':None,
                'limitations':['Experimental thresholds, not calibrated local water boundaries or official OPERA output.',
                'At least three strictly earlier dates form the baseline. All selected dates must be valid; no interpolation or spatial filtering.',
                'Low backscatter can also be smooth soil or sand. Water candidates are not verified water or confirmed floods.',
                'No inundated vegetation, flood depth, causal attribution or calibrated probability is implemented.',
                'Absent terrain masks or cross polarization produce insufficient evidence, never assumed clear pixels.',
                'GCOV validity mask is not a terrain mask. Processing flags document operations, not independent scientific validation.']}
    # GeoTIFFs are closed before checksumming.
    report['outputHashes']={p.name:file_hash(p) for p in output.glob('*.tif')}
    (output/'result.json').write_text(json.dumps(report,allow_nan=False,indent=2),encoding='utf-8')
    return report


if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('manifest');p.add_argument('output');p.add_argument('--parameters',default='{}');a=p.parse_args()
    try:
        run(a.manifest,a.output,json.loads(a.parameters))
        print('Processing completed; inspect result.json limitations.')
    except Exception as e:
        # Do not disclose private paths or HDF5 contents through the API.
        print('Processing failed: '+(str(e) if isinstance(e,ValueError) else type(e).__name__))
        raise SystemExit(1)
