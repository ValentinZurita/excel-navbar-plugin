#!/usr/bin/env node

import { readFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(projectRoot, 'addin-config.json');

// Detect OS and set correct WEF folder
function getWefFolder() {
  const platform = process.platform;
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (platform === 'darwin') {
    // macOS
    return `${home}/Library/Containers/com.microsoft.Excel/Data/Documents/wef`;
  } else if (platform === 'win32') {
    // Windows
    return `${process.env.LOCALAPPDATA}\\Microsoft\\Office\\16.0\\Wef`;
  } else if (platform === 'linux') {
    // Linux (Office for Linux if exists)
    return `${home}/.config/Microsoft/Office/Wef`;
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

// Use a unique filename based on plugin name to avoid conflicts
const manifestFileName = 'excel-navbar-plugin.xml';
const wefFolder = getWefFolder();
const wefPath = `${wefFolder}/${manifestFileName}`;

const env = process.argv[2];

if (!env || (env !== 'dev' && env !== 'prod')) {
  console.error('❌ Usage: node scripts/switch-env.mjs [dev|prod]');
  process.exit(1);
}

// Read config
let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error(`❌ Failed to read config: ${error.message}`);
  process.exit(1);
}

const targetEnv = config[env];
if (!targetEnv) {
  console.error(`❌ Environment "${env}" not found in addin-config.json`);
  process.exit(1);
}

const baseUrl = targetEnv.baseUrl;

if (!baseUrl || baseUrl.includes('TU-URL-DE-PRODUCCION')) {
  console.error(`❌ Please update the ${env} URL in addin-config.json first!`);
  console.error(`   Edit: ${configPath}`);
  process.exit(1);
}

console.log(`🔄 Switching to ${env} environment...`);
console.log(`📍 Base URL: ${baseUrl}\n`);

// Generate manifest
try {
  execSync(
    `node scripts/render-manifest.mjs --base-url=${baseUrl} --output=excel-navbar-plugin.xml`,
    {
      cwd: projectRoot,
      stdio: 'inherit',
    },
  );
} catch {
  console.error('❌ Failed to generate manifest');
  process.exit(1);
}

// Copy to WEF folder
try {
  copyFileSync(join(projectRoot, 'excel-navbar-plugin.xml'), wefPath);
  console.log(`\n✅ Manifest copied to WEF folder`);
  console.log(`   Location: ${wefPath}`);
} catch (error) {
  console.error(`\n❌ Failed to copy to WEF folder: ${error.message}`);
  console.log(`📝 Please manually copy excel-navbar-plugin.xml to:`);
  console.log(`   ${wefPath}`);
}

console.log('\n⚠️  IMPORTANT: Restart Excel completely to see changes (Cmd+Q)');
console.log('');
