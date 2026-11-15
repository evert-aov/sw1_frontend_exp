import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildDeploymentReports, writeDeploymentReport } from './deployment-report.mjs';

test('separates authentication failure from publication and deployment outcomes', () => {
  const reports = buildDeploymentReports({
    VERSION: 'a'.repeat(40),
    CHECKOUT_OUTCOME: 'success',
    SETUP_PNPM_OUTCOME: 'success',
    SETUP_NODE_OUTCOME: 'success',
    INJECT_API_OUTCOME: 'success',
    INSTALL_OUTCOME: 'success',
    BUILD_OUTCOME: 'success',
    ARCHIVE_OUTCOME: 'success',
    AWS_AUTH_OUTCOME: 'failure',
    PUBLISH_S3_OUTCOME: 'skipped',
    INVALIDATE_CLOUDFRONT_OUTCOME: 'skipped',
    WAIT_CLOUDFRONT_OUTCOME: 'skipped',
  });
  const phases = Object.fromEntries(reports.map((entry) => [entry.phase, entry]));

  assert.equal(phases.authentication.status, 'failed');
  assert.equal(phases.authentication.code, 'DEPLOY.AUTHENTICATION_FAILED');
  assert.equal(phases.publication.status, 'not_verified');
  assert.equal(phases.deployment.status, 'not_verified');
  assert.equal(phases.startup.status, 'not_verified');
  assert.equal(phases.readiness.status, 'not_verified');
  assert.equal(phases.postdeploy.status, 'not_verified');
});

test('successful S3 and CloudFront steps still do not claim runtime health', () => {
  const reports = buildDeploymentReports({
    VERSION: 'b'.repeat(40),
    CHECKOUT_OUTCOME: 'success',
    SETUP_PNPM_OUTCOME: 'success',
    SETUP_NODE_OUTCOME: 'success',
    INJECT_API_OUTCOME: 'success',
    INSTALL_OUTCOME: 'success',
    BUILD_OUTCOME: 'success',
    ARCHIVE_OUTCOME: 'success',
    AWS_AUTH_OUTCOME: 'success',
    PUBLISH_S3_OUTCOME: 'success',
    INVALIDATE_CLOUDFRONT_OUTCOME: 'success',
    WAIT_CLOUDFRONT_OUTCOME: 'success',
  });
  const phases = Object.fromEntries(reports.map((entry) => [entry.phase, entry]));

  assert.equal(phases.publication.status, 'passed');
  assert.equal(phases.deployment.status, 'passed');
  assert.equal(phases.startup.status, 'not_verified');
  assert.equal(phases.readiness.status, 'not_verified');
  assert.equal(phases.postdeploy.status, 'not_verified');
});

test('a failed CloudFront propagation wait is not reported as successful deployment', () => {
  const reports = buildDeploymentReports({
    VERSION: 'c'.repeat(40),
    INVALIDATE_CLOUDFRONT_OUTCOME: 'success',
    WAIT_CLOUDFRONT_OUTCOME: 'failure',
  });
  const phases = Object.fromEntries(reports.map((entry) => [entry.phase, entry]));

  assert.equal(phases.deployment.status, 'failed');
  assert.equal(phases.deployment.code, 'DEPLOY.DEPLOYMENT_FAILED');
  assert.equal(phases.readiness.status, 'not_verified');
});

test('missing or unknown outcomes are never reported as success', () => {
  const reports = buildDeploymentReports({});

  for (const phase of reports) {
    assert.notEqual(phase.status, 'passed', `unexpected pass for ${phase.phase}`);
  }
});

test('writes a report with a safe markdown summary', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'deployment-report-'));
  const summaryPath = path.join(directory, 'summary.md');
  let stdout = '';
  const originalWrite = process.stdout.write;
  process.stdout.write = (chunk) => {
    stdout += chunk;
    return true;
  };
  try {
    writeDeploymentReport({ GITHUB_STEP_SUMMARY: summaryPath });
  } finally {
    process.stdout.write = originalWrite;
  }
  try {
    assert.match(stdout, /"schema": "diagnostic-report\/v1"/);
    assert.match(readFileSync(summaryPath, 'utf8'), /Deployment diagnostic report/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
