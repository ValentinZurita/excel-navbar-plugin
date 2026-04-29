import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = join(projectRoot, 'manifest.template.xml');
const placeholderToken = '__BASE_URL__';

function parseArg(flag) {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!match) {
    return null;
  }
  return match.slice(flag.length + 1);
}

function normalizeBaseUrl(rawValue) {
  if (!rawValue) {
    throw new Error('Missing base URL. Pass --base-url=<https-url> or set ADDIN_BASE_URL.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawValue);
  } catch {
    throw new Error(`Invalid base URL: "${rawValue}".`);
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error(`Base URL must use https. Received "${parsedUrl.protocol}".`);
  }

  parsedUrl.search = '';
  parsedUrl.hash = '';
  return parsedUrl.toString().replace(/\/$/, '');
}

function resolveOutputPath(rawOutputPath) {
  const target = rawOutputPath ?? 'manifest.xml';
  return isAbsolute(target) ? target : join(projectRoot, target);
}

function ensureTemplateLooksValid(templateContent) {
  const replacementCount = templateContent.split(placeholderToken).length - 1;

  if (replacementCount === 0) {
    throw new Error(`Template is missing placeholder token "${placeholderToken}".`);
  }
}

function main() {
  const baseUrlArg = parseArg('--base-url');
  const outputArg = parseArg('--output');
  const baseUrl = normalizeBaseUrl(baseUrlArg ?? process.env.ADDIN_BASE_URL ?? '');
  const outputPath = resolveOutputPath(outputArg);
  const templateContent = readFileSync(templatePath, 'utf8');

  ensureTemplateLooksValid(templateContent);

  const rendered = templateContent.replaceAll(placeholderToken, baseUrl);
  if (rendered.includes(placeholderToken)) {
    throw new Error(`Failed to replace all "${placeholderToken}" placeholders.`);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, rendered, 'utf8');

  console.log(`Manifest generated at ${outputPath}`);
  console.log(`Base URL: ${baseUrl}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
