import path from 'node:path';

import type { Platform } from '@shared/game';

import type { Settings } from '../settings/settings';

export type EmulatorId = 'mgba';

/** The emulator each platform runs on */
export const EMULATOR_BY_PLATFORM: Record<Platform, EmulatorId> = {
    gb: 'mgba',
    gbc: 'mgba',
    gba: 'mgba',
};

export type LaunchCommand = {
    /** Executable inside the .app bundle, started directly (not via `open`) */
    command: string;
    args: string[];
    env: NodeJS.ProcessEnv;
};

type CommandInput = {
    settings: Settings;
    romPath: string;
    /** Folders for this game's platform */
    savesDir: string;
    statesDir: string;
    /** Environment GuttyOS runs with */
    baseEnv: NodeJS.ProcessEnv;
};

/**
 * mGBA looks for saves next to the ROM by default; the library keeps them in
 * saves/ and states/, so point it there. `-C` overrides aren't written to
 * mGBA's own config.
 */
const mgbaCommand = ({
    settings,
    romPath,
    savesDir,
    statesDir,
    baseEnv,
}: CommandInput): LaunchCommand => ({
    command: path.join(settings.mgba.appPath, 'Contents', 'MacOS', 'mGBA'),
    args: [
        '-C',
        `savegamePath=${savesDir}`,
        '-C',
        `savestatePath=${statesDir}`,
        romPath,
    ],
    env: { ...baseEnv, ...settings.mgba.env },
});

const COMMANDS: Record<EmulatorId, (input: CommandInput) => LaunchCommand> = {
    mgba: mgbaCommand,
};

/** How to start the right emulator for a game */
export const getLaunchCommand = (platform: Platform, input: CommandInput) =>
    COMMANDS[EMULATOR_BY_PLATFORM[platform]](input);
