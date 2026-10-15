import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureLibraryFolders, getLibraryFolders } from './library-folders';

const isDirectory = async (dir: string) =>
    (await stat(dir).catch(() => null))?.isDirectory() ?? false;

describe('getLibraryFolders', () => {
    it('lays out roms, saves and states per platform', () => {
        const folders = getLibraryFolders('/lib');

        expect(folders.roms).toEqual({
            gb: '/lib/roms/gb',
            gbc: '/lib/roms/gbc',
            gba: '/lib/roms/gba',
        });
        expect(folders.saves.gba).toBe('/lib/saves/gba');
        expect(folders.states.gbc).toBe('/lib/states/gbc');
    });
});

describe('ensureLibraryFolders', () => {
    let root: string;

    beforeEach(async () => {
        root = path.join(
            await mkdtemp(path.join(tmpdir(), 'gutty-os-test-')),
            'gutty-os'
        );
    });

    afterEach(async () => {
        await rm(path.dirname(root), { recursive: true, force: true });
    });

    it('creates every library folder, including the root', async () => {
        const folders = await ensureLibraryFolders(root);

        const all = [folders.roms, folders.saves, folders.states].flatMap(
            (group) => Object.values(group)
        );
        expect(all).toHaveLength(9);
        for (const dir of all) {
            expect(await isDirectory(dir)).toBe(true);
        }
    });

    it('is safe to run again and keeps existing files', async () => {
        const folders = await ensureLibraryFolders(root);
        const rom = path.join(folders.roms.gba, 'Golden Sun.gba');
        await writeFile(rom, 'rom-bytes');

        await ensureLibraryFolders(root);

        expect(await readFile(rom, 'utf8')).toBe('rom-bytes');
    });
});
