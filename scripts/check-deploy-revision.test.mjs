import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(
  new URL('../.github/workflows/deploy-aws.yml', import.meta.url),
  'utf8',
);
const expectedRevision = '${{ github.event.workflow_run.head_sha || github.sha }}';
const validatedRevision = '${{ needs.preflight.outputs.revision }}';

test('deployment report identifies the same revision that checkout builds', () => {
  assert.ok(workflow.includes(`ref: ${expectedRevision}`));
  assert.ok(workflow.includes('revision: ${{ steps.gate.outputs.revision }}'));
  assert.ok(workflow.includes(`ref: ${validatedRevision}`));
  assert.ok(workflow.includes(`VERSION: ${validatedRevision}`));
});
