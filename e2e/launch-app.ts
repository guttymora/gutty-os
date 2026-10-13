import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
    _electron as electron,
    type ElectronApplication,
    type Page,
} from '@playwright/test';

import { MOCK_GAMES } from '../src/renderer/data/mock-games';

const PROJECT_ROOT = path.resolve(__dirname, '..');

export type LaunchedApp = {
    app: ElectronApplication;
    window: Page;
};

/** Game library used by the tests, inside the throwaway userData folder */
export const getTestLibraryPath = (userDataDir: string) =>
    path.join(userDataDir, 'library');

/**
 * A throwaway userData folder so tests never touch the real app settings.
 * Its settings.json points the game library inside it, so tests never
 * create ~/gutty-os either.
 */
export const createUserDataDir = () => {
    const userDataDir = mkdtempSync(path.join(tmpdir(), 'gutty-os-e2e-'));
    writeFileSync(
        path.join(userDataDir, 'settings.json'),
        JSON.stringify({
            version: 1,
            libraryPath: getTestLibraryPath(userDataDir),
        })
    );

    seedLibrary(getTestLibraryPath(userDataDir));

    return userDataDir;
};

/** Writes a library.json with the sample games, so the UI has games to show */
const seedLibrary = (libraryPath: string) => {
    const games = Object.fromEntries(
        MOCK_GAMES.map((game) => [
            game.id,
            {
                platform: game.platform,
                file: `roms/${game.platform}/${game.title}.${game.platform}`,
                title: game.title,
                addedAt: game.addedAt,
                size: 1,
                modifiedAt: game.addedAt,
                lastPlayedAt: game.lastPlayedAt,
                playTimeMinutes: game.playTimeMinutes,
                isFavorite: game.isFavorite,
                rating: game.rating,
                missing: false,
            },
        ])
    );
    mkdirSync(libraryPath, { recursive: true });
    writeFileSync(
        path.join(libraryPath, 'library.json'),
        JSON.stringify({ version: 1, games })
    );
};

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
