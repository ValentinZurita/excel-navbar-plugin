import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(scriptDir, '..');

/**
 * Office.js API validation against manifest requirements.
 *
 * Scans src/ for usages of Office.* and Excel.* APIs and cross-checks
 * them against the requirement sets declared in excel-navbar-plugin.xml.
 *
 * This is a best-effort static check. It cannot catch runtime-only
 * APIs or conditional paths that depend on host capabilities.
 */

const MANIFEST_PATH = join(projectRoot, 'manifest.template.xml');
const SOURCE_ROOT = join(projectRoot, 'src');

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Parse requirement sets from manifest.
function parseManifestRequirements(manifestContent) {
  const sets = [];
  const setRegex = /<Set\s+Name="([^"]+)"\s+MinVersion="([^"]+)"/g;
  let match;
  while ((match = setRegex.exec(manifestContent)) !== null) {
    sets.push({ name: match[1], minVersion: match[2] });
  }
  return sets;
}

// List all .ts/.tsx files recursively.
function listSourceFiles(dir, result = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      listSourceFiles(fullPath, result);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      result.push(fullPath);
    }
  }
  return result;
}

// Extract Office.* and Excel.* member accesses from file content.
function extractOfficeApis(content) {
  const apis = new Set();

  // Office.context.document.settings
  // Office.addin.showAsTaskpane
  // Excel.run
  // Excel.Worksheet
  const patterns = [/Office\.(\w+(?:\.(\w+))?)/g, /Excel\.(\w+(?:\.(\w+))?)/g];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      apis.add(match[0]);
    }
  }

  return Array.from(apis);
}

// Known API → requirement set mappings (simplified, not exhaustive).
// These are the APIs we use that require specific ExcelApi versions.
const API_REQUIREMENT_MAP = {
  'Office.addin.onVisibilityModeChanged': { set: 'SharedRuntime', min: '1.1' },
  'Office.addin.showAsTaskpane': { set: 'SharedRuntime', min: '1.1' },
  'Office.addin.hide': { set: 'SharedRuntime', min: '1.1' },
  'Office.actions.associate': { set: 'SharedRuntime', min: '1.1' },
  'Office.context.document.settings': { set: 'ExcelApi', min: '1.1' },
  'Office.context.document.url': { set: 'ExcelApi', min: '1.1' },
  'Office.context.document.getFilePropertiesAsync': { set: 'ExcelApi', min: '1.5' },
  'Office.context.requirements.isSetSupported': { set: 'ExcelApi', min: '1.1' },
  'Office.context.officeTheme': { set: 'ExcelApi', min: '1.1' },
  'Excel.run': { set: 'ExcelApi', min: '1.1' },
  'Excel.Worksheet': { set: 'ExcelApi', min: '1.1' },
  'Excel.RequestContext': { set: 'ExcelApi', min: '1.1' },
  'Excel.WorksheetCollection': { set: 'ExcelApi', min: '1.1' },
  'Excel.WorksheetCustomProperty': { set: 'ExcelApi', min: '1.12' },
};

// Read manifest.
let manifestContent;
try {
  manifestContent = readFileSync(MANIFEST_PATH, 'utf8');
} catch {
  fail(`Could not read manifest: ${MANIFEST_PATH}`);
}

const manifestSets = parseManifestRequirements(manifestContent);
if (manifestSets.length === 0) {
  fail('No requirement sets found in excel-navbar-plugin.xml');
}

console.log('Manifest requirement sets:');
for (const s of manifestSets) {
  console.log(`  - ${s.name} ${s.minVersion}`);
}

// Collect all Office.js API usages.
const allApis = new Set();
const fileUsages = [];

for (const filePath of listSourceFiles(SOURCE_ROOT)) {
  const content = readFileSync(filePath, 'utf8');
  const apis = extractOfficeApis(content);
  if (apis.length > 0) {
    fileUsages.push({ file: relative(projectRoot, filePath), apis });
    for (const api of apis) {
      allApis.add(api);
    }
  }
}

// Check each API against manifest requirements.
const warnings = [];

for (const api of allApis) {
  const requirement = API_REQUIREMENT_MAP[api];
  if (!requirement) {
    // Unknown API — warn but don't fail (may be a newer API not in our map).
    warnings.push(`Unknown API (not mapped to requirement set): ${api}`);
    continue;
  }

  const manifestSet = manifestSets.find((s) => s.name === requirement.set);
  if (!manifestSet) {
    warnings.push(
      `API ${api} requires ${requirement.set} ${requirement.min}, but this set is NOT declared in excel-navbar-plugin.xml`,
    );
  }
}

console.log(`\nOffice.js APIs found in src/ (${allApis.size} unique):`);
for (const api of Array.from(allApis).sort()) {
  console.log(`  - ${api}`);
}

if (warnings.length > 0) {
  console.error('\nWarnings:');
  for (const w of warnings) {
    console.error(`  ⚠ ${w}`);
  }
  // For now, warnings don't fail the build — this is informational.
  // Upgrade to fail once the map is exhaustive.
  console.log('\nOffice.js API validation completed with warnings.');
} else {
  console.log('\nOffice.js API validation passed.');
}
