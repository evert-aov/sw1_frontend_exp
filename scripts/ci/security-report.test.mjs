import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSecurityReport, formatSecuritySummary } from './security-report.mjs';

function buildReport(scanJson, options = {}) {
  return buildSecurityReport(scanJson, { selfTestOutcome: 'success', ...options });
}

function scanResult({ vulnerabilities = [], secrets = [], target = 'tests/fixture.txt' } = {}) {
  return JSON.stringify({
    SchemaVersion: 2,
    ArtifactName: '.',
    ArtifactType: 'filesystem',
    Results: [
      {
        Target: target,
        Vulnerabilities: vulnerabilities,
        Secrets: secrets,
      },
    ],
  });
}

function vulnerability(severity, id = `TEST-${severity}`, packageName = 'example-package') {
  return {
    VulnerabilityID: id,
    PkgName: packageName,
    Severity: severity,
    InstalledVersion: '1.0.0',
    FixedVersion: '1.0.1',
    Title: 'ignored title',
    Description: 'ignored description',
  };
}

test('blocks any secret finding and keeps match and line data out of report and summary', () => {
  const privateMatch = 'SYNTHETIC_SECRET_DO_NOT_PRINT_9f4a';
  const result = buildReport(
    scanResult({
      secrets: [
        {
          RuleID: 'generic-api-key',
          Match: privateMatch,
          StartLine: 73,
          EndLine: 73,
        },
      ],
    }),
    { scannerOutcome: 'success', version: 'test-revision' },
  );

  assert.equal(result.report.status, 'failed');
  assert.equal(result.report.code, 'SECURITY.SECRET_DETECTED');
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.evidence.secrets_detected, 1);
  assert.deepEqual(result.report.evidence.secret_findings, [
    { rule_id: 'generic-api-key', target: 'tests/fixture.txt', count: 1 },
  ]);
  assert.equal(JSON.stringify(result.report).includes(privateMatch), false);
  assert.equal(JSON.stringify(result.report).includes('StartLine'), false);
  assert.equal(JSON.stringify(result.report).includes('EndLine'), false);
  assert.equal(JSON.stringify(result.report).includes('73'), false);
  const summary = formatSecuritySummary(result.report);
  assert.match(summary, /generic-api-key/);
  assert.match(summary, /tests\/fixture\.txt/);
  assert.match(summary, /matched values and line numbers omitted/);
  assert.equal(summary.includes(privateMatch), false);
  assert.equal(summary.includes('StartLine'), false);
  assert.equal(summary.includes('EndLine'), false);
  assert.equal(summary.includes('73'), false);
});

test('redacts unsafe secret target paths from diagnostics', () => {
  for (const target of [
    '../../private-marker/token.txt',
    '/private-marker/token.txt',
    'C:\\private-marker\\token.txt',
    'folder/../../private-marker/token.txt',
    'folder\nprivate-marker/token.txt',
  ]) {
    const result = buildReport(
      scanResult({
        target,
        secrets: [{ RuleID: 'generic-api-key', Match: 'synthetic-marker' }],
      }),
      { scannerOutcome: 'success' },
    );

    assert.equal(result.report.evidence.secret_findings[0].target, 'redacted');
    assert.doesNotMatch(JSON.stringify(result.report), /private-marker/);
  }
});

test('normalizes relative Windows secret target paths', () => {
  const result = buildReport(
    scanResult({
      target: '.\\tests\\fixture.txt',
      secrets: [{ RuleID: 'generic-api-key', Match: 'synthetic-marker' }],
    }),
    { scannerOutcome: 'success' },
  );

  assert.equal(result.report.evidence.secret_findings[0].target, 'tests/fixture.txt');
});

