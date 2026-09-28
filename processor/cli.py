"""Offline status and evaluation commands; never accepts credentials."""
import argparse
import json
from pathlib import Path
from .store import Store
from .worker import ROOT


def main():
    parser=argparse.ArgumentParser()
    commands=parser.add_subparsers(dest='command',required=True)
    status=commands.add_parser('status');status.add_argument('--storage',default=str(ROOT/'data/monitoring'))
    evaluation=commands.add_parser('evaluate');evaluation.add_argument('result');evaluation.add_argument('reference_manifest')
    args=parser.parse_args()
    if args.command=='status':
        store=Store(args.storage)
        try:print(json.dumps(store.status(json.loads((ROOT/'shared/collection-policy.json').read_text()),21600),indent=2))
        finally:store.close()
    else:
        from .validation import evaluate
        report=evaluate(Path(args.result),Path(args.reference_manifest))
        print(json.dumps({k:report[k] for k in ('evaluationDigest','metrics','strata','publication')},indent=2))


if __name__=='__main__':main()
