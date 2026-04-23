import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(scriptDir, '..');

const sourceRoots = [join(projectRoot, 'src'), join(projectRoot, 'tests')];

const targetExtensions = new Set(['.ts', '.tsx']);

function listFilesRecursively(dirPath, result = []) {
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') {
        continue;
      }

      listFilesRecursively(fullPath, result);
      continue;
    }

    const ext = fullPath.slice(fullPath.lastIndexOf('.'));
    if (targetExtensions.has(ext)) {
      result.push(fullPath);
    }
  }

  return result;
}

function extractImportSources(fileContent) {
  const sources = [];
  const importFromRegex = /from\s+['"]([^'"]+)['"]/g;
  const sideEffectImportRegex = /import\s+['"]([^'"]+)['"]/g;
  const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const regex of [importFromRegex, sideEffectImportRegex, dynamicImportRegex]) {
    let match = regex.exec(fileContent);
    while (match) {
      sources.push(match[1]);
      match = regex.exec(fileContent);
    }
  }

  return sources;
}

function normalizeImportPath(source) {
  return source.replace(/\\/g, '/');
}

function isInvalidComponentImport(source) {
  const normalized = normalizeImportPath(source);
  const marker = '/components/';
  const markerIndex = normalized.lastIndexOf(marker);

  if (markerIndex === -1) {
    return false;
  }

  const tail = normalized.slice(markerIndex + marker.length);
  const parts = tail.split('/').filter(Boolean);

  return parts.length > 1;
}

const violations = [];

for (const root of sourceRoots) {
  for (const filePath of listFilesRecursively(root)) {
    const content = readFileSync(filePath, 'utf8');
    const importSources = extractImportSources(content);

    for (const source of importSources) {
      if (isInvalidComponentImport(source)) {
        violations.push({
          file: relative(projectRoot, filePath),
          source,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Component import architecture violations found:');
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.source}`);
  }
  console.error('Use folder-level imports, for example: ../../components/Section');
  process.exit(1);
}

console.log('Component import architecture check passed.');
