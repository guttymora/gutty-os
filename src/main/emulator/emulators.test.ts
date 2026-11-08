import { describe, expect, it } from 'vitest';

import { PLATFORM_IDS } from '@shared/game';

import { getDefaultSettings } from '../settings/settings';

import { getLaunchCommand } from './emulators';

const INPUT = {
    settings: getDefaultSettings('/Users/player'),
    romPath: '/Users/player/gutty-os/roms/gba/Golden Sun.gba',
    savesDir: '/Users/player/gutty-os/saves/gba',
    statesDir: '/Users/player/gutty-os/states/gba',
    baseEnv: { HOME: '/Users/player', PATH: '/usr/bin' },
};

describe('getLaunchCommand', () => {
    it.each(PLATFORM_IDS)('starts the mGBA binary for %s games', (platform) => {
        expect(getLaunchCommand(platform, INPUT).command).toBe(
            '/Applications/mGBA.app/Contents/MacOS/mGBA'
        );
    });

    it('points mGBA at the library saves and states, then the ROM', () => {
        expect(getLaunchCommand('gba', INPUT).args).toEqual([
            '-C',
            'savegamePath=/Users/player/gutty-os/saves/gba',
            '-C',
            'savestatePath=/Users/player/gutty-os/states/gba',
            '/Users/player/gutty-os/roms/gba/Golden Sun.gba',
        ]);
    });

    it('adds the configured env on top of the GuttyOS env', () => {
        expect(getLaunchCommand('gba', INPUT).env).toEqual({
            HOME: '/Users/player',
            PATH: '/usr/bin',
            SDL_JOYSTICK_MFI: '0',
        });
    });

    it('uses the configured app path and env', () => {
        const settings = {
            ...INPUT.settings,
            mgba: {
                appPath: '/Users/player/Apps/mGBA.app',
                env: { SDL_JOYSTICK_MFI: '1' },
            },
        };

        const command = getLaunchCommand('gb', { ...INPUT, settings });

        expect(command.command).toBe(
            '/Users/player/Apps/mGBA.app/Contents/MacOS/mGBA'
        );
        expect(command.env.SDL_JOYSTICK_MFI).toBe('1');
    });
});
