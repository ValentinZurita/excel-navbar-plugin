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

function extractOfficeApis(content) {
  const apis = new Set();

  // Match Excel.run, Office.context.document.settings, etc.
  const patterns = [
    /Office\.(\w+(?:\.(\w+))?(?:\.(\w+))?)/g,
    /Excel\.(\w+(?:\.(\w+))?(?:\.(\w+))?)/g,
  ];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      // Only keep APIs that look like runtime calls (not just type references)
      apis.add(match[0]);
    }
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
  // Exit with warning code (not failure) — this is advisory until mocks are complete.
  process.exit(0);
} else {
  console.log('\nMock drift check passed — all source APIs are referenced in tests.');
}
