import { defineConfig } from '@playwright/test';

// E2E tests drive the real Electron app built by `electron-forge package`
// (.vite/build). Run them with `pnpm run test:e2e`.
export default defineConfig({
    testDir: './e2e',
    globalTeardown: './e2e/global-teardown.ts',
    // One Electron window at a time keeps window-level checks reliable
    workers: 1,
    fullyParallel: false,
    timeout: 30_000,
    expect: { timeout: 5_000 },
    reporter: [['list']],
    outputDir: 'test-results',
});
