import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { writeJsonAtomic } from '../utils/write-json-atomic';

export const SETTINGS_FILE_NAME = 'settings.json';
export const DEFAULT_LIBRARY_FOLDER_NAME = 'gutty-os';

export type Settings = {
    version: 1;
    /** Absolute path of the game library folder */
    libraryPath: string;
};

export const getDefaultSettings = (homeDir: string): Settings => ({
    version: 1,
    // Always under the user's home folder, never on an external drive
    libraryPath: path.join(homeDir, DEFAULT_LIBRARY_FOLDER_NAME),
});

const isValidLibraryPath = (value: unknown): value is string =>
    typeof value === 'string' && path.isAbsolute(value);

/**
 * Loads settings from `<userData>/settings.json`.
 * - Missing file: creates it with the defaults.
 * - Unreadable file or invalid values: uses the defaults for those values
 *   but leaves the file untouched, so a hand-edited file is never wiped.
 */
export const loadSettings = async (
    userDataDir: string,
    homeDir: string
): Promise<Settings> => {
    const filePath = path.join(userDataDir, SETTINGS_FILE_NAME);
    const defaults = getDefaultSettings(homeDir);

    let raw: string;
    try {
        raw = await readFile(filePath, 'utf8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
        }
        await writeJsonAtomic(filePath, defaults);
        return defaults;
    }

    let saved: Partial<Settings>;
    try {
        saved = JSON.parse(raw) as Partial<Settings>;
    } catch {
        console.warn(`Ignoring unreadable ${filePath}, using defaults`);
        return defaults;
    }

    return {
        version: 1,
        libraryPath: isValidLibraryPath(saved?.libraryPath)
            ? saved.libraryPath
            : defaults.libraryPath,
    };
};
