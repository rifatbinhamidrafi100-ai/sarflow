"""Public CMR metadata discovery. Credentials are never needed for this module."""
import hashlib
import json
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

CMR='https://cmr.earthdata.nasa.gov/search/'


def get_json(url, headers=None):
    request=Request(url,headers={'Accept':'application/json','Client-Id':'sarflow-monitor',**(headers or {})})
    with urlopen(request,timeout=30) as r:
        raw=r.read(8_000_001)
        if len(raw)>8_000_000:
            raise ValueError('NASA metadata response exceeded limit')
        return json.loads(raw),dict(r.headers)


def inventory(policy, fetch=get_json):
    body,_=fetch(CMR+'collections.json?'+urlencode({'short_name':policy['pattern'],'options[short_name][pattern]':'true','provider':policy['provider'],'page_size':100}))
    entries=body.get('feed',{}).get('entry')
    if not isinstance(entries,list):
        raise ValueError('Invalid collection inventory')
    names=sorted({e['short_name'] for e in entries if isinstance(e.get('short_name'),str)})
    if policy['active'] not in names:
        raise ValueError('Reviewed active collection is no longer available; operator review required')
    return [n for n in names if n not in policy['reviewed'] and n not in policy.get('retired',[])]


def safe_download_url(url):
    if not isinstance(url,str): return False
    try:
        u=urlsplit(url)
        return (u.scheme=='https' and not u.username and not u.password and u.port in (None,443)
                and (u.hostname=='nisar.asf.earthdatacloud.nasa.gov' or u.hostname=='asf.alaska.edu' or (u.hostname or '').endswith('.asf.alaska.edu'))
                and u.path.lower().endswith(('.h5','.hdf5')) and not u.query and not u.fragment)
    except ValueError:return False


def discover(location, policy, config, fetch=get_json):
    start=(datetime.now(timezone.utc)-timedelta(days=config['lookbackDays'])).strftime('%Y-%m-%dT%H:%M:%SZ')
    query=CMR+'granules.json?'+urlencode({'short_name':policy['active'],'point':f"{location['lon']},{location['lat']}",'temporal':start+',','page_size':config['pageSize'],'sort_key':'-start_date'})
    cursor=None;seen=set();records=[]
    for _ in range(config['maxPages']):
        body,headers=fetch(query,{'CMR-Search-After':cursor} if cursor else {})
        entries=body.get('feed',{}).get('entry')
        if not isinstance(entries,list):raise ValueError('Invalid granule list')
        for e in entries:
            if not re.fullmatch(r'G\d+-ASF',str(e.get('id',''))):continue
            try:
                acquired=datetime.fromisoformat(e['time_start'].replace('Z','+00:00'))
                if acquired.tzinfo is None:continue
            except (KeyError,ValueError,TypeError):continue
            links=[l.get('href') for l in e.get('links',[]) if str(l.get('rel','')).endswith('/data#') and not l.get('inherited') and safe_download_url(l.get('href'))]
            # More than one HDF5 link is ambiguous; quarantine for review, never choose a random file.
            url=links[0] if len(set(links))==1 else None
            raw=json.dumps({'revision':e.get('revision_id'),'updated':e.get('updated'),'url':url,'title':e.get('title')},sort_keys=True)
            revision_id=e.get('revision_id',0)
            if not str(revision_id).isdigit():continue
            revision=f'{int(revision_id):012d}:'+str(e.get('updated') or '')+':'+hashlib.sha256(raw.encode()).hexdigest()[:16]
            key=(e['id'],revision)
            if key in seen:continue
            seen.add(key)
            records.append(dict(id=e['id'],revision=revision,acquired=acquired.isoformat(),title=str(e.get('title','')),url=url))
        cursor=next((v for k,v in headers.items() if k.lower()=='cmr-search-after'),None)
        if len(entries)<config['pageSize']:return records,False
        if not cursor:return records,True
    return records,True
