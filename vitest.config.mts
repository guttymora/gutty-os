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
        },
    })
);
