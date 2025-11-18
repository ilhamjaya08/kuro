#!/usr/bin/env bun

import { $ } from 'bun';
import { existsSync, mkdirSync } from 'fs';

const PLATFORMS = [
  { os: 'linux', arch: 'x64', target: 'bun-linux-x64' },
  { os: 'linux', arch: 'arm64', target: 'bun-linux-aarch64' },
  { os: 'darwin', arch: 'x64', target: 'bun-darwin-x64' },
  { os: 'darwin', arch: 'arm64', target: 'bun-darwin-aarch64' },
  { os: 'windows', arch: 'x64', target: 'bun-windows-x64' }
];

if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

console.log('Building Kuro for all platforms...\n');

for (const platform of PLATFORMS) {
  const outputName = platform.os === 'windows'
    ? `kuro-${platform.os}-${platform.arch}.exe`
    : `kuro-${platform.os}-${platform.arch}`;

  const outputPath = `dist/${outputName}`;

  console.log(`Building for ${platform.os}-${platform.arch}...`);

  try {
    await $`bun build src/index.ts --compile --target=${platform.target} --outfile=${outputPath}`;
    console.log(`✓ Built ${outputName}\n`);
  } catch (error) {
    console.error(`✗ Failed to build ${outputName}:`, error);
  }
}

console.log('Build complete! Binaries are in the dist/ directory.');
