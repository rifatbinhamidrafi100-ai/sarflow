"""Manual sign-in and bounded catalogue check; no download or credential persistence."""
import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path


def failure_reason(error):
    """Classify types only; exception text may contain private server responses."""
    if isinstance(error, KeyboardInterrupt):
        return 'cancelled-by-user'
    if isinstance(error, EOFError):
        return 'terminal-input-closed'
    if isinstance(error, TimeoutError):
        return 'network-timeout'
    if isinstance(error, ConnectionError):
        return 'network-connection-failed'
    # Optional imports keep the diagnostic tests usable without the download SDK.
    try:
        from requests.exceptions import Timeout, ConnectionError as RequestConnectionError
        if isinstance(error, Timeout):
            return 'network-timeout'
        if isinstance(error, RequestConnectionError):
            return 'network-connection-failed'
    except ImportError:
        pass
    try:
        from earthaccess.exceptions import LoginAttemptFailure, LoginStrategyUnavailable
        if isinstance(error, LoginAttemptFailure):
            return 'earthdata-login-request-rejected'
        if isinstance(error, LoginStrategyUnavailable):
            return 'interactive-login-unavailable'
    except ImportError:
        pass
    return 'unclassified-error'


def check_access(client):
    """Return only whitelisted outcomes; never serialize authentication exceptions."""
    report = {
        'checkedAt': datetime.now(timezone.utc).isoformat(),
        'authenticationCompleted': False,
        'collection': 'NISAR_L2_GCOV_PROVISIONAL_V1',
        'studyBounds': [89.65, 25, 89.95, 25.3],
        'downloadedFiles': 0,
        'processedObservations': 0,
        'independentValidation': False,
    }
    previous_logging = logging.root.manager.disable
    try:
        # The SDK logs raw authentication response bodies. Suppress them during
        # this standalone check, without capturing or persisting their contents.
        logging.disable(logging.CRITICAL)
        auth = client.login(strategy='interactive', persist=False)
    except (Exception, KeyboardInterrupt) as error:
        report.update(status='manual-authentication-failed', returnedRecords=None,
                      failureReason=failure_reason(error))
        return report
    finally:
        logging.disable(previous_logging)
    if not auth.authenticated:
        report.update(status='manual-authentication-incomplete', returnedRecords=None)
        return report
    report['authenticationCompleted'] = True
    try:
        results = client.search_data(
            short_name=report['collection'],
            bounding_box=tuple(report['studyBounds']), count=4,
        )
        report['returnedRecords'] = len(results)
        report['status'] = 'source-candidates-found' if results else 'authenticated-catalogue-empty'
    except Exception:
        # Do not print exception URLs, headers, session state, tokens or authentication objects.
        report['returnedRecords'] = None
        report['status'] = 'authenticated-catalogue-request-failed'
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not sys.stdin.isatty():
        raise SystemExit('Use your own interactive terminal for manual sign-in.')
    if args.output.exists():
        raise SystemExit('Choose a new output filename; existing reports are preserved.')
    import earthaccess
    print('Enter your Earthdata username (not your email address) and password at the prompts.')
    print('Password typing is invisible. Credentials are not saved by this script.')
    report = check_access(earthaccess)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2)
        stream.write('\n')
    print('Check status:', report['status'])
    if 'failureReason' in report:
        print('Failure category:', report['failureReason'])
    print('Saved a non-secret status report. No measurements downloaded; no scientific validation established.')


if __name__ == '__main__':
    main()
