"""Bounded anonymous range inspection; never reads or stores credentials or redirect URLs."""
import io
import json
import urllib.request
from pathlib import Path
import h5py
from gcov_reader import metadata


class RemoteFile(io.RawIOBase):
    def __init__(self, url, size, limit=32*1024*1024):
        self.url, self.size, self.limit = url, size, limit
        self.pos = self.transferred = 0
        self.cache = {}

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos
    def seek(self, offset, whence=0):
        self.pos = offset + (self.pos if whence == 1 else self.size if whence == 2 else 0)
        return self.pos

    def readinto(self, buffer):
        data = self.read(len(buffer)); buffer[:len(data)] = data; return len(data)

    def read(self, count=-1):
        count = self.size-self.pos if count < 0 else min(count, self.size-self.pos)
        if count <= 0: return b''
        chunks = []
        while count:
            block = self.pos//65536; start = block*65536
            if block not in self.cache:
                end = min(start+65536, self.size)-1
                if self.transferred+end-start+1 > self.limit: raise ValueError('Remote inspection byte budget exceeded')
                req = urllib.request.Request(self.url, headers={'Range': f'bytes={start}-{end}'})
                with urllib.request.urlopen(req, timeout=20) as r:
                    if r.status != 206 or r.headers.get('Content-Range') != f'bytes {start}-{end}/{self.size}':
                        raise ValueError('Server did not honor bounded byte range')
                    data = r.read(end-start+2)
                if len(data) != end-start+1: raise ValueError('Truncated remote range')
                self.cache[block] = data; self.transferred += len(data)
            offset = self.pos-start; part = self.cache[block][offset:offset+count]
            chunks.append(part); self.pos += len(part); count -= len(part)
        return b''.join(chunks)


if __name__ == '__main__':
    catalog=json.loads(Path('artifacts/real-data/brahmaputra-candidates.json').read_text())
    reports=[]
    for record in catalog['candidates'][0]['records']:
        remote=RemoteFile(record['download'],record['measurementFile']['SizeInBytes'])
        report={'id':record['id'],'acquired':record['acquired']}
        try:
            with h5py.File(remote,'r') as f:
                report['metadata']=metadata(f,'A','HHHH','HVHV')
                g=f['/science/LSAR/GCOV/grids/frequencyA']
                report['grid']={'shape':list(g['HHHH'].shape),'layers':list(g.keys())}
        except Exception as e:
            # Do not serialize exception URLs, redirects, or headers.
            report['error']=str(e) if isinstance(e,ValueError) else type(e).__name__
            if hasattr(e,'code'): report['httpStatus']=e.code
        report['transferredBytes']=remote.transferred
        reports.append(report)
        print(json.dumps(report))
    Path('artifacts/real-data/remote-inspection.json').write_text(json.dumps(reports,indent=2))
