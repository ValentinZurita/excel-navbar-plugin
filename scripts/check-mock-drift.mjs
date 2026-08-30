import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(scriptDir, '..');

/**
 * Mock drift detection for Office.js APIs.
 *
 * Compares the Office.js / Excel.* APIs used in src/infrastructure/office/
 * against the mock implementations in tests/. If an API is used in source
 * but not referenced in any test mock, the tests may pass while the add-in
 * breaks in the real Excel host.
 *
 * This is a heuristic, not a guarantee. It catches obvious drift but
 * cannot verify that mocks behave identically to the real runtime.
 */

const SOURCE_DIR = join(projectRoot, 'src', 'infrastructure', 'office');
const TESTS_DIR = join(projectRoot, 'tests');

function listFilesRecursively(dir, result = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      listFilesRecursively(fullPath, result);
    } else if (/\.(ts|tsx|mjs)$/.test(entry)) {
      result.push(fullPath);
    }
  }
  return result;
}

function stripCommentsAndStrings(content) {
  // Remove single line comments
  let cleaned = content.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove template and string literals (including multiline)
  cleaned = cleaned.replace(/(['"`])(?:(?!\1|\\)[\s\S]|\\.)*\1/g, '');
  return cleaned;
}

function extractOfficeApis(content) {
  const apis = new Set();
  const cleaned = stripCommentsAndStrings(content);

  // Match arbitrary property access chains including optional chaining (Office.context?.requirements?.isSetSupported)
  const pattern = /(?:Office|Excel)(?:\??\.[a-zA-Z0-9_$]+)+/g;

  let match;
  while ((match = pattern.exec(cleaned)) !== null) {
    // Normalize optional chaining (?.) to standard dot access for matching test mocks
    let api = match[0].replace(/\?\./g, '.');
    // Strip standard JS function prototype wrappers
    api = api.replace(/\.(bind|call|apply)$/, '');
    apis.add(api);
  }

  return Array.from(apis);
}

// Collect source APIs.
const sourceApis = new Set();
const sourceFiles = [];

for (const filePath of listFilesRecursively(SOURCE_DIR)) {
  const content = readFileSync(filePath, 'utf8');
  const apis = extractOfficeApis(content);
  if (apis.length > 0) {
    sourceFiles.push({ file: relative(projectRoot, filePath), apis });
    for (const api of apis) {
      sourceApis.add(api);
    }
  }
}

// Collect test file contents.
const testFiles = listFilesRecursively(TESTS_DIR);
const testContent = testFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

// Check for drift: APIs in source but NOT mentioned in tests.
const drift = [];

for (const api of sourceApis) {
  // Simple heuristic: is the API name present anywhere in test files?
  // This includes mocks, type references, and comments.
  if (!testContent.includes(api)) {
    drift.push(api);
  }
}

console.log(
  `Office.js APIs used in ${relative(projectRoot, SOURCE_DIR)}/ (${sourceApis.size} unique):`,
);
for (const api of Array.from(sourceApis).sort()) {
  const inTests = testContent.includes(api) ? '✅' : '❌';
  console.log(`  ${inTests} ${api}`);
}

if (drift.length > 0) {
  console.error(`\nMock drift detected (${drift.length} APIs):`);
  for (const api of drift.sort()) {
    console.error(`  ❌ ${api} — used in source but not found in any test/mock`);
  }
  console.error(
    '\nThese APIs may be untested. Update test mocks to include them,\n' +
      'or add integration tests that exercise these paths.',
  );
  process.exit(1);
} else {
  console.log('\nMock drift check passed — all source APIs are referenced in tests.');
}
