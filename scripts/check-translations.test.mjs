import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const checkerPath = fileURLToPath(new URL('./check-translations.mjs', import.meta.url));

function runChecker({ spanish, english, template }) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'i18n-checker-'));
  const dictionaryDirectory = path.join(root, 'src/app/core/i18n');
  mkdirSync(dictionaryDirectory, { recursive: true });
  mkdirSync(path.join(root, 'src/app/features'), { recursive: true });
  writeFileSync(
    path.join(dictionaryDirectory, 'translations.ts'),
    `export const translations = { es: ${JSON.stringify(spanish)}, en: ${JSON.stringify(english)} };`,
  );
  writeFileSync(path.join(root, 'src/app/features/page.html'), template);

  try {
    return spawnSync(process.execPath, [checkerPath], { cwd: root, encoding: 'utf8' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('fails when a translation key is missing from one locale', () => {
  const result = runChecker({
    spanish: { 'shared.title': 'Título' },
    english: {},
    template: '<h1>{{ "shared.title" | translate }}</h1>',
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /en: falta shared\.title/);
});

test('fails when a template references a key absent from both locales', () => {
  const result = runChecker({
    spanish: { 'shared.title': 'Título' },
    english: { 'shared.title': 'Title' },
    template: "<h1>{{ 'missing.label' | translate }}</h1>",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /falta es:missing\.label/);
  assert.match(result.stderr, /falta en:missing\.label/);
});

test('passes when dictionaries and templates use matching translated keys', () => {
  const result = runChecker({
    spanish: { 'shared.title': 'Título' },
    english: { 'shared.title': 'Title' },
    template: "<h1>{{ 'shared.title' | translate }}</h1>",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /1 claves con paridad es\/en/);
});
