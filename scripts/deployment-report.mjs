import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const project = 'experiencia-frontend';
const safeRevision = /^[a-f0-9]{40}$/i;
const stepOutcomes = new Set(['success', 'failure', 'cancelled', 'skipped']);

function phaseStatus(steps, env) {
  const observed = steps.map(([name, variable]) => ({
    step: name,
    outcome: stepOutcomes.has(env[variable]) ? env[variable] : 'unknown',
  }));
  const failure = observed.find(({ outcome }) => ['failure', 'cancelled'].includes(outcome));
  const status = failure
    ? 'failed'
    : observed.every(({ outcome }) => outcome === 'success')
      ? 'passed'
      : 'not_verified';
  return { observed, status };
}

function report(phase, status, revision, observed, code = null) {
  const failed = status === 'failed';
  return {
    schema: 'diagnostic-report/v1',
    service: project,
    version: revision,
    phase,
    status,
    code,
    cause_status: failed ? 'hypothesis' : 'unknown',
    evidence: { probe: 'github_step_outcomes', source: 'github', steps: observed },
    possible_causes: failed
      ? ['A reported step failed; inspect the named Actions step to confirm the cause.']
      : [],
    recommended_actions: failed
      ? ['Inspect the first failed step and its sanitized report before retrying the release.']
      : [],
  };
}

function makePhase(phase, steps, env, revision, code) {
  const { observed, status } = phaseStatus(steps, env);
  return report(phase, status, revision, observed, status === 'failed' ? code : null);
}

export function buildDeploymentReports(env = process.env) {
  const rawRevision = env.VERSION || 'unknown';
  const revision = safeRevision.test(rawRevision) ? rawRevision.toLowerCase() : 'unknown';
  const reports = [
    makePhase(
      'preparation',
      [
        ['checkout', 'CHECKOUT_OUTCOME'],
        ['setup_pnpm', 'SETUP_PNPM_OUTCOME'],
        ['setup_node', 'SETUP_NODE_OUTCOME'],
        ['inject_api', 'INJECT_API_OUTCOME'],
        ['install', 'INSTALL_OUTCOME'],
      ],
      env,
      revision,
      'DEPLOY.PREPARATION_FAILED',
    ),
    makePhase('build', [['build', 'BUILD_OUTCOME']], env, revision, 'DEPLOY.BUILD_FAILED'),
    makePhase(
      'rollback_artifact',
      [['archive_release', 'ARCHIVE_OUTCOME']],
      env,
      revision,
      'DEPLOY.ARTIFACT_FAILED',
    ),
    makePhase(
      'authentication',
      [['aws_auth', 'AWS_AUTH_OUTCOME']],
      env,
      revision,
      'DEPLOY.AUTHENTICATION_FAILED',
    ),
    makePhase(
      'publication',
      [['publish_s3', 'PUBLISH_S3_OUTCOME']],
      env,
      revision,
      'DEPLOY.PUBLICATION_FAILED',
    ),
    makePhase(
      'deployment',
      [
        ['invalidate_cloudfront', 'INVALIDATE_CLOUDFRONT_OUTCOME'],
        ['wait_cloudfront', 'WAIT_CLOUDFRONT_OUTCOME'],
      ],
      env,
      revision,
      'DEPLOY.DEPLOYMENT_FAILED',
    ),
  ];

  for (const phase of ['startup', 'readiness', 'postdeploy']) {
    reports.push({
      schema: 'diagnostic-report/v1',
      service: project,
      version: revision,
      phase,
      status: 'not_verified',
      code: null,
      cause_status: 'unknown',
      evidence: { probe: 'runtime_health_check', source: 'github', outcome: 'not_observed' },
      possible_causes: [],
      recommended_actions: [
        'Run the documented authorized post-deployment smoke checks before declaring the site healthy.',
      ],
    });
  }

  return reports;
}

export function writeDeploymentReport(env = process.env) {
  const reports = buildDeploymentReports(env);
  const rendered = `${JSON.stringify(reports, null, 2)}\n`;
  process.stdout.write(rendered);
  if (env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      `## Deployment diagnostic report\n\nS3 publication and CloudFront activation are separate; startup, readiness, and postdeploy remain unverified without an authorized runtime probe.\n\n\`\`\`json\n${rendered}\`\`\`\n`,
      'utf8',
    );
  }
  return reports;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeDeploymentReport();
}
