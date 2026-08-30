import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: [
    // Referenced by landing page but not imported as a module
    'src/landing/main.js',
  ],
  ignoreDependencies: [
    // Used by vitest (vite.config.ts imports from vitest/config which uses vite)
    'vite',
    // Peer dependency used implicitly by @dnd-kit packages
    '@dnd-kit/utilities',
    // Loaded dynamically in webpack.config.js via require()
    'office-addin-dev-certs',
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
