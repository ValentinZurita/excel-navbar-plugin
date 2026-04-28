import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(scriptDir, '..');

/**
 * Ensures `.engram/` stays versioned and never listed in `.gitignore`.
 * Fails CI and `npm run quality` if someone removes Engram from the repo.
 */

function fail(message) {
  console.error(message);
  process.exit(1);
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

const gitignorePath = join(projectRoot, '.gitignore');
let gitignore;
try {
  gitignore = readFileSync(gitignorePath, 'utf8');
} catch {
  fail(`Could not read ${gitignorePath}`);
}

for (const rawLine of gitignore.split('\n')) {
  const line = rawLine.split('#')[0].trim();
  if (!line || line.startsWith('!')) {
    continue;
  }
  if (line.includes('.engram')) {
    fail(
      `.gitignore must not ignore .engram/ (remove the line that mentions .engram). Offending line:\n  ${rawLine.trim()}`,
    );
  }
}

let tracked;
try {
  tracked = git(['ls-files', '-z', '--', '.engram']).replace(/\0$/, '').split('\0').filter(Boolean);
} catch {
  fail('git ls-files failed (is this a git checkout?)');
}

if (tracked.length === 0) {
  fail(
    'No files under .engram/ are tracked. Restore .engram/ and commit it — do not git rm or leave the folder untracked.',
  );
}

const manifestInIndex = tracked.some((p) => p === '.engram/manifest.json');
if (!manifestInIndex) {
  fail('Tracked .engram/ must include .engram/manifest.json.');
}

console.log(`Engram protection OK (${tracked.length} tracked path(s) under .engram/).`);
