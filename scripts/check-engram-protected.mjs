#!/usr/bin/env node
/**
 * Engram directory protection check.
 *
 * Ensures that the .engram/ directory is never ignored via .gitignore
 * or untracked/deleted from the repository unless explicitly authorized.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(scriptDir, '..');

function fail(message) {
  console.error(`❌ Engram Protection Check Failed:\n${message}\n`);
  process.exit(1);
}

// 1. Verify .gitignore does not ignore .engram
const gitignorePath = join(projectRoot, '.gitignore');
if (existsSync(gitignorePath)) {
  const gitignoreContent = readFileSync(gitignorePath, 'utf8');
  const lines = gitignoreContent.split('\n').map((l) => l.trim());

  for (const line of lines) {
    if (line.startsWith('#') || !line) continue;
    const cleanLine = line.split('#')[0].trim();
    if (/(?:^|\/|\*)\.engram(?:\/|$|\*)/.test(cleanLine) || cleanLine.includes('.engram')) {
      fail(
        `.gitignore contains an entry ignoring engram: "${line}".\n` +
          `Rule violation: Never add .engram/ to .gitignore.`,
      );
    }
  }
}

// 2. Check if git status shows deletion or untracking of .engram files
try {
  const statusOutput = execSync('git status --porcelain', {
    encoding: 'utf8',
    cwd: projectRoot,
  });

  const statusLines = statusOutput.trim().split('\n').filter(Boolean);
  for (const line of statusLines) {
    const status = line.slice(0, 2);
    const filePath = line.slice(3).trim();

    if (filePath.startsWith('.engram/') || filePath === '.engram') {
      if (status.includes('D')) {
        fail(
          `Detected deletion of engram file: ${filePath}.\n` +
            `Rule violation: Never remove or delete files in .engram/ without explicit authorization.`,
        );
      }
    }
  }
} catch {
  // If git command fails (e.g., shallow clone or non-git environment), ignore status check
}

console.log('✅ Engram protection check passed (.engram is protected and not ignored).');
process.exit(0);
