const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// Resolver configuration for monorepo
config.resolver = {
  ...config.resolver,

  // Let Metro know where to find node_modules
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
  ],

  // Map @expenses/shared to the shared package
  // Point to package root so Metro can resolve package.json exports
  extraNodeModules: {
    '@expenses/shared': path.resolve(monorepoRoot, 'packages/shared'),
  },

  // Prevent picking up wrong node_modules (e.g., from desktop)
  blockList: [
    /packages\/desktop\/node_modules\/.*/,
    /packages\/shared\/node_modules\/.*/,
  ],

  // Don't use hierarchical lookup to reduce module duplication
  disableHierarchicalLookup: true,
};

module.exports = config;
