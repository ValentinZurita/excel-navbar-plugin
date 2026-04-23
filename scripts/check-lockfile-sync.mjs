import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(scriptDir, '..');

/**
 * Lockfile sync check.
 *
 * Verifies that package-lock.json is in sync with package.json.
 * npm ci does this implicitly, but an explicit gate makes the
 * failure reason obvious in CI logs.
 */

function fail(message) {
  console.error(message);
  process.exit(1);
}

const pkgPath = join(projectRoot, 'package.json');
const lockPath = join(projectRoot, 'package-lock.json');

let pkg;
let lock;
try {
  pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
} catch {
  fail(`Could not read ${pkgPath}`);
}

try {
  lock = JSON.parse(readFileSync(lockPath, 'utf8'));
} catch {
  fail(`Could not read ${lockPath}. Run 'npm install' to generate it.`);
}

const pkgDeps = Object.keys(pkg.dependencies ?? {});
const pkgDevDeps = Object.keys(pkg.devDependencies ?? {});
const lockPackages = lock.packages ?? {};

const missing = [];

for (const dep of [...pkgDeps, ...pkgDevDeps]) {
  const rootKey = `node_modules/${dep}`;
  if (!lockPackages[rootKey]) {
    missing.push(dep);
  }
}

if (missing.length > 0) {
  fail(
    `Lockfile is out of sync with package.json. Missing entries:\n` +
      missing.map((d) => `  - ${d}`).join('\n') +
      `\n\nRun 'npm install' to regenerate package-lock.json.`,
  );
}

console.log('Lockfile sync check passed.');
