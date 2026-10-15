import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    getDefaultSettings,
    loadSettings,
    SETTINGS_FILE_NAME,
} from './settings';

const HOME = '/Users/player';

describe('loadSettings', () => {
    let userDataDir: string;
    let settingsPath: string;

    beforeEach(async () => {
        userDataDir = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
        settingsPath = path.join(userDataDir, SETTINGS_FILE_NAME);
    });

    afterEach(async () => {
        await rm(userDataDir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('defaults the library to ~/gutty-os', () => {
        expect(getDefaultSettings(HOME).libraryPath).toBe(
            '/Users/player/gutty-os'
        );
    });

    it('creates settings.json with the defaults on first launch', async () => {
        const settings = await loadSettings(userDataDir, HOME);

        expect(settings).toEqual(getDefaultSettings(HOME));
        expect(JSON.parse(await readFile(settingsPath, 'utf8'))).toEqual(
            getDefaultSettings(HOME)
        );
    });

    it('uses the saved library path', async () => {
        await writeFile(
            settingsPath,
            JSON.stringify({ version: 1, libraryPath: '/Users/player/Games' })
        );

        const settings = await loadSettings(userDataDir, HOME);

        expect(settings.libraryPath).toBe('/Users/player/Games');
    });

    it('falls back to the default for an invalid library path', async () => {
        await writeFile(
            settingsPath,
            JSON.stringify({ version: 1, libraryPath: 'relative/path' })
        );

        const settings = await loadSettings(userDataDir, HOME);

        expect(settings.libraryPath).toBe('/Users/player/gutty-os');
    });

    it('uses the defaults for an unreadable file without overwriting it', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        await writeFile(settingsPath, '{broken json');

        const settings = await loadSettings(userDataDir, HOME);

        expect(settings).toEqual(getDefaultSettings(HOME));
        expect(await readFile(settingsPath, 'utf8')).toBe('{broken json');
    });

    it('reports read errors other than a missing file', async () => {
        // A folder where the file should be makes the read fail (EISDIR)
        await mkdir(settingsPath);

        await expect(loadSettings(userDataDir, HOME)).rejects.toThrow();
    });
});
