import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { writeJsonAtomic } from '../utils/write-json-atomic';

export const SETTINGS_FILE_NAME = 'settings.json';
export const DEFAULT_LIBRARY_FOLDER_NAME = 'gutty-os';

export type EmulatorSettings = {
    /** Absolute path of the .app bundle */
    appPath: string;
    /** Extra environment variables the emulator is started with */
    env: Record<string, string>;
};

export type Settings = {
    version: 1;
    /** Absolute path of the game library folder */
    libraryPath: string;
    mgba: EmulatorSettings;
};

export const getDefaultSettings = (homeDir: string): Settings => ({
    version: 1,
    // Always under the user's home folder, never on an external drive
    libraryPath: path.join(homeDir, DEFAULT_LIBRARY_FOLDER_NAME),
    mgba: {
        appPath: '/Applications/mGBA.app',
        // macOS 27 breaks controllers through Apple's GameController
        // framework; SDL falls back to IOKit with this off
        env: { SDL_JOYSTICK_MFI: '0' },
    },
});

const isAbsolutePath = (value: unknown): value is string =>
    typeof value === 'string' && path.isAbsolute(value);

const isEnv = (value: unknown): value is Record<string, string> =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === 'string');

/** Takes each valid value from the saved settings, the default otherwise */
const toEmulatorSettings = (
    saved: unknown,
    defaults: EmulatorSettings
): EmulatorSettings => {
    const emulator = (saved ?? {}) as Partial<EmulatorSettings>;

    return {
        appPath: isAbsolutePath(emulator.appPath)
            ? emulator.appPath
            : defaults.appPath,
        env: isEnv(emulator.env) ? emulator.env : defaults.env,
    };
};

/**
 * Loads settings from `<userData>/settings.json`.
 * - Missing file: creates it with the defaults.
 * - Unreadable file or invalid values: uses the defaults for those values
 *   but leaves the file untouched, so a hand-edited file is never wiped.
 * - No emulator settings yet: adds the defaults to the file.
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

    // Settings from before emulators were configurable: add the defaults so
    // they can be edited by hand, keeping everything else as it was
    if (typeof saved === 'object' && saved !== null && !('mgba' in saved)) {
        await writeJsonAtomic(filePath, { ...saved, mgba: defaults.mgba });
    }

    return {
        version: 1,
        libraryPath: isAbsolutePath(saved?.libraryPath)
            ? saved.libraryPath
            : defaults.libraryPath,
        mgba: toEmulatorSettings(saved?.mgba, defaults.mgba),
    };
};

export const saveSettings = (userDataDir: string, settings: Settings) =>
    writeJsonAtomic(path.join(userDataDir, SETTINGS_FILE_NAME), settings);
