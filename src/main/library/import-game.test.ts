import { createHash } from 'node:crypto';
import {
    chmod,
    mkdir,
    mkdtemp,
    readdir,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as hashing from './hash-file';
import { importGame } from './import-game';
import { createEmptyLibrary, type LibraryData } from './library-file';
import { ensureLibraryFolders, type LibraryFolders } from './library-folders';

const NOW = new Date('2026-10-13T12:00:00.000Z');
const sha1 = (contents: string) =>
    createHash('sha1').update(contents).digest('hex');

const exists = (filePath: string) =>
    readFile(filePath).then(
        () => true,
        () => false
    );

describe('importGame', () => {
    let sandbox: string;
    let source: string;
    let folders: LibraryFolders;

    const sourceFile = async (name: string, contents: string) => {
        const filePath = path.join(source, name);
        await writeFile(filePath, contents);
        return filePath;
    };

    beforeEach(async () => {
        sandbox = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
        source = path.join(sandbox, 'Downloads');
        await mkdir(source);
        folders = await ensureLibraryFolders(path.join(sandbox, 'gutty-os'));
    });

    afterEach(async () => {
        await rm(sandbox, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('moves the ROM into roms/<platform> and registers it', async () => {
        const romPath = await sourceFile('Pokemon Emerald.gba', 'emerald');

        const { library, result } = await importGame({
            folders,
            library: createEmptyLibrary(),
            rom: { path: romPath, platform: 'gba' },
            now: NOW,
        });

        const id = sha1('emerald');
        const destination = path.join(folders.roms.gba, 'Pokemon Emerald.gba');
        expect(await readFile(destination, 'utf8')).toBe('emerald');
        expect(await exists(romPath)).toBe(false);
        expect(library.games[id]).toMatchObject({
            platform: 'gba',
            file: 'roms/gba/Pokemon Emerald.gba',
            title: 'Pokemon Emerald',
            addedAt: NOW.toISOString(),
            size: 7,
            playTimeMinutes: 0,
            isFavorite: false,
            rating: 0,
            missing: false,
        });
        expect(result).toEqual({
            status: 'added',
            game: expect.objectContaining({ id, title: 'Pokemon Emerald' }),
            warnings: [],
        });
        // No temporary files left behind
        expect(await readdir(folders.roms.gba)).toEqual([
            'Pokemon Emerald.gba',
        ]);
    });

    it('moves the save to saves/<platform>, named after the ROM', async () => {
        const romPath = await sourceFile('Pokemon Emerald.gba', 'emerald');
        const savePath = await sourceFile('my backup.sav', 'progress');

        await importGame({
            folders,
            library: createEmptyLibrary(),
            rom: { path: romPath, platform: 'gba' },
            save: { path: savePath },
        });

        expect(
            await readFile(
                path.join(folders.saves.gba, 'Pokemon Emerald.sav'),
                'utf8'
            )
        ).toBe('progress');
        expect(await exists(savePath)).toBe(false);
    });

    it('leaves a duplicate where it is and changes nothing', async () => {
        const first = await importGame({
            folders,
            library: createEmptyLibrary(),
            rom: {
                path: await sourceFile('Tetris.gb', 'tetris'),
                platform: 'gb',
            },
        });
        const copyPath = await sourceFile('Tetris (copy).gb', 'tetris');

        const second = await importGame({
            folders,
            library: first.library,
            rom: { path: copyPath, platform: 'gb' },
        });

        expect(second.result).toMatchObject({
            status: 'duplicate',
            game: { id: sha1('tetris'), title: 'Tetris' },
        });
        expect(second.library).toBe(first.library);
        expect(await readFile(copyPath, 'utf8')).toBe('tetris');
        expect(await readdir(folders.roms.gb)).toEqual(['Tetris.gb']);
    });

    it('picks a free name when another game uses the same file name', async () => {
        const first = await importGame({
            folders,
            library: createEmptyLibrary(),
            rom: {
                path: await sourceFile('Tetris.gb', 'tetris v1.0'),
                platform: 'gb',
            },
        });
        const { library } = await importGame({
            folders,
            library: first.library,
            rom: {
                path: await sourceFile('Tetris.gb', 'tetris v1.1'),
                platform: 'gb',
            },
        });

        expect(library.games[sha1('tetris v1.1')].file).toBe(
            'roms/gb/Tetris (2).gb'
        );
        expect((await readdir(folders.roms.gb)).sort()).toEqual([
            'Tetris (2).gb',
            'Tetris.gb',
        ]);
    });

    it('never overwrites an existing save in the library', async () => {
        await writeFile(path.join(folders.saves.gb, 'Tetris.sav'), 'old save');
        const romPath = await sourceFile('Tetris.gb', 'tetris');
        const savePath = await sourceFile('Tetris.sav', 'new save');

        // "Tetris" is taken by the orphan save, so the game gets "Tetris (2)"
        const { library, result } = await importGame({
            folders,
            library: createEmptyLibrary(),
            rom: { path: romPath, platform: 'gb' },
            save: { path: savePath },
        });

        expect(library.games[sha1('tetris')].file).toBe(
            'roms/gb/Tetris (2).gb'
        );
        expect(
            await readFile(path.join(folders.saves.gb, 'Tetris.sav'), 'utf8')
        ).toBe('old save');
        expect(
            await readFile(
                path.join(folders.saves.gb, 'Tetris (2).sav'),
                'utf8'
            )
        ).toBe('new save');
        expect(result).toMatchObject({ status: 'added', warnings: [] });
    });

    it('restores a missing game with its stats and keeps its save', async () => {
        const id = sha1('emerald');
        await writeFile(
            path.join(folders.saves.gba, 'Pokemon Emerald.sav'),
            'old progress'
        );
        const library: LibraryData = {
            version: 1,
            games: {
                [id]: {
                    platform: 'gba',
                    file: 'roms/gba/Pokemon Emerald.gba',
                    title: 'Pokemon Emerald',
                    addedAt: '2026-01-01T00:00:00.000Z',
                    size: 7,
                    modifiedAt: '2026-01-01T00:00:00.000Z',
                    playTimeMinutes: 754,
                    isFavorite: true,
                    rating: 5,
                    missing: true,
                },
            },
        };

        const { library: updated, result } = await importGame({
            folders,
            library,
            rom: {
                path: await sourceFile('emerald-renamed.gba', 'emerald'),
                platform: 'gba',
            },
            save: { path: await sourceFile('emerald.sav', 'new progress') },
        });

        expect(updated.games[id]).toMatchObject({
            file: 'roms/gba/Pokemon Emerald.gba',
            playTimeMinutes: 754,
            isFavorite: true,
            missing: false,
        });
        expect(
            await readFile(
                path.join(folders.saves.gba, 'Pokemon Emerald.sav'),
                'utf8'
            )
        ).toBe('old progress');
        expect(result).toMatchObject({
            status: 'added',
            warnings: ['existing-save-kept'],
        });
    });

    it('still adds the game when the save cannot be imported', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const romPath = await sourceFile('Tetris.gb', 'tetris');

        const { result } = await importGame({
            folders,
            library: createEmptyLibrary(),
            rom: { path: romPath, platform: 'gb' },
            save: { path: path.join(source, 'vanished.sav') },
        });

        expect(result).toMatchObject({
            status: 'added',
            warnings: ['save-not-imported'],
        });
    });

    it('fails without touching the library when the ROM cannot be read', async () => {
        const library = createEmptyLibrary();

        await expect(
            importGame({
                folders,
                library,
                rom: { path: path.join(source, 'gone.gb'), platform: 'gb' },
            })
        ).rejects.toThrow();
        expect(await readdir(folders.roms.gb)).toEqual([]);
    });

    it('warns when the original file cannot be deleted', async () => {
        const romPath = await sourceFile('Tetris.gb', 'tetris');
        // A read-only folder lets us copy the file but not delete it
        await chmod(source, 0o555);

        try {
            const { result } = await importGame({
                folders,
                library: createEmptyLibrary(),
                rom: { path: romPath, platform: 'gb' },
            });

            expect(result).toMatchObject({
                status: 'added',
                warnings: ['original-not-removed'],
            });
            expect(await exists(romPath)).toBe(true);
        } finally {
            await chmod(source, 0o755);
        }
    });

    it('keeps the original when the copy does not match it', async () => {
        const romPath = await sourceFile('Tetris.gb', 'tetris');
        // The first hash is the source; the second (the copy) "differs"
        vi.spyOn(hashing, 'hashFile')
            .mockResolvedValueOnce(sha1('tetris'))
            .mockResolvedValueOnce('corrupted-copy');

        await expect(
            importGame({
                folders,
                library: createEmptyLibrary(),
                rom: { path: romPath, platform: 'gb' },
            })
        ).rejects.toThrow('does not match');
        expect(await readFile(romPath, 'utf8')).toBe('tetris');
        expect(await readdir(folders.roms.gb)).toEqual([]);
    });

    it('warns when the original save cannot be deleted', async () => {
        const romPath = await sourceFile('Tetris.gb', 'tetris');
        const saveFolder = path.join(sandbox, 'Saves');
        await mkdir(saveFolder);
        const savePath = path.join(saveFolder, 'Tetris.sav');
        await writeFile(savePath, 'progress');
        await chmod(saveFolder, 0o555);

        try {
            const { result } = await importGame({
                folders,
                library: createEmptyLibrary(),
                rom: { path: romPath, platform: 'gb' },
                save: { path: savePath },
            });

            expect(result).toMatchObject({
                status: 'added',
                warnings: ['save-original-not-removed'],
            });
        } finally {
            await chmod(saveFolder, 0o755);
        }
    });
});
