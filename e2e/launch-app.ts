import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
    _electron as electron,
    type ElectronApplication,
    type Page,
} from '@playwright/test';

const PROJECT_ROOT = path.resolve(__dirname, '..');

export type LaunchedApp = {
    app: ElectronApplication;
    window: Page;
};

/** A throwaway userData folder so tests never touch the real app settings */
export const createUserDataDir = () =>
    mkdtempSync(path.join(tmpdir(), 'gutty-os-e2e-'));

export const removeUserDataDir = (dir: string) =>
    rmSync(dir, { recursive: true, force: true });

/** Launches the built app (.vite/build/main.cjs via package.json "main") */
export const launchApp = async (userDataDir: string): Promise<LaunchedApp> => {
    const app = await electron.launch({
        args: [PROJECT_ROOT, `--user-data-dir=${userDataDir}`],
        cwd: PROJECT_ROOT,
    });
    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    return { app, window };
};

/** Skips the splash screen and waits for the library */
export const skipSplash = async (window: Page) => {
    await window.keyboard.press('Enter');
    await window
        .getByRole('img', { name: 'GuttyOS' })
        .waitFor({ state: 'detached' });
};
