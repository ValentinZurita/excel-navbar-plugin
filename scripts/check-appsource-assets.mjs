import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = join(projectRoot, 'dist');

function fail(message) {
  console.error(`AppSource asset check failed: ${message}`);
  process.exit(1);
}

function requireBaseUrl() {
  const rawBaseUrl = process.env.ADDIN_BASE_URL ?? '';
  if (!rawBaseUrl) {
    fail('Missing ADDIN_BASE_URL. Set it to the production add-in base URL.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawBaseUrl);
  } catch {
    fail(`Invalid ADDIN_BASE_URL: "${rawBaseUrl}".`);
  }

  parsedUrl.search = '';
  parsedUrl.hash = '';
  return parsedUrl.toString().replace(/\/$/, '');
}

function requireNonEmptyDistFile(relativePath) {
  const filePath = join(distDir, relativePath);
  if (!existsSync(filePath)) {
    fail(`Missing required dist asset: dist/${relativePath}.`);
  }

  const stats = statSync(filePath);
  if (!stats.isFile() || stats.size === 0) {
    fail(`Required dist asset is empty or not a file: dist/${relativePath}.`);
  }

  return readFileSync(filePath, 'utf8');
}

function requireIndexLinks(indexHtml) {
  for (const page of ['privacy.html', 'terms.html', 'support.html']) {
    if (!indexHtml.includes(`href="${page}"`) && !indexHtml.includes(`href='${page}'`)) {
      fail(`dist/index.html must link to ${page}.`);
    }
  }
}

function requireSupportUrl(manifestXml, expectedSupportUrl) {
  const supportUrlMatch = manifestXml.match(/<SupportUrl\b[^>]*\bDefaultValue="([^"]+)"[^>]*\/>/u);
  if (!supportUrlMatch) {
    fail('dist/excel-navbar-plugin.xml is missing a SupportUrl DefaultValue.');
  }

  const actualSupportUrl = supportUrlMatch[1];
  if (actualSupportUrl !== expectedSupportUrl) {
    fail(
      `Manifest SupportUrl mismatch. Expected "${expectedSupportUrl}" but found "${actualSupportUrl}".`,
    );
  }
}

const baseUrl = requireBaseUrl();
const expectedSupportUrl = `${baseUrl}/support.html`;

requireNonEmptyDistFile('privacy.html');
requireNonEmptyDistFile('terms.html');
requireNonEmptyDistFile('support.html');
requireNonEmptyDistFile('legal.css');
const indexHtml = requireNonEmptyDistFile('index.html');
const manifestXml = requireNonEmptyDistFile('excel-navbar-plugin.xml');

requireIndexLinks(indexHtml);
requireSupportUrl(manifestXml, expectedSupportUrl);

console.log('AppSource asset check passed.');
