import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildPreflightReport } from './deployment-preflight.mjs';

const scriptPath = fileURLToPath(new URL('./deployment-preflight.mjs', import.meta.url));
const workflowPath = fileURLToPath(new URL('../.github/workflows/deploy-aws.yml', import.meta.url));
const revision = 'a'.repeat(40);

function validEnvironment(overrides = {}) {
  return {
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_SHA: revision,
    DEPLOY_CONFIRMATION: 'true',
    WORKFLOW_RUN_EVENT: '',
    WORKFLOW_RUN_BRANCH: '',
    WORKFLOW_RUN_CONCLUSION: '',
    AWS_DEPLOY_ROLE_ARN: 'arn:aws:iam::123456789012:role/deploy-role',
    AWS_REGION: 'us-west-2',
    AWS_API_HOST: 'api.example.test',
    AWS_S3_WEBAPP_BUCKET: 'web-assets-example',
    AWS_CLOUDFRONT_DISTRIBUTION_ID: 'E123456789ABC',
    DEPLOY_ENVIRONMENT: 'aws-production',
    ...overrides,
  };
}

test('preflight report matches the stable deployment contract', () => {
  const report = buildPreflightReport(validEnvironment());
  const requiredFields = [
    'schema',
    'project',
    'revision',
    'environment',
    'phase',
    'status',
    'duration_ms',
    'gate_status',
    'code',
    'cause_status',
    'evidence',
    'possible_causes',
    'recommended_actions',
  ];

  for (const field of requiredFields) {
    assert.ok(Object.hasOwn(report, field), `missing report field: ${field}`);
  }
  assert.equal(report.schema, 'deployment-report/v1');
  assert.equal(typeof report.duration_ms, 'number');
  assert.equal(typeof report.evidence, 'object');
  assert.ok(Array.isArray(report.possible_causes));
  assert.ok(Array.isArray(report.recommended_actions));
});

test('blocks manual dispatch from non-main without echoing the branch', () => {
  const report = buildPreflightReport(
    validEnvironment({ GITHUB_REF: 'refs/heads/feature/unreviewed' }),
  );

  assert.equal(report.status, 'blocked');
  assert.equal(report.gate_status, 'blocked');
  assert.equal(report.code, 'DEPLOY.BRANCH_NOT_ALLOWED');
  assert.equal(report.cause_status, 'confirmed');
  assert.equal(report.evidence.ref_class, 'non_main');
  assert.equal(JSON.stringify(report).includes('feature/unreviewed'), false);
});

test('blocks workflow runs even when CI was a successful main push', () => {
  const report = buildPreflightReport(
    validEnvironment({
      GITHUB_EVENT_NAME: 'workflow_run',
      WORKFLOW_RUN_EVENT: 'push',
      WORKFLOW_RUN_BRANCH: 'main',
      WORKFLOW_RUN_CONCLUSION: 'success',
      DEPLOY_REVISION: revision,
    }),
  );

  assert.equal(report.status, 'blocked');
  assert.equal(report.gate_status, 'blocked');
  assert.equal(report.code, 'DEPLOY.TRIGGER_NOT_ALLOWED');
});

test('blocks manual dispatch unless the confirmation input is true', () => {
  const report = buildPreflightReport(validEnvironment({ DEPLOY_CONFIRMATION: 'false' }));

  assert.equal(report.status, 'blocked');
  assert.equal(report.gate_status, 'blocked');
  assert.equal(report.code, 'DEPLOY.CONFIRMATION_REQUIRED');
  assert.equal(report.cause_status, 'confirmed');
});

test('reports missing AWS variables without exposing configured values', () => {
  const report = buildPreflightReport(
    validEnvironment({ AWS_REGION: '', AWS_S3_WEBAPP_BUCKET: '', DEPLOY_CONFIRMATION: 'false' }),
  );

  assert.equal(report.status, 'not_configured');
  assert.equal(report.gate_status, 'blocked');
  assert.equal(report.code, 'DEPLOY.CONFIG_NOT_CONFIGURED');
  assert.deepEqual(report.evidence.missing_variables, ['AWS_REGION', 'AWS_S3_WEBAPP_BUCKET']);
  assert.equal(JSON.stringify(report).includes('us-west-2'), false);
});

