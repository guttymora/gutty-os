import {
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

import {
    createEmptyLibrary,
    LIBRARY_FILE_NAME,
    type LibraryData,
    type LibraryRecord,
    loadLibrary,
    saveLibrary,
    toGames,
} from './library-file';

const EMERALD_ID = 'f3ae088181bf583e55daf962a92bb46f4f1d07b7';

const emerald: LibraryRecord = {
    platform: 'gba',
    file: 'roms/gba/Pokemon Emerald.gba',
    title: 'Pokemon Emerald',
    addedAt: '2026-10-13T10:12:00.000Z',
    size: 16_777_216,
    modifiedAt: '2026-09-23T09:54:00.000Z',
    lastPlayedAt: '2026-10-13T21:40:00.000Z',
    playTimeMinutes: 754,
    isFavorite: true,
    rating: 5,
    missing: false,
};

describe('library.json', () => {
    let root: string;
    let filePath: string;

    beforeEach(async () => {
        root = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
        filePath = path.join(root, LIBRARY_FILE_NAME);
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    const writeRaw = (content: unknown) =>
        writeFile(
            filePath,
            typeof content === 'string' ? content : JSON.stringify(content)
        );

    it('creates an empty library.json when there is none', async () => {
        const library = await loadLibrary(root);

        expect(library).toEqual(createEmptyLibrary());
        expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual({
            version: 1,
            games: {},
        });
    });

    it('round-trips games through saveLibrary and loadLibrary', async () => {
        const library: LibraryData = {
            version: 1,
            games: { [EMERALD_ID]: emerald },
        };

        await saveLibrary(root, library);

        expect(await loadLibrary(root)).toEqual(library);
    });

    it('skips invalid entries and keeps the valid ones', async () => {
        await writeRaw({
            version: 1,
            games: {
                [EMERALD_ID]: emerald,
                broken: { ...emerald, platform: 'nes' },
                noTitle: { ...emerald, title: '' },
                badRating: { ...emerald, rating: 9 },
                notAnObject: 'oops',
            },
        });

        const library = await loadLibrary(root);

        expect(Object.keys(library.games)).toEqual([EMERALD_ID]);
    });

    it('keeps a corrupted file aside and starts a new library', async () => {
        await writeRaw('{ not json');

        const library = await loadLibrary(root);

        expect(library).toEqual(createEmptyLibrary());
        const files = await readdir(root);
        const backup = files.find((file) =>
            file.startsWith('library.unreadable-')
        );
        expect(backup).toBeDefined();
        expect(await readFile(path.join(root, backup as string), 'utf8')).toBe(
            '{ not json'
        );
    });

    it('does not load a library from an unknown version', async () => {
        await writeRaw({ version: 2, games: { [EMERALD_ID]: emerald } });

        const library = await loadLibrary(root);

        expect(library).toEqual(createEmptyLibrary());
        expect(
            (await readdir(root)).some((file) =>
                file.startsWith('library.unreadable-')
            )
        ).toBe(true);
    });

    it('reports read errors other than a missing file', async () => {
        await mkdir(filePath);

        await expect(loadLibrary(root)).rejects.toThrow();
    });
});

describe('toGames', () => {
    it('gives the renderer games without file paths', () => {
        const [game] = toGames({
            version: 1,
            games: { [EMERALD_ID]: emerald },
        });

        expect(game).toEqual({
            id: EMERALD_ID,
            title: 'Pokemon Emerald',
            platform: 'gba',
            rating: 5,
            playTimeMinutes: 754,
            isFavorite: true,
            addedAt: '2026-10-13T10:12:00.000Z',
            lastPlayedAt: '2026-10-13T21:40:00.000Z',
        });
        expect(JSON.stringify(game)).not.toContain('roms/');
    });

    it('leaves out games whose file is missing', () => {
        const games = toGames({
            version: 1,
            games: {
                [EMERALD_ID]: emerald,
                gone: { ...emerald, missing: true },
            },
        });

        expect(games.map((game) => game.id)).toEqual([EMERALD_ID]);
    });
});
