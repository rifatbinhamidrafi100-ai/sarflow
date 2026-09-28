"""SQLite durable state. Public projections never expose paths or download URLs."""
import json
import hashlib
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def now():
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.root/'monitoring.sqlite', timeout=30)
        self.db.row_factory = sqlite3.Row
        self.db.executescript('''
          PRAGMA journal_mode=WAL;
          PRAGMA foreign_keys=ON;
          CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS locations(id TEXT PRIMARY KEY,name TEXT,checked TEXT,state TEXT,message TEXT);
          CREATE TABLE IF NOT EXISTS granules(
            location TEXT, id TEXT, revision TEXT, acquired TEXT, title TEXT, url TEXT,
            state TEXT DEFAULT 'discovered', attempts INTEGER DEFAULT 0, message TEXT DEFAULT '',
            path TEXT, sha256 TEXT, compatibility TEXT, metadata TEXT,
            PRIMARY KEY(location,id,revision));
          CREATE TABLE IF NOT EXISTS jobs(
            id TEXT PRIMARY KEY,location TEXT,target TEXT,state TEXT,created TEXT,updated TEXT,
            result_path TEXT,message TEXT,publication TEXT);
        ''')

    def close(self):
        self.db.close()

    def set(self, key, value):
        with self.db:
            self.db.execute('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', (key,json.dumps(value)))

    def get(self, key, default=None):
        row=self.db.execute('SELECT value FROM settings WHERE key=?',(key,)).fetchone()
        return json.loads(row[0]) if row else default

    def recover(self):
        with self.db:
            self.db.execute("UPDATE granules SET state='discovered',message='Retry after interrupted download' WHERE state='downloading'")
            self.db.execute("UPDATE jobs SET state='retry',message='Retry after interrupted processing' WHERE state='processing'")

    def location(self, loc, state, message, checked=None):
        with self.db:
            self.db.execute('INSERT INTO locations VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,checked=COALESCE(excluded.checked,locations.checked),state=excluded.state,message=excluded.message', (loc['id'],loc['name'],checked,state,message))

    def record(self, loc, record):
        with self.db:
            self.db.execute('INSERT OR IGNORE INTO granules(location,id,revision,acquired,title,url) VALUES(?,?,?,?,?,?)', (loc,record['id'],record['revision'],record['acquired'],record['title'],record['url']))

    def update(self, row, **values):
        allowed={'state','attempts','message','path','sha256','compatibility','metadata'}
        if not values or not set(values)<=allowed:
            raise ValueError('Invalid state update')
        with self.db:
            self.db.execute('UPDATE granules SET '+','.join(k+'=?' for k in values)+' WHERE location=? AND id=? AND revision=?', (*values.values(),row['location'],row['id'],row['revision']))

    def pending(self, location, limit):
        # Oldest first builds a baseline; rejected products require explicit operator review.
        return self.db.execute("SELECT * FROM granules WHERE location=? AND state IN ('discovered','retry','authentication-required') ORDER BY acquired LIMIT ?",(location,limit)).fetchall()

    def ready(self, location):
        # A reprocessed revision supersedes an earlier revision of the same CMR granule.
        return self.db.execute("SELECT g.* FROM granules g WHERE location=? AND state='compatible' AND NOT EXISTS (SELECT 1 FROM granules n WHERE n.location=g.location AND n.id=g.id AND n.revision>g.revision) ORDER BY acquired",(location,)).fetchall()

    def job(self, identity, location, target, state, result_path=None, message='', publication=None):
        stamp=now()
        with self.db:
            self.db.execute('INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated=excluded.updated,result_path=COALESCE(excluded.result_path,jobs.result_path),message=excluded.message,publication=excluded.publication',(identity,location,target,state,stamp,stamp,result_path,message,json.dumps(publication) if publication else None))

    def status(self, policy, interval):
        checked=self.get('checkedAt');next_check=self.get('nextCheckAt')
        fresh=checked is not None and (datetime.now(timezone.utc)-datetime.fromisoformat(checked)).total_seconds()<interval*2
        locations=[]
        for loc in self.db.execute('SELECT * FROM locations ORDER BY id'):
            counts={r['state']:r['n'] for r in self.db.execute('SELECT state,count(*) n FROM granules WHERE location=? GROUP BY state',(loc['id'],))}
            latest=self.db.execute('SELECT max(acquired) FROM granules WHERE location=?',(loc['id'],)).fetchone()[0]
            processed=self.db.execute("SELECT count(*) FROM jobs WHERE location=? AND state='complete'",(loc['id'],)).fetchone()[0]
            locations.append(dict(id=loc['id'],name=loc['name'],latestAcquisition=latest,lastChecked=loc['checked'],state=loc['state'],message=loc['message'],discovered=sum(counts.values()),downloaded=counts.get('compatible',0),processed=processed))
        alerts=[];withheld=0
        for job in self.db.execute("SELECT * FROM jobs WHERE state='complete' ORDER BY target DESC LIMIT 1000"):
            pub=json.loads(job['publication']) if job['publication'] else None
            if fresh and len(alerts)<100 and publication_current(pub) and isinstance(pub.get('areaKm2'),(int,float)) and pub.get('areaKm2',0)>0:
                alerts.append(dict(id=job['id'],location=job['location'],date=job['target'][:10],classification='reference-evaluated new-water candidate',areaKm2=pub['areaKm2'],evaluationDigest=pub['evaluationDigest']))
            else:
                withheld+=1
        return dict(configured=True,status='ready' if fresh else 'stale',checkedAt=checked,nextCheckAt=next_check,collections=dict(active=policy['active'],unreviewed=self.get('unreviewed',[])),locations=locations,publication=dict(released=len(alerts),withheld=withheld),alerts=alerts)


def publication_current(publication):
    """Revoke stale approval immediately after any reference/result/review change."""
    if not publication or not publication.get('eligible') or not publication.get('guard'):
        return False
    try:
        paths={**publication['guard'],str(Path(__file__).resolve().parents[1]/'shared/collection-policy.json'):publication['collectionPolicy']}
        for name,expected in paths.items():
            with open(name,'rb') as stream:
                if hashlib.file_digest(stream,'sha256').hexdigest()!=expected:return False
        return True
    except (OSError,KeyError,TypeError):return False
