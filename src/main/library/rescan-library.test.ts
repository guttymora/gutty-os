import { createHash } from 'node:crypto';
import {
    mkdtemp,
    readFile,
    rename,
    rm,
    utimes,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as hashing from './hash-file';
import { createEmptyLibrary, type LibraryData, toGames } from './library-file';
import { ensureLibraryFolders, type LibraryFolders } from './library-folders';
import { rescanLibrary } from './rescan-library';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const sha1 = (contents: string) =>
    createHash('sha1').update(contents).digest('hex');

const exists = (filePath: string) =>
    readFile(filePath).then(
        () => true,
        () => false
    );

describe('rescanLibrary', () => {
    let sandbox: string;
    let folders: LibraryFolders;

    /** Writes a file inside the library, e.g. at('roms/gb/Tetris.gb') */
    const at = (relativePath: string) => path.join(folders.root, relativePath);
    const put = (relativePath: string, contents: string) =>
        writeFile(at(relativePath), contents);

    const rescan = (library: LibraryData = createEmptyLibrary()) =>
        rescanLibrary({ folders, library, now: NOW });

    beforeEach(async () => {
        sandbox = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
        folders = await ensureLibraryFolders(path.join(sandbox, 'gutty-os'));
    });

    afterEach(async () => {
        await rm(sandbox, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('registers ROMs copied into roms/ by hand', async () => {
        await put('roms/gb/Tetris.gb', 'tetris');
        await put('roms/gba/Golden Sun.gba', 'golden sun');

        const { library, report } = await rescan();

        expect(report.added.sort()).toEqual([
            'roms/gb/Tetris.gb',
            'roms/gba/Golden Sun.gba',
        ]);
        expect(library.games[sha1('tetris')]).toMatchObject({
            platform: 'gb',
            file: 'roms/gb/Tetris.gb',
            title: 'Tetris',
            addedAt: NOW.toISOString(),
            size: 6,
            playTimeMinutes: 0,
            missing: false,
        });
    });

    it('does not re-hash files that have not changed', async () => {
        await put('roms/gb/Tetris.gb', 'tetris');
        const first = await rescan();
        const hashSpy = vi.spyOn(hashing, 'hashFile');

        const second = await rescan(first.library);

        expect(hashSpy).not.toHaveBeenCalled();
        // Nothing changed: same object, so library.json isn't rewritten
        expect(second.library).toBe(first.library);
    });

    it('follows a renamed ROM, keeping its stats, save and states', async () => {
        await put('roms/gba/Emerald.gba', 'emerald');
        const { library } = await rescan();
        const id = sha1('emerald');
        library.games[id] = { ...library.games[id], playTimeMinutes: 754 };
        await put('saves/gba/Emerald.sav', 'progress');
        await put('states/gba/Emerald.ss1', 'state');
        await rename(
            at('roms/gba/Emerald.gba'),
            at('roms/gba/Pokemon Emerald.gba')
        );

        const result = await rescan(library);

        expect(result.report.renamed).toEqual(['roms/gba/Pokemon Emerald.gba']);
        expect(result.library.games[id]).toMatchObject({
            file: 'roms/gba/Pokemon Emerald.gba',
            playTimeMinutes: 754,
        });
        expect(
            await readFile(at('saves/gba/Pokemon Emerald.sav'), 'utf8')
        ).toBe('progress');
        expect(await exists(at('states/gba/Pokemon Emerald.ss1'))).toBe(true);
        expect(await exists(at('saves/gba/Emerald.sav'))).toBe(false);
    });

    it("leaves a renamed ROM's save in place if the new name is taken", async () => {
        await put('roms/gb/Tetris.gb', 'tetris');
        const { library } = await rescan();
        await put('saves/gb/Tetris.sav', 'mine');
        await put('saves/gb/Tetris DX.sav', 'someone else');
        await rename(at('roms/gb/Tetris.gb'), at('roms/gb/Tetris DX.gb'));

        const { report } = await rescan(library);

        expect(report.saveConflicts).toEqual(['saves/gb/Tetris.sav']);
        expect(await readFile(at('saves/gb/Tetris.sav'), 'utf8')).toBe('mine');
        expect(await readFile(at('saves/gb/Tetris DX.sav'), 'utf8')).toBe(
            'someone else'
        );
    });

    it('marks games whose file is gone as missing, keeping their stats', async () => {
        await put('roms/gb/Tetris.gb', 'tetris');
        const { library } = await rescan();
        await rm(at('roms/gb/Tetris.gb'));

        const result = await rescan(library);

        expect(result.report.missing).toEqual(['roms/gb/Tetris.gb']);
        expect(result.library.games[sha1('tetris')]).toMatchObject({
            missing: true,
            title: 'Tetris',
        });
        expect(toGames(result.library)).toEqual([]);
    });

    it('restores a missing game when its file comes back', async () => {
        await put('roms/gb/Tetris.gb', 'tetris');
        const first = await rescan();
        await rm(at('roms/gb/Tetris.gb'));
        const second = await rescan(first.library);
        await put('roms/gb/Tetris.gb', 'tetris');

        const third = await rescan(second.library);

        expect(third.report.restored).toEqual(['roms/gb/Tetris.gb']);
        expect(third.library.games[sha1('tetris')].missing).toBe(false);
    });

    it('restores a missing game whose file comes back untouched', async () => {
        await put('roms/gb/Tetris.gb', 'tetris');
        const { library } = await rescan();
        const id = sha1('tetris');
        library.games[id] = { ...library.games[id], missing: true };

        const result = await rescan(library);

        expect(result.report.restored).toEqual(['roms/gb/Tetris.gb']);
        expect(result.library.games[id].missing).toBe(false);
    });

    it('moves saves mGBA left next to a ROM into saves/', async () => {
        await put('roms/gba/Emerald.gba', 'emerald');
        await put('roms/gba/Emerald.sav', 'progress');
        // A .sav without its ROM is left alone
        await put('roms/gba/Orphan.sav', 'orphan');

        const { report } = await rescan();

        expect(report.savesMoved).toEqual(['roms/gba/Emerald.sav']);
        expect(await readFile(at('saves/gba/Emerald.sav'), 'utf8')).toBe(
            'progress'
        );
        expect(await exists(at('roms/gba/Orphan.sav'))).toBe(true);
    });

    it('never overwrites a save that is already in saves/', async () => {
        await put('roms/gba/Emerald.gba', 'emerald');
        await put('roms/gba/Emerald.sav', 'newer?');
        await put('saves/gba/Emerald.sav', 'current');

        const { report } = await rescan();

        expect(report.saveConflicts).toEqual(['roms/gba/Emerald.sav']);
        expect(await readFile(at('saves/gba/Emerald.sav'), 'utf8')).toBe(
            'current'
        );
        expect(await exists(at('roms/gba/Emerald.sav'))).toBe(true);
    });

    it('ignores ROMs in the wrong platform folder', async () => {
        await put('roms/gba/Tetris.gb', 'tetris');

        const { library, report } = await rescan();

        expect(report.misplaced).toEqual(['roms/gba/Tetris.gb']);
        expect(library.games).toEqual({});
    });

    it('registers one copy of a ROM found twice', async () => {
        await put('roms/gb/Tetris.gb', 'tetris');
        await put('roms/gb/Tetris (copy).gb', 'tetris');

        const { library, report } = await rescan();

        expect(Object.keys(library.games)).toEqual([sha1('tetris')]);
        expect(report.added).toHaveLength(1);
        expect(report.duplicates).toHaveLength(1);
    });

    it('ignores hidden files, unfinished imports and other files', async () => {
        await put('roms/gb/.DS_Store', 'finder');
        await put('roms/gb/._Tetris.gb', 'apple double');
        await put('roms/gb/Tetris.gb.importing', 'half copied');
        await put('roms/gb/notes.txt', 'notes');

        const { library, report } = await rescan();

        expect(library.games).toEqual({});
        expect(report.added).toEqual([]);
    });

    it('treats a file whose contents changed as a different game', async () => {
        await put('roms/gb/Tetris.gb', 'tetris v1.0');
        const { library } = await rescan();
        await put('roms/gb/Tetris.gb', 'tetris v1.1');
        // A later write: same size, so only the new date gives it away
        const later = new Date('2026-10-16T08:00:00.000Z');
        await utimes(at('roms/gb/Tetris.gb'), later, later);

        const result = await rescan(library);

        expect(result.library.games[sha1('tetris v1.0')].missing).toBe(true);
        expect(result.library.games[sha1('tetris v1.1')]).toMatchObject({
            file: 'roms/gb/Tetris.gb',
            missing: false,
        });
    });

    it('updates the size and date of a touched file with the same contents', async () => {
        await put('roms/gb/Tetris.gb', 'tetris');
        const { library } = await rescan();
        const later = new Date('2026-10-16T08:00:00.000Z');
        await utimes(at('roms/gb/Tetris.gb'), later, later);

        const result = await rescan(library);

        expect(result.library).not.toBe(library);
        expect(result.library.games[sha1('tetris')].modifiedAt).toBe(
            later.toISOString()
        );
        expect(Object.values(result.report).flat()).toEqual([]);
    });

    it('copes with a platform folder that was deleted', async () => {
        await rm(folders.roms.gbc, { recursive: true });

        await expect(rescan()).resolves.toMatchObject({
            report: { added: [] },
        });
    });

    it('reports other errors reading a platform folder', async () => {
        await rm(folders.roms.gbc, { recursive: true });
        await writeFile(folders.roms.gbc, 'not a folder');

        await expect(rescan()).rejects.toThrow();
    });
});
