#!/usr/bin/env node
/**
 * Lightweight secret leak prevention.
 * Scans staged files for common secret patterns and blocks commits
 * if any are found. This is a safety net, not a replacement for
 * proper secret management (e.g., git-secrets, detect-secrets).
 *
 * To bypass in emergencies: git commit --no-verify
 */

import { execSync } from 'node:child_process';
import process from 'node:process';

const PATTERNS = [
  // Generic high-entropy secrets
  /['"`]?(api[_-]?key|apikey|api_secret|secret[_-]?key|auth[_-]?token|access[_-]?token|private[_-]?key)['"]?\s*[:=]\s*['"`][a-zA-Z0-9_-]{16,}['"`]/i,
  // AWS keys
  /AKIA[0-9A-Z]{16}/,
  // Private keys
  /-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/,
  // GitHub tokens (classic and fine-grained)
  /ghp_[a-zA-Z0-9]{36}/,
  /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/,
  // Slack tokens
  /xox[baprs]-[a-zA-Z0-9-]+/,
  // Generic password assignments ( heuristic )
  /['"`]?password['"]?\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/i,
];

const ALLOWED_PATHS = [
  // Allow patterns in test fixtures and mock data
  /tests\//,
  /\.test\./,
  /scripts\/check-secrets\.mjs/,
];

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getStagedContent(filePath) {
  try {
    return execSync(`git show :"${filePath}"`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });
  } catch {
    return null;
  }
}

function isAllowedPath(filePath) {
  return ALLOWED_PATHS.some((pattern) => pattern.test(filePath));
}

function main() {
  const stagedFiles = getStagedFiles();
  let foundSecrets = false;

  for (const file of stagedFiles) {
    if (isAllowedPath(file)) {
      continue;
    }

    const content = getStagedContent(file);
    if (!content) {
      continue;
    }

    const lines = content.split('\n');
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      const line = lines[lineNumber];
      for (const pattern of PATTERNS) {
        if (pattern.test(line)) {
          console.error(`❌ Potential secret detected in ${file}:${lineNumber + 1}`);
          console.error(`   Pattern: ${pattern.source}`);
          console.error(`   Line: ${line.trim()}`);
          foundSecrets = true;
        }
      }
    }
  }

  if (foundSecrets) {
    console.error('');
    console.error('🚨 Commit blocked: potential secrets detected in staged files.');
    console.error('   If these are false positives, you can bypass with: git commit --no-verify');
    console.error('   Better yet: move secrets to .env files (already gitignored).');
    process.exit(1);
  }

  console.log('✅ No secrets detected in staged files.');
}

main();
