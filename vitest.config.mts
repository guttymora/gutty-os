import { defineConfig, mergeConfig } from 'vitest/config';

import rendererConfig from './vite.renderer.config.mts';

export default mergeConfig(
    rendererConfig,
    defineConfig({
        test: {
            // Default environment stays 'node' so plain-logic tests remain fast.
            // Component tests opt into jsdom per-file via a
            // `// @vitest-environment jsdom` docblock at the top of the file.
            environment: 'node',
            include: ['src/**/*.test.{ts,tsx}'],
            setupFiles: ['./vitest.setup.ts'],
            coverage: {
                provider: 'v8',
                include: ['src/**/*.{ts,tsx}'],
                exclude: [
                    'src/**/*.test.{ts,tsx}',
                    'src/**/*.d.ts',
                    // Entry points only bootstrap the app; covered by E2E
                    'src/main.ts',
                    'src/renderer/main.tsx',
                ],
                reporter: ['text', 'html'],
                reportsDirectory: 'coverage',
                // Baseline is 100% lines/functions and ~96.7% branches; fail
                // on any real drop while leaving room for a stray branch
                thresholds: {
                    statements: 98,
                    branches: 95,
                    functions: 98,
                    lines: 98,
                },
            },
        },
    })
);