test('aggregates, sorts, and bounds secret finding metadata', () => {
  const secrets = Array.from({ length: 21 }, (_, index) => ({
    RuleID: `generic-api-key-${String(index).padStart(2, '0')}`,
  }));
  secrets.push({ RuleID: 'generic-api-key-00' });
  const result = buildReport(scanResult({ secrets }), { scannerOutcome: 'success' });
  const findings = result.report.evidence.secret_findings;

  assert.equal(result.report.evidence.secrets_detected, 22);
  assert.equal(findings.length, 20);
  assert.deepEqual(findings[0], {
    rule_id: 'generic-api-key-00',
    target: 'tests/fixture.txt',
    count: 2,
  });
  assert.equal(findings.at(-1).rule_id, 'generic-api-key-19');
  assert.equal(result.report.evidence.secret_findings_truncated, true);
  assert.match(
    formatSecuritySummary(result.report),
    /Additional secret finding locations were omitted/,
  );
});

test('replaces invalid secret rule identifiers with unknown', () => {
  const result = buildReport(
    scanResult({ secrets: [{ RuleID: { 'private-marker': 'value' }, Match: 'synthetic-marker' }] }),
    { scannerOutcome: 'success' },
  );

  assert.equal(result.report.evidence.secret_findings[0].rule_id, 'unknown');
  assert.doesNotMatch(JSON.stringify(result.report), /private-marker/);
});

test('blocks HIGH and CRITICAL vulnerabilities', () => {
  for (const severity of ['HIGH', 'CRITICAL']) {
    const result = buildReport(scanResult({ vulnerabilities: [vulnerability(severity)] }), {
      scannerOutcome: 'success',
    });

    assert.equal(result.report.status, 'failed');
    assert.equal(result.report.code, 'SECURITY.HIGH_OR_CRITICAL_VULNERABILITY');
    assert.equal(result.exitCode, 1);
    assert.equal(result.report.evidence.blocking_vulnerabilities[0].severity, severity);
    assert.match(formatSecuritySummary(result.report), /Blocking HIGH\/CRITICAL vulnerabilities/);
  }
});

test('reports MEDIUM and LOW vulnerabilities as non-blocking advisories', () => {
  const result = buildReport(
    scanResult({
      vulnerabilities: [
        vulnerability('MEDIUM', 'CVE-2025-1000', 'library-medium'),
        vulnerability('LOW', 'CVE-2025-1001', 'library-low'),
      ],
    }),
    { scannerOutcome: 'success' },
  );

  assert.equal(result.report.status, 'passed');
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.report.evidence.vulnerabilities, {
    critical: 0,
    high: 0,
    medium: 1,
    low: 1,
    unknown: 0,
  });
  assert.deepEqual(
    result.report.evidence.advisories.map(({ severity, id, package_name }) => ({
      severity,
      id,
      package_name,
    })),
    [
      { severity: 'MEDIUM', id: 'CVE-2025-1000', package_name: 'library-medium' },
      { severity: 'LOW', id: 'CVE-2025-1001', package_name: 'library-low' },
    ],
  );
  assert.match(formatSecuritySummary(result.report), /advisories/i);
  assert.equal(result.report.code, 'SECURITY.SCAN_ADVISORIES');
});

test('malformed or incomplete scanner output fails closed', () => {
  for (const scanJson of [
    'not-json',
    JSON.stringify({ SchemaVersion: 2 }),
    JSON.stringify({ SchemaVersion: 1, Results: [] }),
    JSON.stringify({ Results: {} }),
  ]) {
    const result = buildReport(scanJson, { scannerOutcome: 'success' });

    assert.equal(result.report.status, 'not_verified');
    assert.equal(result.report.code, 'SECURITY.SCAN_OUTPUT_INVALID');
    assert.equal(result.exitCode, 1);
  }
});

test('invalid scanner output exposes only a safe validation reason', () => {
  const result = buildReport(
    JSON.stringify({
      SchemaVersion: 2,
      Results: [],
      SyntheticSecretMarker: 'do-not-report-this-value',
    }),
    { scannerOutcome: 'success' },
  );

  assert.equal(result.report.evidence.output_validation, 'artifact_name_invalid');
  assert.doesNotMatch(JSON.stringify(result.report), /do-not-report-this-value/);
});

test('scanner failure and not-run outcomes cannot pass', () => {
  for (const scannerOutcome of ['failure', 'skipped', 'unknown']) {
    const result = buildReport(scanResult(), { scannerOutcome });

    assert.notEqual(result.report.status, 'passed');
    assert.equal(result.exitCode, 1);
  }
});

