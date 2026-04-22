function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalizeBaseUrl(value) {
  if (!value) {
    fail('Missing ADDIN_BASE_URL. Example: ADDIN_BASE_URL=https://addins.example.com npm run package:release');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    fail(`Invalid ADDIN_BASE_URL: "${value}"`);
  }

  if (parsedUrl.protocol !== 'https:') {
    fail(`ADDIN_BASE_URL must use https. Received "${parsedUrl.protocol}"`);
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) {
    fail('ADDIN_BASE_URL cannot point to localhost for release packaging.');
  }

  return parsedUrl.toString().replace(/\/$/, '');
}

const baseUrl = normalizeBaseUrl(process.env.ADDIN_BASE_URL ?? '');
console.log(`Release check passed. ADDIN_BASE_URL=${baseUrl}`);
