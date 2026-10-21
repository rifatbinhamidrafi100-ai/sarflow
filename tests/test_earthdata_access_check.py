"""Test sanitized status handling with fake clients; no account or network access."""
import importlib.util
import json
import logging
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

spec = importlib.util.spec_from_file_location('access_check', Path(__file__).resolve().parents[1] / 'scripts/check_earthdata_access.py')
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class AccessCheckTests(unittest.TestCase):
    def test_network_failures_are_distinct_without_messages(self):
        for error, expected in [(TimeoutError('PRIVATE'), 'network-timeout'),
                                (ConnectionError('PRIVATE'), 'network-connection-failed')]:
            with self.subTest(expected=expected):
                client = Mock()
                client.login.side_effect = error
                report = checker.check_access(client)
                self.assertEqual(report['failureReason'], expected)
                self.assertNotIn('PRIVATE', json.dumps(report))

    def test_closed_input_is_actionable(self):
        client = Mock()
        client.login.side_effect = EOFError('PRIVATE_INPUT_FIXTURE')
        report = checker.check_access(client)
        self.assertEqual(report['failureReason'], 'terminal-input-closed')
        self.assertNotIn('PRIVATE_INPUT_FIXTURE', json.dumps(report))

    def test_cancelled_login_returns_safe_report(self):
        client = Mock()
        client.login.side_effect = KeyboardInterrupt()
        self.assertEqual(checker.check_access(client)['failureReason'], 'cancelled-by-user')

    def test_authentication_logs_are_suppressed_and_setting_restored(self):
        client = Mock()
        previous = logging.root.manager.disable
        def login(**kwargs):
            self.assertGreaterEqual(logging.root.manager.disable, logging.CRITICAL)
            raise RuntimeError('PRIVATE_EXCEPTION_FIXTURE')
        client.login.side_effect = login
        checker.check_access(client)
        self.assertEqual(logging.root.manager.disable, previous)

    def test_authentication_exception_is_not_serialized(self):
        client = Mock()
        client.login.side_effect = RuntimeError('PRIVATE_EXCEPTION_FIXTURE')
        report = checker.check_access(client)
        self.assertEqual(report['status'], 'manual-authentication-failed')
        self.assertNotIn('PRIVATE_EXCEPTION_FIXTURE', json.dumps(report))
        client.search_data.assert_not_called()

    def test_incomplete_authentication_is_distinct_from_empty_catalogue(self):
        client = Mock()
        client.login.return_value = SimpleNamespace(authenticated=False)
        report = checker.check_access(client)
        self.assertEqual(report['status'], 'manual-authentication-incomplete')
        self.assertFalse(report['authenticationCompleted'])
        client.search_data.assert_not_called()

    def test_authenticated_empty_catalogue_does_not_claim_processing(self):
        client = Mock()
        client.login.return_value = SimpleNamespace(authenticated=True)
        client.search_data.return_value = []
        report = checker.check_access(client)
        self.assertEqual(report['status'], 'authenticated-catalogue-empty')
        self.assertEqual(report['downloadedFiles'], 0)
        self.assertFalse(report['independentValidation'])
        client.login.assert_called_once_with(strategy='interactive', persist=False)

    def test_query_exception_does_not_disclose_its_message(self):
        client = Mock()
        client.login.return_value = SimpleNamespace(authenticated=True)
        client.search_data.side_effect = RuntimeError('PRIVATE_QUERY_FIXTURE')
        report = checker.check_access(client)
        self.assertEqual(report['status'], 'authenticated-catalogue-request-failed')
        self.assertNotIn('PRIVATE_QUERY_FIXTURE', json.dumps(report))


if __name__ == '__main__':
    unittest.main()
