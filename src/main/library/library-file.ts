import { readFile, rename } from 'node:fs/promises';
import path from 'node:path';

import { type Game, type Platform, PLATFORM_IDS } from '@shared/game';

import { writeJsonAtomic } from '../utils/write-json-atomic';

export const LIBRARY_FILE_NAME = 'library.json';
export const LIBRARY_VERSION = 1;

/** One game in library.json. Paths stay in the main process. */
export type LibraryRecord = {
    platform: Platform;
    /** ROM path relative to the library root, with "/" separators */
    file: string;
    title: string;
    /** ISO 8601 timestamp */
    addedAt: string;
    /** ROM size in bytes and last modification, to spot changed files */
    size: number;
    modifiedAt: string;
    /** ISO 8601 timestamp */
    lastPlayedAt?: string;
    playTimeMinutes: number;
    isFavorite: boolean;
    /** 0 to 5 stars */
    rating: number;
    /** The ROM file is gone (kept so its stats come back with the file) */
    missing: boolean;
};

export type LibraryData = {
    version: typeof LIBRARY_VERSION;
    /** Keyed by the ROM's SHA-1 */
    games: Record<string, LibraryRecord>;
};

export const createEmptyLibrary = (): LibraryData => ({
    version: LIBRARY_VERSION,
    games: {},
});

const isString = (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0;

const isCount = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0;

export const isLibraryRecord = (value: unknown): value is LibraryRecord => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const record = value as Record<string, unknown>;

    return (
        PLATFORM_IDS.includes(record.platform as Platform) &&
        isString(record.file) &&
        isString(record.title) &&
        isString(record.addedAt) &&
        isCount(record.size) &&
        isString(record.modifiedAt) &&
        (record.lastPlayedAt === undefined || isString(record.lastPlayedAt)) &&
        isCount(record.playTimeMinutes) &&
        typeof record.isFavorite === 'boolean' &&
        isCount(record.rating) &&
        (record.rating as number) <= 5 &&
        typeof record.missing === 'boolean'
    );
};

const getLibraryFilePath = (root: string) => path.join(root, LIBRARY_FILE_NAME);

/** Keeps an unusable library.json aside instead of overwriting it */
const backUpUnusableFile = async (filePath: string) => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = filePath.replace(/\.json$/, `.unreadable-${stamp}.json`);
    await rename(filePath, backupPath);
    console.warn(`Could not read ${filePath}; kept it as ${backupPath}`);
};

export const saveLibrary = (root: string, library: LibraryData) =>
    writeJsonAtomic(getLibraryFilePath(root), library);

/**
 * Loads `<root>/library.json`.
 * - Missing: creates an empty library.
 * - Corrupted or from an unknown version: backs the file up and starts empty.
 * - Invalid entries: skipped (and logged), the rest of the library loads.
 */
export const loadLibrary = async (root: string): Promise<LibraryData> => {
    const filePath = getLibraryFilePath(root);

    let raw: string;
    try {
        raw = await readFile(filePath, 'utf8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
        }
        const empty = createEmptyLibrary();
        await saveLibrary(root, empty);
        return empty;
    }

    let parsed: Partial<LibraryData> | null;
    try {
        parsed = JSON.parse(raw) as Partial<LibraryData> | null;
    } catch {
        parsed = null;
    }

    if (
        parsed?.version !== LIBRARY_VERSION ||
        typeof parsed.games !== 'object' ||
        parsed.games === null
    ) {
        await backUpUnusableFile(filePath);
        const empty = createEmptyLibrary();
        await saveLibrary(root, empty);
        return empty;
    }

    const games: Record<string, LibraryRecord> = {};
    for (const [id, record] of Object.entries(parsed.games)) {
        if (isLibraryRecord(record)) {
            games[id] = record;
        } else {
            console.warn(`Skipping invalid library entry ${id}`);
        }
    }

    return { version: LIBRARY_VERSION, games };
};

/** What the renderer gets: no file paths, missing games left out */
export const toGames = (library: LibraryData): Game[] =>
    Object.entries(library.games)
        .filter(([, record]) => !record.missing)
        .map(([id, record]) => ({
            id,
            title: record.title,
            platform: record.platform,
            rating: record.rating,
            playTimeMinutes: record.playTimeMinutes,
            isFavorite: record.isFavorite,
            addedAt: record.addedAt,
            lastPlayedAt: record.lastPlayedAt,
        }));
