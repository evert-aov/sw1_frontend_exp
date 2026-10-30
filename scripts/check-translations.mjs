import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Ejecuta únicamente los diccionarios locales, sin producir archivos compilados.
const cache = new Map();
function readDictionary(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const output = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const localRequire = (name) => {
    if (!name.startsWith('./')) throw new Error(`Importación no local: ${name}`);
    return readDictionary(path.resolve(path.dirname(file), `${name}.ts`));
  };
  new Function('exports', 'require', 'module', code)(output.exports, localRequire, output);
  cache.set(file, output.exports);
  return output.exports;
}
function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}

const { translations } = readDictionary('src/app/core/i18n/translations.ts');
const keys = new Set([...Object.keys(translations.es), ...Object.keys(translations.en)]);
const failures = new Set();
for (const key of keys) {
  for (const lang of ['es', 'en']) {
    if (!translations[lang][key]?.trim()) failures.add(`${lang}: falta ${key}`);
  }
}
let templates = 0;
let inlineTemplates = 0;
for (const file of filesIn('src/app')) {
  if (file.endsWith('.spec.ts') || file.includes(`${path.sep}i18n${path.sep}`)) continue;
  const source = fs.readFileSync(file, 'utf8');
  const expressions = [];
  if (file.endsWith('.html')) {
    templates++;
    // Incluye claves en ternarios; las expresiones de bindings usan comillas dobles.
    expressions.push(...source.matchAll(/'([A-Za-z]+(?:\.[\w]+)+)'/g));
  } else if (file.endsWith('.ts')) {
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (
        ts.isPropertyAssignment(node) &&
        node.name.getText(parsed) === 'template' &&
        (ts.isStringLiteral(node.initializer) ||
          ts.isNoSubstitutionTemplateLiteral(node.initializer))
      ) {
        inlineTemplates++;
        expressions.push(...node.initializer.text.matchAll(/'([A-Za-z]+(?:\\.[\\w]+)+)'/g));
      }
      ts.forEachChild(node, visit);
    }
    visit(parsed);

    expressions.push(
      ...source.matchAll(/(?:\.translate\(\s*|(?:labelKey|descKey|titleKey):\s*)'([^']+)'/g),
    );
  }
  for (const match of expressions) {
    for (const lang of ['es', 'en']) {
      if (!translations[lang][match[1]]) failures.add(`${file}: falta ${lang}:${match[1]}`);
    }
  }
}
if (failures.size) {
  console.error([...failures].join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `${keys.size} claves con paridad es/en; ${templates} plantillas externas + ${inlineTemplates} inline y claves estáticas de TypeScript verificadas.`,
  );
  console.log(
    'Las claves construidas dinámicamente y los textos del servidor requieren revisión adicional.',
  );
}
