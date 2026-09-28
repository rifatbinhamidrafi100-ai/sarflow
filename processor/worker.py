"""One bounded monitor cycle; storage and time-series compatibility are explicit."""
import hashlib
import json
import os
import subprocess
import sys
from collections import defaultdict
from datetime import datetime,timedelta,timezone
from pathlib import Path
from . import catalog
from .ingest import download, inspect, AuthenticationRequired, file_hash, storage_used
from .store import now

ROOT=Path(__file__).resolve().parents[1]
ALGORITHM='sarflow-water-candidates-v1'


def atomic_json(path, value):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value,indent=2,allow_nan=False),encoding='utf-8')
    os.replace(temporary,path)


def validate_config(config):
    bounds={'intervalSeconds':(300,604800),'lookbackDays':(30,730),'maxPages':(1,20),'pageSize':(1,1000),'maxDownloadsPerCycle':(1,20),'maxFileBytes':(1000000,100000000000),'maxStorageBytes':(1000000,1000000000000),'processTimeoutSeconds':(30,3600),'windowPixels':(16,1024)}
    for key,(low,high) in bounds.items():
        if type(config.get(key)) is not int or not low<=config[key]<=high:raise ValueError('Invalid configuration: '+key)
    locations=config.get('locations')
    if not isinstance(locations,list) or not 1<=len(locations)<=20:raise ValueError('Configure 1-20 locations')
    import re
    ids=set()
    for loc in locations:
        if not re.fullmatch('[a-z0-9-]{1,60}',str(loc.get('id',''))) or loc['id'] in ids:raise ValueError('Unique safe location identifiers required')
        ids.add(loc['id'])
        if not isinstance(loc.get('name'),str) or len(loc['name'])>100:raise ValueError('Invalid location name')
        if type(loc.get('lon')) not in (int,float) or not -179.8<=loc['lon']<=179.8 or type(loc.get('lat')) not in (int,float) or not -84.8<=loc['lat']<=84.8:raise ValueError('Invalid location coordinates')
        ranges={'co_db':(-35,-5),'cross_db':(-40,-10),'change_db':(.5,10),'margin_db':(.1,3)}
        parameters=loc.get('parameters',{})
        if not isinstance(parameters,dict) or set(parameters)-set(ranges):raise ValueError('Unknown processing parameters')
        for key,value in parameters.items():
            if type(value) not in (int,float) or not ranges[key][0]<=value<=ranges[key][1]:raise ValueError('Invalid processing parameter')
        if 'terrain' in loc:
            t=loc['terrain']
            if not isinstance(t,dict) or any(not isinstance(t.get(k),str) or not t[k].strip() for k in ('file','source','method')):raise ValueError('Terrain requires file, source and method')
        if 'referenceManifest' in loc and (not isinstance(loc['referenceManifest'],str) or not loc['referenceManifest'].strip()):raise ValueError('Invalid reference manifest path')
    return config


def process_groups(store, location, config):
    groups=defaultdict(list)
    for row in store.ready(location['id']):
        info=json.loads(row['metadata'])
        active=store.get('activeCollection',json.loads((ROOT/'shared/collection-policy.json').read_text())['active'])
        if info.get('collection')!=active:continue
        try:unchanged=file_hash(row['path'])==row['sha256']
        except OSError:unchanged=False
        if not unchanged:
            store.update(row,state='rejected',message='Stored measurement hash changed; operator review required')
            with store.db:store.db.execute('UPDATE jobs SET publication=NULL WHERE location=?',(location['id'],))
            continue
        groups[row['compatibility']].append(row)
    completed=0
    for records in groups.values():
        # Duplicate dates from overlapping products must not manufacture a baseline.
        by_date={}
        for r in records:by_date[r['acquired'][:10]]=r
        records=sorted(by_date.values(),key=lambda r:r['acquired'])[-30:]
        if len(records)<4:continue
        info=json.loads(records[-1]['metadata'])
        terrain=location.get('terrain')
        terrain_hash=None
        if terrain:
            terrain_path=Path(terrain['file']).resolve()
            if not terrain_path.is_file():continue
            terrain_hash=file_hash(terrain_path)
            # Include mask sidecars since external masks affect validity.
            import rasterio
            with rasterio.open(terrain_path) as ds:
                terrain_hashes={Path(n).name:file_hash(n) for n in ds.files}
        else:terrain_hashes={}
        parameters=location.get('parameters',{})
        identity=hashlib.sha256(json.dumps({'location':location['id'],'inputs':[r['sha256'] for r in records],'window':info['window'],'compatibility':records[-1]['compatibility'],'terrain':terrain_hash,'terrainFiles':terrain_hashes,'parameters':parameters,'algorithm':ALGORITHM},sort_keys=True).encode()).hexdigest()
        existing=store.db.execute('SELECT * FROM jobs WHERE id=?',(identity,)).fetchone()
        if existing and existing['state']=='complete':
            evaluate_job(store,identity,location,records[-1]['acquired'],Path(existing['result_path']))
            continue
        if existing and existing['state']=='rejected':continue
        if storage_used(store.root)+100_000_000>config['maxStorageBytes']:
            store.location(location,'storage-limit','Storage budget reached; operator archival required');return completed
        manifest={'dataType':'calibrated-measurements','location':location['name'],'files':[r['path'] for r in records],**info['window'],'frequency':info['frequency'],'co':info['co'],'cross':info['cross']}
        if terrain:manifest['terrain']={**terrain,'file':str(terrain_path)}
        # An interrupted attempt receives a new output directory; completed files are immutable.
        attempt=store.root/'results'/identity/now().replace(':','-')
        manifest_path=attempt.parent/'manifest.json';atomic_json(manifest_path,manifest)
        store.job(identity,location['id'],records[-1]['acquired'],'processing',str(attempt),'Calibrated processing in progress')
        try:
            run=subprocess.run([sys.executable,str(ROOT/'scripts/water_pipeline.py'),str(manifest_path),str(attempt),'--parameters',json.dumps(parameters)],capture_output=True,timeout=config['processTimeoutSeconds'])
            if run.returncode!=0:raise ValueError('Scientific compatibility or processing checks failed')
            # Never forward raw subprocess output: it can contain source paths or metadata.
            report=json.loads((attempt/'result.json').read_text(encoding='utf-8'))
            if report['dataType']!='calibrated-measurements' or report['algorithm']!=ALGORITHM:raise ValueError('Unexpected processing output')
            if [o['sha256'] for o in report['observations']] != [r['sha256'] for r in records]:raise ValueError('Measurements changed during processing')
            store.job(identity,location['id'],records[-1]['acquired'],'complete',str(attempt),'Experimental result; independent validation required')
            evaluate_job(store,identity,location,records[-1]['acquired'],attempt)
            completed+=1
        except subprocess.TimeoutExpired:
            store.job(identity,location['id'],records[-1]['acquired'],'retry',message='Processor time limit reached')
        except (ValueError,OSError,KeyError):
            store.job(identity,location['id'],records[-1]['acquired'],'rejected',message='Processing checks failed; operator review required')
    return completed


