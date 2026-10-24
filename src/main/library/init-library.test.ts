import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initLibrary } from './init-library';

describe('initLibrary', () => {
    let sandbox: string;
    let userDataDir: string;
    let homeDir: string;

    beforeEach(async () => {
        sandbox = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
        userDataDir = path.join(sandbox, 'userData');
        homeDir = path.join(sandbox, 'home');
    });

    afterEach(async () => {
        await rm(sandbox, { recursive: true, force: true });
    });

    it('creates ~/gutty-os with its folders on first launch', async () => {
        const { settings, folders } = await initLibrary(userDataDir, homeDir);

        expect(settings.libraryPath).toBe(path.join(homeDir, 'gutty-os'));
        expect((await stat(folders.roms.gba)).isDirectory()).toBe(true);
    });

    it('uses the library folder saved in the settings', async () => {
        const customLibrary = path.join(sandbox, 'my-games');
        await mkdir(userDataDir, { recursive: true });
        await writeFile(
            path.join(userDataDir, 'settings.json'),
            JSON.stringify({ version: 1, libraryPath: customLibrary })
        );

        const { folders } = await initLibrary(userDataDir, homeDir);

        expect(folders.root).toBe(customLibrary);
        // The default location is not created when another one is configured
        await expect(stat(path.join(homeDir, 'gutty-os'))).rejects.toThrow();
        expect((await stat(folders.saves.gb)).isDirectory()).toBe(true);
    });
});
