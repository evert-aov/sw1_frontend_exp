#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const project = 'sw1_frontend_exp';
const deploymentEnvironment = 'aws-production';
const revisionPattern = /^[a-f0-9]{40}$/i;
const validators = new Map([
  ['AWS_DEPLOY_ROLE_ARN', /^arn:aws(?:-[a-z0-9-]+)?:iam::[0-9]{12}:role\/[A-Za-z0-9+=,.@_/-]+$/],
  ['AWS_REGION', /^[a-z]{2}(?:-gov)?-[a-z0-9-]+-[0-9]+$/],
  [
    'AWS_API_HOST',
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/,
  ],
  ['AWS_S3_WEBAPP_BUCKET', /^[a-z0-9](?:[a-z0-9.-]{1,61}[a-z0-9])?$/],
  ['AWS_CLOUDFRONT_DISTRIBUTION_ID', /^[A-Z0-9]{8,32}$/],
]);

function eventEvidence(env) {
  const eventName = env.GITHUB_EVENT_NAME ?? '';
  const ref = env.GITHUB_REF ?? '';
  const revision = env.DEPLOY_REVISION || env.GITHUB_SHA || '';
  const evidence = {
    trigger: 'other',
    ref_class: 'not_applicable',
    source_event: 'not_applicable',
    source_branch: 'not_applicable',
    source_conclusion: 'not_applicable',
  };

  if (eventName === 'workflow_dispatch') {
    evidence.trigger = 'manual';
    evidence.ref_class = ref === 'refs/heads/main' ? 'main' : 'non_main';
    if (ref !== 'refs/heads/main') {
      return { allowed: false, evidence, code: 'DEPLOY.BRANCH_NOT_ALLOWED' };
    }
  } else if (eventName === 'workflow_run') {
    const sourceEvent = env.WORKFLOW_RUN_EVENT ?? '';
    const sourceBranch = env.WORKFLOW_RUN_BRANCH ?? '';
    const sourceConclusion = env.WORKFLOW_RUN_CONCLUSION ?? '';
    evidence.trigger = 'workflow_run';
    evidence.ref_class = sourceBranch === 'main' ? 'main' : 'non_main';
    evidence.source_event = ['push', 'pull_request', 'workflow_dispatch'].includes(sourceEvent)
      ? sourceEvent
      : 'other';
    evidence.source_branch = sourceBranch === 'main' ? 'main' : 'other';
    evidence.source_conclusion = ['success', 'failure', 'cancelled'].includes(sourceConclusion)
      ? sourceConclusion
      : 'other';
    if (sourceEvent !== 'push' || sourceBranch !== 'main' || sourceConclusion !== 'success') {
      return { allowed: false, evidence, code: 'DEPLOY.VALIDATION_NOT_PASSED' };
    }
  } else {
    return { allowed: false, evidence, code: 'DEPLOY.TRIGGER_NOT_ALLOWED' };
  }

  if (!revisionPattern.test(revision)) {
    return { allowed: false, evidence, code: 'DEPLOY.REVISION_INVALID' };
  }
  return { allowed: true, evidence, code: null };
}

export function buildPreflightReport(env = process.env) {
  const started = performance.now();
  const event = eventEvidence(env);
  const rawRevision = env.DEPLOY_REVISION || env.GITHUB_SHA || '';
  const revision = revisionPattern.test(rawRevision) ? rawRevision.toLowerCase() : 'unknown';
  let status = 'success';
  let causeStatus = 'unknown';
  let actions = [];
  let missingVariables = [];
  let invalidVariables = [];
  let code = event.code;

  if (!event.allowed) {
    status = 'blocked';
    causeStatus = 'confirmed';
    actions = [
      'Run deployment only from main after successful CI on a main push; do not deploy feature or pull-request revisions.',
    ];
  } else {
    missingVariables = [...validators.keys()].filter((name) => !(env[name] ?? '').trim()).sort();
    invalidVariables = [...validators.entries()]
      .filter(([name, validator]) => {
        const rawValue = env[name] ?? '';
        return rawValue.trim() && (rawValue !== rawValue.trim() || !validator.test(rawValue));
      })
      .map(([name]) => name)
      .sort();

    if (missingVariables.length) {
      status = 'not_configured';
      code = 'DEPLOY.CONFIG_NOT_CONFIGURED';
      causeStatus = 'confirmed';
      actions = [
        'Define the listed GitHub Actions repository variables; never place AWS credentials or variable values in source code or reports.',
      ];
    } else if (invalidVariables.length) {
      status = 'failed';
      code = 'DEPLOY.CONFIG_INVALID';
      causeStatus = 'confirmed';
      actions = [
        'Correct the format of the listed GitHub Actions variables and rerun preflight; values are intentionally omitted from this report.',
      ];
    } else {
      code = null;
    }
  }

  return {
    schema: 'deployment-report/v1',
    project,
    revision,
    environment: deploymentEnvironment,
    phase: 'preflight',
    status,
    gate_status: status === 'success' ? 'allowed' : 'blocked',
    duration_ms: Math.max(0, Math.round(performance.now() - started)),
    code,
    cause_status: causeStatus,
    evidence: {
      ...event.evidence,
      missing_variables: missingVariables,
      invalid_variables: invalidVariables,
    },
    possible_causes: [],
    recommended_actions: actions,
  };
}

function writeReport(report, env) {
  const rendered = `${JSON.stringify(report, null, 2)}\n`;
  const reportPath = env.DEPLOYMENT_REPORT_PATH;
  if (reportPath) {
    mkdirSync(path.dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, rendered, 'utf8');
  }

  if (env.GITHUB_OUTPUT) {
    const allowed = report.status === 'success' ? 'true' : 'false';
    writeFileSync(env.GITHUB_OUTPUT, `allowed=${allowed}\nrevision=${report.revision}\n`, {
      encoding: 'utf8',
      flag: 'a',
    });
  }

  if (env.GITHUB_STEP_SUMMARY) {
    const missing = report.evidence.missing_variables;
    const invalid = report.evidence.invalid_variables;
    const summary = [
      '## Deployment preflight',
      '',
      `- Project: \`${project}\``,
      `- Revision: \`${report.revision}\``,
      `- Environment: \`${deploymentEnvironment}\``,
      `- Phase/status: \`preflight\` / **${report.status}**`,
      `- Deployment gate: **${report.gate_status}**`,
      ...(report.code ? [`- Code: \`${report.code}\``] : []),
      ...(missing.length
        ? [`- Missing variables: ${missing.map((name) => `\`${name}\``).join(', ')}`]
        : []),
      ...(invalid.length
        ? [`- Invalid-format variables: ${invalid.map((name) => `\`${name}\``).join(', ')}`]
        : []),
      ...report.recommended_actions.map((action) => `- Action: ${action}`),
      '',
      '```json',
      JSON.stringify(report, null, 2),
      '```',
      '',
    ].join('\n');
    writeFileSync(env.GITHUB_STEP_SUMMARY, summary, { encoding: 'utf8', flag: 'a' });
  }
}

function main() {
  const report = buildPreflightReport(process.env);
  writeReport(report, process.env);
  console.log(`Deployment preflight: ${report.status} (${report.code ?? 'no error'})`);
  for (const key of ['missing_variables', 'invalid_variables']) {
    const names = report.evidence[key];
    if (names.length) console.log(`${key.replaceAll('_', ' ')}: ${names.join(', ')}`);
  }
  return report.status === 'success' ? 0 : 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  process.exitCode = main();
}