test('missing or failed secret-scanner self-test cannot pass', () => {
  for (const selfTestOutcome of ['failure', 'skipped', undefined]) {
    const result = buildSecurityReport(scanResult(), {
      scannerOutcome: 'success',
      selfTestOutcome,
    });

    assert.notEqual(result.report.status, 'passed');
    assert.equal(result.exitCode, 1);
  }
});

test('unexpected vulnerability severity fails closed', () => {
  const result = buildReport(scanResult({ vulnerabilities: [vulnerability('UNSPECIFIED')] }), {
    scannerOutcome: 'success',
  });

  assert.equal(result.report.status, 'not_verified');
  assert.equal(result.report.code, 'SECURITY.SCAN_OUTPUT_INVALID');
  assert.equal(result.exitCode, 1);
});

test('reports UNKNOWN severity vulnerabilities as non-blocking advisories', () => {
  const result = buildReport(
    scanResult({ vulnerabilities: [vulnerability('UNKNOWN', 'TEST-UNKNOWN-1', 'unknown-lib')] }),
    { scannerOutcome: 'success' },
  );

  assert.equal(result.report.status, 'passed');
  assert.equal(result.report.evidence.vulnerabilities.unknown, 1);
  assert.equal(result.report.evidence.advisories[0].severity, 'UNKNOWN');
});

test('security report uses the shared diagnostic contract fields', () => {
  const result = buildReport(scanResult(), { scannerOutcome: 'success' });

  assert.deepEqual(Object.keys(result.report).sort(), [
    'cause_status',
    'code',
    'evidence',
    'phase',
    'possible_causes',
    'recommended_actions',
    'schema',
    'service',
    'status',
    'version',
  ]);
  assert.deepEqual(Object.keys(result.report.evidence).sort(), [
    'advisories',
    'blocking_vulnerabilities',
    'output_validation',
    'scanner',
    'scanner_status',
    'secret_findings',
    'secret_findings_truncated',
    'secret_scanner_self_test',
    'secrets_detected',
    'vulnerabilities',
  ]);
});

test('accepts the Trivy empty-result representation as a verified clean scan', () => {
  const result = buildReport(
    JSON.stringify({
      SchemaVersion: 2,
      ArtifactName: '/scan',
      ArtifactType: 'filesystem',
      Results: null,
    }),
    { scannerOutcome: 'success' },
  );

  assert.equal(result.report.status, 'passed');
  assert.equal(result.report.evidence.secrets_detected, 0);
  assert.equal(result.exitCode, 0);
});

test('accepts Trivy repository artifacts when scanning a Git checkout', () => {
  const result = buildReport(
    JSON.stringify({
      SchemaVersion: 2,
      ArtifactName: '.',
      ArtifactType: 'repository',
      Results: null,
    }),
    { scannerOutcome: 'success' },
  );

  assert.equal(result.report.status, 'passed');
  assert.equal(result.report.evidence.output_validation, 'valid');
  assert.equal(result.exitCode, 0);
});

test('rejects unrecognized and non-string Trivy artifact types safely', () => {
  for (const artifactType of ['unknown', [], {}]) {
    const result = buildReport(
      JSON.stringify({
        SchemaVersion: 2,
        ArtifactName: '.',
        ArtifactType: artifactType,
        Results: null,
      }),
      { scannerOutcome: 'success' },
    );

    assert.equal(result.report.status, 'not_verified');
    assert.equal(result.report.evidence.output_validation, 'artifact_type_invalid');
    assert.equal(result.exitCode, 1);
  }
});

test('rejects a Trivy document missing filesystem artifact metadata', () => {
  const result = buildReport(JSON.stringify({ SchemaVersion: 2, Results: [] }), {
    scannerOutcome: 'success',
  });

  assert.equal(result.report.status, 'not_verified');
  assert.equal(result.report.code, 'SECURITY.SCAN_OUTPUT_INVALID');
  assert.equal(result.exitCode, 1);
});
