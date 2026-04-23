import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/taskpane/index.tsx'],
  ignore: [
    'tests/**',
    'scripts/**',
    '*.config.ts',
    '*.config.mjs',
    '*.config.js',
    'src/global.d.ts',
  ],
  ignoreDependencies: [
    // Used by vitest (vite.config.ts imports from vitest/config which uses vite)
    'vite',
    // Peer dependency used implicitly by @dnd-kit packages
    '@dnd-kit/utilities',
    // Used by @testing-library/react implicitly
    '@testing-library/dom',
    // Type packages
    '@types/office-js',
    '@types/react',
    '@types/react-dom',
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
