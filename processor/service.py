"""Explicitly started read-only service and scheduler; no OS startup registration."""
import argparse
import json
import signal
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from .store import Store
from .worker import ROOT, cycle, validate_config


class ProcessLock:
    """OS lock released on process exit, including crashes. One worker per volume."""
    def __init__(self, root):
        Path(root).mkdir(parents=True,exist_ok=True)
        self.file=open(Path(root)/'worker.lock','a+b')
        self.file.write(b'0');self.file.flush();self.file.seek(0)
        try:
            import os
            if os.name=='nt':
                import msvcrt
                msvcrt.locking(self.file.fileno(),msvcrt.LK_NBLCK,1)
            else:
                import fcntl
                fcntl.flock(self.file,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except OSError:
            self.file.close();raise RuntimeError('Another processor owns this storage volume') from None

    def close(self):
        self.file.close()


def handler(root, policy, interval):
    class Handler(BaseHTTPRequestHandler):
        server_version='SARFlow';sys_version=''
        def log_message(self,*args):pass
        def do_GET(self):
            if self.path not in ('/health','/status'):
                self.send_error(404);return
            try:
                store=Store(root)
                try:body=store.status(policy,interval)
                finally:store.close()
                if self.path=='/health':body={'status':'ok','worker':body['status']}
                payload=json.dumps(body,allow_nan=False).encode()
                self.send_response(200);self.send_header('Content-Type','application/json')
                self.send_header('Content-Length',str(len(payload)));self.send_header('Cache-Control','no-store')
                self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(payload)
            except Exception:
                self.send_error(503,'Processor status unavailable')
    return Handler


def main():
    p=argparse.ArgumentParser(description='SARFlow scheduled calibrated processing')
    p.add_argument('--config',default=str(ROOT/'processor/config.json'))
    p.add_argument('--storage',default=str(ROOT/'data/monitoring'))
    p.add_argument('--policy',default=str(ROOT/'shared/collection-policy.json'))
    p.add_argument('--once',action='store_true',help='One bounded cycle, no server or recurring process')
    p.add_argument('--ingest',action='store_true',help='Enable bounded calibrated downloads and processing')
    p.add_argument('--earthdata-login',action='store_true',help='Manually sign in for this process only; never persist credentials')
    p.add_argument('--bind',default='127.0.0.1');p.add_argument('--port',type=int,default=8090)
    args=p.parse_args()
    config=validate_config(json.loads(Path(args.config).read_text(encoding='utf-8-sig')))
    policy=json.loads(Path(args.policy).read_text(encoding='utf-8-sig'))
    if policy['active'] not in policy['reviewed']:raise ValueError('Active collection is not reviewed')
    # No netrc, environment credential lookup or browser-session extraction.
    session=None
    if args.earthdata_login:
        import earthaccess
        auth=earthaccess.login(strategy='interactive',persist=False)
        if not auth.authenticated:raise RuntimeError('Manual Earthdata sign-in did not complete')
        session=earthaccess.get_requests_https_session()
        session.trust_env=False
    lock=ProcessLock(args.storage)
    stop=threading.Event()
    def run_worker():
        store=Store(args.storage);store.recover()
        try:
            while not stop.is_set():
                try:cycle(store,config,policy,args.ingest,session)
                except Exception:
                    # Keep public error messages independent of private files or authentication data.
                    for loc in config['locations']:store.location(loc,'error','Scheduled cycle failed; retry pending')
                if args.once:break
                stop.wait(config['intervalSeconds'])
        finally:store.close()
    try:
        if args.once:
            run_worker();print('One monitoring cycle finished. Inspect /status or the local status command for evidence.');return
        server=ThreadingHTTPServer((args.bind,args.port),handler(args.storage,policy,config['intervalSeconds']))
        server.daemon_threads=True
        worker=threading.Thread(target=run_worker,daemon=True);worker.start()
        def shutdown(*_):stop.set();threading.Thread(target=server.shutdown,daemon=True).start()
        signal.signal(signal.SIGTERM,shutdown);signal.signal(signal.SIGINT,shutdown)
        print('SARFlow processor running. Read-only /health and /status enabled. Stop with Ctrl+C.',flush=True)
        try:server.serve_forever(poll_interval=.5)
        finally:server.server_close();stop.set();worker.join(timeout=5)
    finally:lock.close()


if __name__=='__main__':main()
