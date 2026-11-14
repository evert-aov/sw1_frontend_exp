import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function failClosed(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

async function createFixture(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const syntheticKey = `AKIA${randomBytes(12).toString('hex').toUpperCase().slice(0, 16)}`;
  await writeFile(
    join(directory, 'synthetic-credential.txt'),
    `AWS_ACCESS_KEY_ID=${syntheticKey}\n`,
    {
      encoding: 'utf8',
      mode: 0o600,
    },
  );
  process.stdout.write('Prepared an ephemeral synthetic secret-scanner fixture.\n');
}

async function verifyFixture(scanPath, fixtureDirectory, scannerOutcome) {
  try {
    if (scannerOutcome !== 'success') {
      throw new Error('scanner did not complete');
    }

    const scan = JSON.parse(await readFile(scanPath, 'utf8'));
    if (
      !scan ||
      scan.SchemaVersion !== 2 ||
      typeof scan.ArtifactName !== 'string' ||
      scan.ArtifactName.length === 0 ||
      scan.ArtifactType !== 'filesystem' ||
      !Array.isArray(scan.Results)
    ) {
      throw new Error('scanner output is malformed');
    }

    const secretCount = scan.Results.reduce((count, result) => {
      if (!result || typeof result !== 'object') {
        throw new Error('scanner output is malformed');
      }
      if (result.Secrets !== undefined && !Array.isArray(result.Secrets)) {
        throw new Error('scanner output is malformed');
      }
      if (result.Secrets?.some((secret) => !secret || typeof secret !== 'object')) {
        throw new Error('scanner output is malformed');
      }
      return count + (result.Secrets?.length ?? 0);
    }, 0);

    if (secretCount < 1) {
      throw new Error('synthetic secret was not detected');
    }
    process.stdout.write('Trivy secret-scanner self-test passed.\n');
  } catch {
    failClosed('Trivy secret-scanner self-test failed closed.');
  } finally {
    await Promise.all([
      rm(scanPath, { force: true }).catch(() => {}),
      rm(fixtureDirectory, { force: true, recursive: true }).catch(() => {}),
    ]);
  }
}

const [mode, firstPath, secondPath, scannerOutcome] = process.argv.slice(2);

if (mode === 'create' && firstPath) {
  createFixture(firstPath).catch(() =>
    failClosed('Could not prepare the synthetic secret-scanner fixture.'),
  );
} else if (mode === 'verify' && firstPath && secondPath && scannerOutcome) {
  verifyFixture(firstPath, secondPath, scannerOutcome);
} else {
  failClosed(
    'Usage: secret-scanner-self-test.mjs create <directory> | verify <scan-json> <fixture-directory> <outcome>',
  );
}