test('rejects invalid configuration and never echoes its value', () => {
  const badRegion = 'not-a-real-region';
  const report = buildPreflightReport(validEnvironment({ AWS_REGION: badRegion }));

  assert.equal(report.status, 'failed');
  assert.equal(report.gate_status, 'blocked');
  assert.equal(report.code, 'DEPLOY.CONFIG_INVALID');
  assert.deepEqual(report.evidence.invalid_variables, ['AWS_REGION']);
  assert.equal(JSON.stringify(report).includes(badRegion), false);
});

test('rejects whitespace around values consumed verbatim', () => {
  const report = buildPreflightReport(validEnvironment({ AWS_API_HOST: 'api.example.test\n' }));

  assert.equal(report.status, 'failed');
  assert.equal(report.gate_status, 'blocked');
  assert.deepEqual(report.evidence.invalid_variables, ['AWS_API_HOST']);
  assert.equal(JSON.stringify(report).includes('api.example.test'), false);
});

test('accepts a confirmed main dispatch only', () => {
  const dispatch = buildPreflightReport(validEnvironment());
  const push = buildPreflightReport(
    validEnvironment({
      GITHUB_EVENT_NAME: 'workflow_run',
      WORKFLOW_RUN_EVENT: 'push',
      WORKFLOW_RUN_BRANCH: 'main',
      WORKFLOW_RUN_CONCLUSION: 'success',
      DEPLOY_REVISION: revision,
    }),
  );

  assert.equal(dispatch.status, 'success');
  assert.equal(push.status, 'blocked');
  assert.equal(dispatch.gate_status, 'allowed');
  assert.equal(push.gate_status, 'blocked');
  assert.equal(push.code, 'DEPLOY.TRIGGER_NOT_ALLOWED');
  assert.equal(dispatch.revision, revision);
  assert.equal(dispatch.schema, 'deployment-report/v1');
});

test('deployment workflow has only the guarded manual trigger', () => {
  const workflow = readFileSync(workflowPath, 'utf8');

  assert.equal(workflow.includes('\n  workflow_run:'), false);
  assert.match(workflow, /\n  workflow_dispatch:\n    inputs:\n      confirm_deployment:/);
  assert.match(workflow, /default: false/);
  assert.match(workflow, /inputs\.confirm_deployment/);
  assert.match(workflow, /needs\.preflight\.outputs\.allowed == 'true'/);
  assert.ok(workflow.indexOf('id: gate') < workflow.indexOf('id: aws_auth'));
  assert.ok(workflow.indexOf('  deploy:') < workflow.indexOf('id-token: write'));
});

test('CLI writes a blocked report, markdown summary, and closed GitHub output', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'deployment-preflight-'));
  const reportPath = path.join(directory, 'report.json');
  const outputPath = path.join(directory, 'github-output.txt');
  const summaryPath = path.join(directory, 'github-summary.md');

  try {
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: path.dirname(path.dirname(scriptPath)),
      encoding: 'utf8',
      env: {
        ...validEnvironment({ AWS_REGION: '' }),
        DEPLOYMENT_REPORT_PATH: reportPath,
        GITHUB_OUTPUT: outputPath,
        GITHUB_STEP_SUMMARY: summaryPath,
      },
    });

    assert.equal(result.status, 1);
    assert.equal(JSON.parse(readFileSync(reportPath, 'utf8')).status, 'not_configured');
    assert.equal(JSON.parse(readFileSync(reportPath, 'utf8')).gate_status, 'blocked');
    assert.match(readFileSync(outputPath, 'utf8'), /allowed=false/);
    assert.match(readFileSync(summaryPath, 'utf8'), /Deployment preflight/);
    assert.match(result.stdout, /AWS_REGION/);
    assert.equal(result.stdout.includes('us-west-2'), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
