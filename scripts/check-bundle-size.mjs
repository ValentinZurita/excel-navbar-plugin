import { statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(scriptDir, '..');

/**
 * Bundle size gate for the Office Add-in task pane.
 *
 * The task pane runs inside Excel's webview, so bundle size directly
 * impacts cold-start time and memory usage. This gate fails the build
 * if the main JS bundle exceeds the threshold.
 */

const BUNDLE_PATH = join(projectRoot, 'dist', 'taskpane.js');
// Current baseline: ~393 KiB (as of 2026-05-02)
// Threshold set at 450 KiB to allow ~15% headroom for normal growth.
// TODO: Investigate bundle optimizations (see docs/tech/bundle-audit.md)
const MAX_SIZE_KIB = 450;

function formatSize(bytes) {
  const KiB = bytes / 1024;
  return `${KiB.toFixed(1)} KiB`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

let stats;
try {
  stats = statSync(BUNDLE_PATH);
} catch {
  fail(`Bundle not found: ${BUNDLE_PATH}\nRun 'npm run build' first.`);
}

const maxBytes = MAX_SIZE_KIB * 1024;

console.log(`Bundle size: ${formatSize(stats.size)} (limit: ${MAX_SIZE_KIB} KiB)`);

if (stats.size > maxBytes) {
  const over = formatSize(stats.size - maxBytes);
  fail(
    `Bundle size gate failed: ${formatSize(stats.size)} exceeds limit of ${MAX_SIZE_KIB} KiB by ${over}\n` +
      `To fix: reduce dependencies, split code, or audit imports.`,
  );
}

console.log('Bundle size gate passed.');
