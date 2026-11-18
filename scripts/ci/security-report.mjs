import { appendFile, readFile, writeFile } from 'node:fs/promises';

const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']);
const VALID_ARTIFACT_TYPES = new Set(['filesystem', 'repository']);
const BLOCKING_SEVERITIES = new Set(['CRITICAL', 'HIGH']);
const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, UNKNOWN: 4 };
const MAX_SECRET_FINDINGS = 20;

function safeVersion(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(value) ? value : 'unknown';
}

function safeIdentifier(value, pattern, name) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new Error(`invalid ${name}`);
  }
  return value;
}

function safeSecretRuleId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_.-]{1,128}$/.test(value) ? value : 'unknown';
}

function safeSecretTarget(value) {
  if (typeof value !== 'string' || value.length > 240 || value !== value.trim()) {
    return 'redacted';
  }
  let target = value.replaceAll('\\', '/');
  while (target.startsWith('./')) target = target.slice(2);
  if (
    !/^[A-Za-z0-9._ @+\/-]{1,240}$/.test(target) ||
    target.startsWith('/') ||
    target.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    return 'redacted';
  }
  return target;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function emptyEvidence(scannerStatus, selfTestStatus, outputValidation = 'not_checked') {
  return {
    scanner: 'Trivy filesystem',
    scanner_status: scannerStatus,
    output_validation: outputValidation,
    secret_scanner_self_test: selfTestStatus,
    secrets_detected: 0,
    secret_findings: [],
    secret_findings_truncated: false,
    vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
    blocking_vulnerabilities: [],
    advisories: [],
  };
}

function makeReport({
  status,
  code = null,
  causeStatus = 'unknown',
  evidence,
  recommendations = [],
  version,
}) {
  return {
    schema: 'security-report/v1',
    service: 'frontend',
    version: safeVersion(version),
    phase: 'security_scan',
    status,
    code,
    cause_status: causeStatus,
    evidence,
    possible_causes: [],
    recommended_actions: recommendations,
  };
}

function failureResult({
  status = 'failed',
  code,
  scannerStatus,
  selfTestStatus,
  version,
  recommendation,
  outputValidation = 'not_checked',
}) {
  return {
    report: makeReport({
      status,
      code,
      causeStatus: 'unknown',
      evidence: emptyEvidence(scannerStatus, selfTestStatus, outputValidation),
      recommendations: [recommendation],
      version,
    }),
    exitCode: 1,
  };
}

function readScan(scanJson) {
  if (typeof scanJson !== 'string' || scanJson.length === 0) {
    throw Object.assign(new Error(), { outputValidation: 'input_unavailable' });
  }

  let parsed;
  try {
    parsed = JSON.parse(scanJson);
  } catch {
    throw Object.assign(new Error(), { outputValidation: 'invalid_json' });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw Object.assign(new Error(), { outputValidation: 'root_not_object' });
  }
  if (parsed.SchemaVersion !== 2) {
    throw Object.assign(new Error(), { outputValidation: 'unsupported_schema_version' });
  }
  if (typeof parsed.ArtifactName !== 'string' || parsed.ArtifactName.length === 0) {
    throw Object.assign(new Error(), { outputValidation: 'artifact_name_invalid' });
  }
  if (typeof parsed.ArtifactType !== 'string' || !VALID_ARTIFACT_TYPES.has(parsed.ArtifactType)) {
    throw Object.assign(new Error(), { outputValidation: 'artifact_type_invalid' });
  }
  if (!Object.hasOwn(parsed, 'Results')) {
    throw Object.assign(new Error(), { outputValidation: 'results_missing' });
  }
  if (parsed.Results !== null && !Array.isArray(parsed.Results)) {
    throw Object.assign(new Error(), { outputValidation: 'results_invalid' });
  }

  const counts = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
  const blockingVulnerabilities = [];
  const advisories = [];
  let secretsDetected = 0;
  const secretFindingCounts = new Map();

  for (const result of parsed.Results ?? []) {
    if (!result || typeof result !== 'object') {
      throw Object.assign(new Error(), { outputValidation: 'result_not_object' });
    }

    if (result.Secrets !== undefined) {
      if (
        (result.Secrets !== null && !Array.isArray(result.Secrets)) ||
        (result.Secrets ?? []).some((secret) => !secret || typeof secret !== 'object')
      ) {
        throw Object.assign(new Error(), { outputValidation: 'secret_findings_invalid' });
      }
      secretsDetected += (result.Secrets ?? []).length;
      const target = safeSecretTarget(result.Target);
      for (const secret of result.Secrets ?? []) {
        const ruleId = safeSecretRuleId(secret.RuleID);
        const key = JSON.stringify([ruleId, target]);
        const finding = secretFindingCounts.get(key) ?? { rule_id: ruleId, target, count: 0 };
        finding.count += 1;
        secretFindingCounts.set(key, finding);
      }
    }

    if (result.Vulnerabilities !== undefined) {
      if (
        (result.Vulnerabilities !== null && !Array.isArray(result.Vulnerabilities)) ||
        (result.Vulnerabilities ?? []).some(
          (vulnerability) => !vulnerability || typeof vulnerability !== 'object',
        )
      ) {
        throw Object.assign(new Error(), { outputValidation: 'vulnerability_findings_invalid' });
      }

      for (const vulnerability of result.Vulnerabilities ?? []) {
        const severity = vulnerability.Severity;
        if (typeof severity !== 'string' || !VALID_SEVERITIES.has(severity.toUpperCase())) {
          throw Object.assign(new Error(), { outputValidation: 'vulnerability_severity_invalid' });
        }

        const normalizedSeverity = severity.toUpperCase();
        const bucket = normalizedSeverity.toLowerCase();
        counts[bucket] += 1;

        const finding = {
          severity: normalizedSeverity,
          id: safeIdentifier(
            vulnerability.VulnerabilityID,
            /^[A-Za-z0-9_.:-]{1,128}$/,
            'vulnerability id',
          ),
          package_name: safeIdentifier(
            vulnerability.PkgName,
            /^[A-Za-z0-9@._/+:-]{1,200}$/,
            'package name',
          ),
        };
        if (BLOCKING_SEVERITIES.has(normalizedSeverity)) blockingVulnerabilities.push(finding);
        else advisories.push(finding);
      }
    }
  }

  const sortFindings = (left, right) => {
    const severityDifference = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
    return (
      severityDifference ||
      `${left.id}:${left.package_name}`.localeCompare(`${right.id}:${right.package_name}`)
    );
  };
  blockingVulnerabilities.sort(sortFindings);
  advisories.sort(sortFindings);
  const sortedSecretFindings = [...secretFindingCounts.values()].sort(
    (left, right) =>
      compareText(left.rule_id, right.rule_id) || compareText(left.target, right.target),
  );

  return {
    counts,
    blockingVulnerabilities,
    advisories,
    secretsDetected,
    secretFindings: sortedSecretFindings.slice(0, MAX_SECRET_FINDINGS),
    secretFindingsTruncated: sortedSecretFindings.length > MAX_SECRET_FINDINGS,
  };
}

export function buildSecurityReport(scanJson, options = {}) {
  const { scannerOutcome, selfTestOutcome, version } = options;
  const scannerStatus =
    scannerOutcome === 'success'
      ? 'completed'
      : scannerOutcome === 'failure' || scannerOutcome === 'cancelled'
        ? 'failed'
        : 'not_run';
  const selfTestStatus =
    selfTestOutcome === 'success' ? 'passed' : selfTestOutcome === 'failure' ? 'failed' : 'not_run';

  if (selfTestOutcome !== 'success') {
    const selfTestNotRun = selfTestOutcome === 'skipped' || !selfTestOutcome;
    return failureResult({
      status: selfTestNotRun ? 'not_verified' : 'failed',
      code: selfTestNotRun
        ? 'SECURITY.SECRET_SCANNER_SELF_TEST_NOT_VERIFIED'
        : 'SECURITY.SECRET_SCANNER_SELF_TEST_FAILED',
      scannerStatus,
      selfTestStatus,
      version,
      recommendation: 'Restore the Trivy secret-scanner self-test before accepting this CI result.',
    });
  }

  if (scannerOutcome !== 'success') {
    const notRun = scannerOutcome === 'skipped' || !scannerOutcome;
    return failureResult({
      status: notRun ? 'not_verified' : 'failed',
      code: notRun ? 'SECURITY.SCAN_NOT_VERIFIED' : 'SECURITY.SCANNER_FAILED',
      scannerStatus: notRun ? 'not_run' : 'failed',
      selfTestStatus,
      version,
      recommendation:
        'Rerun the filesystem security scan and inspect the scanner setup if it fails again.',
    });
  }

  let scan;
  try {
    scan = readScan(scanJson);
  } catch (error) {
    return failureResult({
      status: 'not_verified',
      code: 'SECURITY.SCAN_OUTPUT_INVALID',
      scannerStatus: 'invalid_output',
      selfTestStatus,
      version,
      outputValidation: error?.outputValidation ?? 'finding_metadata_invalid',
      recommendation: 'Inspect the scanner result format and rerun the filesystem security scan.',
    });
  }

  const evidence = {
    scanner: 'Trivy filesystem',
    scanner_status: scannerStatus,
    output_validation: 'valid',
    secret_scanner_self_test: selfTestStatus,
    secrets_detected: scan.secretsDetected,
    secret_findings: scan.secretFindings,
    secret_findings_truncated: scan.secretFindingsTruncated,
    vulnerabilities: scan.counts,
    blocking_vulnerabilities: scan.blockingVulnerabilities,
    advisories: scan.advisories,
  };

  if (scan.secretsDetected > 0) {
    return {
      report: makeReport({
        status: 'failed',
        code: 'SECURITY.SECRET_DETECTED',
        causeStatus: 'confirmed',
        evidence,
        recommendations: [
          'Remove or rotate exposed credentials, then rerun the filesystem security scan.',
        ],
        version,
      }),
      exitCode: 1,
    };
  }

  if (scan.counts.high > 0 || scan.counts.critical > 0) {
    return {
      report: makeReport({
        status: 'failed',
        code: 'SECURITY.HIGH_OR_CRITICAL_VULNERABILITY',
        causeStatus: 'confirmed',
        evidence,
        recommendations: [
          'Upgrade or otherwise mitigate the HIGH and CRITICAL vulnerable dependencies.',
        ],
        version,
      }),
      exitCode: 1,
    };
  }

  return {
    report: makeReport({
      status: 'passed',
      code: scan.advisories.length > 0 ? 'SECURITY.SCAN_ADVISORIES' : 'SECURITY.SCAN_PASSED',
      causeStatus: 'unknown',
      evidence,
      recommendations:
        scan.advisories.length > 0
          ? ['Review the lower-severity vulnerability advisories and plan proportionate updates.']
          : ['No blocking filesystem security findings were detected.'],
      version,
    }),
    exitCode: 0,
  };
}

function markdownCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function formatSecuritySummary(report) {
  const { critical, high, medium, low } = report.evidence.vulnerabilities;
  const state =
    report.status === 'passed'
      ? 'PASSED'
      : report.status === 'not_verified'
        ? 'NOT VERIFIED'
        : 'FAILED';
  const lines = [
    '## Frontend filesystem security scan',
    '',
    `- Status: **${state}**${report.code ? ` (${report.code})` : ''}`,
    `- Scanner: ${report.evidence.scanner} (${report.evidence.scanner_status})`,
    `- Output validation: ${report.evidence.output_validation}`,
    `- Secret scanner self-test: ${report.evidence.secret_scanner_self_test}`,
    `- Version: ${markdownCell(report.version)}`,
    `- Secret matches: ${report.evidence.secrets_detected}`,
    `- Vulnerabilities: CRITICAL ${critical}, HIGH ${high}, MEDIUM ${medium}, LOW ${low}, UNKNOWN ${report.evidence.vulnerabilities.unknown}`,
  ];

  if (report.evidence.secret_findings.length > 0) {
    lines.push(
      '',
      'Secret finding locations (matched values and line numbers omitted):',
      ...report.evidence.secret_findings.map(
        (finding) => `- \`${finding.rule_id}\` in \`${finding.target}\` (count: ${finding.count})`,
      ),
    );
    if (report.evidence.secret_findings_truncated) {
      lines.push('- Additional secret finding locations were omitted by the report limit.');
    }
  }

  if (report.evidence.advisories.length > 0) {
    lines.push(
      '',
      'Lower-severity advisories:',
      '',
      '| Severity | ID | Package |',
      '| --- | --- | --- |',
    );
    for (const advisory of report.evidence.advisories) {
      lines.push(
        `| ${markdownCell(advisory.severity)} | ${markdownCell(advisory.id)} | ${markdownCell(advisory.package_name)} |`,
      );
    }
  }

  if (report.evidence.blocking_vulnerabilities.length > 0) {
    lines.push(
      '',
      'Blocking HIGH/CRITICAL vulnerabilities:',
      '',
      '| Severity | ID | Package |',
      '| --- | --- | --- |',
    );
    for (const finding of report.evidence.blocking_vulnerabilities) {
      lines.push(
        `| ${markdownCell(finding.severity)} | ${markdownCell(finding.id)} | ${markdownCell(finding.package_name)} |`,
      );
    }
  }

  if (report.recommended_actions.length > 0) {
    lines.push(
      '',
      'Recommended action:',
      ...report.recommended_actions.map((action) => `- ${action}`),
    );
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const rawPath = process.env.TRIVY_JSON_PATH;
  const reportPath = process.env.SECURITY_REPORT_PATH;
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;

  if (!rawPath || !reportPath || !summaryPath) {
    throw new Error('required report paths are unavailable');
  }

  let scanJson = null;
  try {
    scanJson = await readFile(rawPath, 'utf8');
  } catch {
    // The report builder turns missing output into a non-passing report.
  }

  const result = buildSecurityReport(scanJson, {
    scannerOutcome: process.env.TRIVY_OUTCOME,
    selfTestOutcome: process.env.SECRET_SELF_TEST_OUTCOME,
    version: process.env.GITHUB_SHA,
  });

  await writeFile(reportPath, `${JSON.stringify(result.report, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await appendFile(summaryPath, formatSecuritySummary(result.report), {
    encoding: 'utf8',
    mode: 0o600,
  });
  process.exitCode = result.exitCode;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  main().catch(() => {
    process.stderr.write('Security report generation failed closed.\n');
    process.exitCode = 1;
  });
}
