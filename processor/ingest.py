"""Bounded downloads and calibrated compatibility checks; never log request details."""
import hashlib
import json
import shutil
import sys
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPRedirectHandler
import h5py
import numpy as np
from pyproj import Transformer
from .catalog import safe_download_url

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from gcov_reader import metadata, acquisition, coordinates, file_hash, BASE


class AuthenticationRequired(Exception):
    pass


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Redirect to Earthdata login must be handled manually, never saved or scraped.
        if not safe_download_url(newurl):
            raise AuthenticationRequired('Manual Earthdata sign-in required')
        return super().redirect_request(req,fp,code,msg,headers,newurl)


def storage_used(root):
    return sum(p.stat().st_size for p in Path(root).rglob('*') if p.is_file())


def download(url, target, root, config, session=None):
    if not safe_download_url(url):raise ValueError('No unambiguous approved HDF5 data link')
    target=Path(target);target.parent.mkdir(parents=True,exist_ok=True)
    remaining=min(config['maxFileBytes'],config['maxStorageBytes']-storage_used(root),shutil.disk_usage(root).free-1_000_000_000)
    if remaining<=0:raise ValueError('Storage budget reached; operator archival required')
    part=target.with_suffix('.part');size=0;deadline=time.monotonic()+1800
    try:
        if session is None:
            response=build_opener(SafeRedirect).open(Request(url,headers={'User-Agent':'SARFlow/1.0'}),timeout=60)
        else:
            # Earthaccess session established interactively in this process only.
            # Do not allow session redirects to send credentials to another host.
            response=session.get(url,stream=True,timeout=60,allow_redirects=False)
            if response.status_code in (301,302,303,307,308,401,403):
                response.close();raise AuthenticationRequired('Authorized download session is unavailable')
            response.raise_for_status()
        with response:
            length=response.headers.get('Content-Length')
            if length and int(length)>remaining:raise ValueError('Product exceeds configured download/storage limit')
            if 'html' in response.headers.get('Content-Type','').lower():raise AuthenticationRequired('Manual Earthdata sign-in required')
            with part.open('wb') as f:
                chunks=response.iter_content(1024*1024) if session is not None else iter(lambda:response.read(1024*1024),b'')
                for chunk in chunks:
                    size+=len(chunk)
                    if size>remaining or time.monotonic()>deadline:raise ValueError('Download exceeded byte/time budget')
                    f.write(chunk)
            if length and int(length)!=size:raise ValueError('Incomplete download')
        if not h5py.is_hdf5(part):raise ValueError('Downloaded response is not an HDF5 measurement')
        part.replace(target)
        return file_hash(target)
    except HTTPError as e:
        if e.code in (401,403):raise AuthenticationRequired('Manual Earthdata sign-in required') from None
        raise ValueError('NASA file download unavailable') from None
    finally:
        if part.exists():part.unlink()


def inspect(path, location, pixels, policy):
    """Select a bounded native-grid window around the configured geographic point."""
    with h5py.File(path,'r') as f:
        grid=f[f'{BASE}/grids/frequencyA']
        channels=next(((co,cross) for co,cross in [('HHHH','HVHV'),('VVVV','VHVH')] if co in grid and cross in grid),None)
        if channels is None:raise ValueError('Dual-polarization measurements unavailable')
        co,cross=channels;meta=metadata(f,'A',co,cross)
        if meta['productSpecificationVersion'] not in policy['readerSpecifications']:
            raise ValueError('Unreviewed measurement specification')
        x=np.asarray(grid['xCoordinates']);y=np.asarray(grid['yCoordinates'])
        if len(x)<pixels or len(y)<pixels:raise ValueError('Product is smaller than the requested window')
        xx,yy=Transformer.from_crs(4326,meta['epsg'],always_xy=True).transform(location['lon'],location['lat'])
        if not min(x)<=xx<=max(x) or not min(y)<=yy<=max(y):raise ValueError('Location falls outside measurement grid')
        col=max(0,min(int(np.argmin(abs(x-xx)))-pixels//2,len(x)-pixels))
        row=max(0,min(int(np.argmin(abs(y-yy)))-pixels//2,len(y)-pixels))
        wx,wy=coordinates(f,'A',row,col,pixels,pixels)
        descriptor={'collection':policy['active'],'metadata':meta,'x':wx.tolist(),'y':wy.tolist()}
        signature=hashlib.sha256(json.dumps(descriptor,sort_keys=True).encode()).hexdigest()
        return dict(collection=policy['active'],compatibility=signature,acquisition=acquisition(f),metadata=meta,window=dict(row=row,col=col,height=pixels,width=pixels),frequency='A',co=co,cross=cross)
