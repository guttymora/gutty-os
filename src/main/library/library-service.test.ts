import { createHash } from 'node:crypto';
import {
    mkdir,
    mkdtemp,
    readFile,
    rm,
    stat,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureLibraryFolders, type LibraryFolders } from './library-folders';
import { LibraryService } from './library-service';

describe('LibraryService', () => {
    let sandbox: string;
    let folders: LibraryFolders;
    let romPath: string;

    beforeEach(async () => {
        sandbox = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
        folders = await ensureLibraryFolders(path.join(sandbox, 'gutty-os'));
        await mkdir(path.join(sandbox, 'Downloads'));
        romPath = path.join(sandbox, 'Downloads', 'Tetris.gb');
        await writeFile(romPath, 'tetris');
    });

    afterEach(async () => {
        await rm(sandbox, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('starts with the games from library.json', async () => {
        const service = await LibraryService.open(folders);

        expect(service.getGames()).toEqual([]);
    });

    it('imports a game and saves library.json', async () => {
        const service = await LibraryService.open(folders);

        const result = await service.importGame({
            path: romPath,
            kind: 'rom',
            platform: 'gb',
        });

        const id = createHash('sha1').update('tetris').digest('hex');
        expect(result).toMatchObject({ status: 'added', game: { id } });
        expect(service.getGames().map((game) => game.id)).toEqual([id]);
        const saved = JSON.parse(
            await readFile(path.join(folders.root, 'library.json'), 'utf8')
        );
        expect(saved.games[id].file).toBe('roms/gb/Tetris.gb');
    });

    it('runs one import at a time', async () => {
        const service = await LibraryService.open(folders);
        const rom = {
            path: romPath,
            kind: 'rom' as const,
            platform: 'gb' as const,
        };

        const [first, second] = await Promise.all([
            service.importGame(rom),
            service.importGame(rom),
        ]);

        expect(first.status).toBe('added');
        expect(second).toEqual({ status: 'error', reason: 'busy' });
    });

    it('refuses a staged file that is not a ROM', async () => {
        const service = await LibraryService.open(folders);

        expect(
            await service.importGame({ path: romPath, kind: 'save' })
        ).toEqual({ status: 'error', reason: 'file-not-found' });
    });

    it('reports a failed import and keeps the library unchanged', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const service = await LibraryService.open(folders);

        const result = await service.importGame({
            path: path.join(sandbox, 'Downloads', 'gone.gb'),
            kind: 'rom',
            platform: 'gb',
        });

        expect(result).toEqual({ status: 'error', reason: 'failed' });
        expect(service.getGames()).toEqual([]);
    });

    it('does not rewrite library.json for a duplicate', async () => {
        const service = await LibraryService.open(folders);
        await service.importGame({
            path: romPath,
            kind: 'rom',
            platform: 'gb',
        });
        const libraryFile = path.join(folders.root, 'library.json');
        const before = (await stat(libraryFile)).mtimeMs;
        const copyPath = path.join(sandbox, 'Downloads', 'Tetris copy.gb');
        await writeFile(copyPath, 'tetris');

        const result = await service.importGame({
            path: copyPath,
            kind: 'rom',
            platform: 'gb',
        });

        expect(result.status).toBe('duplicate');
        expect((await stat(libraryFile)).mtimeMs).toBe(before);
    });

    it('picks up ROMs added to roms/ by hand when it opens', async () => {
        const info = vi
            .spyOn(console, 'info')
            .mockImplementation(() => undefined);
        await writeFile(path.join(folders.roms.gba, 'Golden Sun.gba'), 'gs');

        const service = await LibraryService.open(folders);

        expect(service.getGames().map((game) => game.title)).toEqual([
            'Golden Sun',
        ]);
        const saved = JSON.parse(
            await readFile(path.join(folders.root, 'library.json'), 'utf8')
        );
        expect(Object.keys(saved.games)).toHaveLength(1);
        expect(info).toHaveBeenCalledWith(
            expect.stringContaining('Added from the library folder')
        );
    });

    it('does not log or save when a rescan finds nothing new', async () => {
        const info = vi
            .spyOn(console, 'info')
            .mockImplementation(() => undefined);
        const service = await LibraryService.open(folders);
        const libraryFile = path.join(folders.root, 'library.json');
        const before = (await stat(libraryFile)).mtimeMs;

        await service.rescan();

        expect(info).not.toHaveBeenCalled();
        expect((await stat(libraryFile)).mtimeMs).toBe(before);
    });
});