def evaluate_job(store, identity, location, target, output):
    publication=None;message='Independent reference observations and review are required'
    if location.get('referenceManifest'):
        try:
            from .validation import evaluate
            evaluation=evaluate(output,Path(location['referenceManifest']))
            publication={**evaluation['publication'],'evaluationDigest':evaluation['evaluationDigest']}
            if publication['eligible']:
                reference=Path(location['referenceManifest']).resolve()
                manifest=json.loads(reference.read_text(encoding='utf-8-sig'))
                paths={reference,output/'result.json',output/'classes.tif',output/'evaluation.json',ROOT/'processor/validation.py'}
                for case in manifest['cases']:
                    paths.update((reference.parent/case[k]).resolve() for k in ('labels','classes','result'))
                publication['guard']={str(path):file_hash(path) for path in paths}
                publication['collectionPolicy']=file_hash(ROOT/'shared/collection-policy.json')
            message='Evaluation checked; release depends on evidence and review gates'
        except Exception:
            # Failed re-evaluation revokes any prior stored release, never keep a stale approval.
            publication=None;message='Independent evaluation failed; result withheld'
    store.job(identity,location['id'],target,'complete',str(output),message,publication)


def cycle(store, config, policy, ingest=False, session=None, fetch=catalog.get_json):
    store.set('activeCollection',policy['active'])
    store.set('cycleStartedAt',now())
    try:
        unreviewed=catalog.inventory(policy,fetch);store.set('unreviewed',unreviewed)
    except Exception:
        store.set('checkedAt',None)
        for loc in config['locations']:store.location(loc,'collection-review','NASA collection verification failed; ingestion paused')
        store.set('nextCheckAt',(datetime.now(timezone.utc)+timedelta(seconds=config['intervalSeconds'])).isoformat())
        return
    budget=config['maxDownloadsPerCycle']
    # Rotate the starting location so one area cannot consume every download budget.
    offset=store.get('rotation',0)%len(config['locations']);locations=config['locations'][offset:]+config['locations'][:offset]
    for loc in locations:
        try:
            records,truncated=catalog.discover(loc,policy,config,fetch)
            for record in records:store.record(loc['id'],record)
            store.location(loc,'discovered','Bounded catalog sample; additional history may exist' if truncated else 'NASA acquisition dates checked',now())
        except Exception:
            store.location(loc,'discovery-error','NASA discovery failed; previously stored records retained');continue
        if not ingest:
            store.location(loc,'metadata-only','Dates updated; calibrated downloads are not enabled');continue
        for row in store.pending(loc['id'],budget):
            if budget<=0:break
            budget-=1
            store.update(row,state='downloading',attempts=row['attempts']+1)
            try:
                name=hashlib.sha256((row['id']+row['revision']).encode()).hexdigest()+'.h5'
                path=store.root/'measurements'/name
                # A manually staged file with this identifier is inspected just like a download.
                if not path.exists():download(row['url'],path,store.root,config,session)
                info=inspect(path,loc,config['windowPixels'],policy)
                if info['acquisition']['id']!=row['title'] or info['acquisition']['date'][:10]!=row['acquired'][:10]:
                    raise ValueError('Downloaded product identity does not match the catalog record')
                store.update(row,state='compatible',path=str(path),sha256=file_hash(path),compatibility=info['compatibility'],metadata=json.dumps(info),message='Calibrated product compatibility checked')
            except AuthenticationRequired:
                store.update(row,state='authentication-required',message='Manual Earthdata sign-in required')
                store.location(loc,'authentication-required','Manual Earthdata sign-in required for calibrated downloads')
            except (ValueError,KeyError,OSError):
                store.update(row,state='rejected',message='Measurement unavailable, over budget or incompatible; operator review required')
            except Exception:
                store.update(row,state='retry',message='Temporary download failure; retry next cycle')
        process_groups(store,loc,config)
    store.set('rotation',offset+1)
    store.set('checkedAt',now())
    store.set('nextCheckAt',(datetime.now(timezone.utc)+timedelta(seconds=config['intervalSeconds'])).isoformat())
