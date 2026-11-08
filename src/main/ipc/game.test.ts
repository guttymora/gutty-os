import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Game } from '@shared/game';
import { IpcChannels, IpcEvents } from '@shared/ipc-channels';

import type { LibraryManager } from '../library/library-manager';

import { registerGameIpc } from './game';

type Handler = (event: unknown, ...args: unknown[]) => unknown;

const electron = vi.hoisted(() => ({
    handlers: new Map<string, Handler>(),
    window: {
        minimize: vi.fn(),
        restore: vi.fn(),
        focus: vi.fn(),
        isDestroyed: vi.fn(() => false),
    },
}));

vi.mock('electron', () => ({
    ipcMain: {
        handle: (channel: string, handler: Handler) =>
            electron.handlers.set(channel, handler),
    },
    BrowserWindow: { fromWebContents: () => electron.window },
}));

const GAME = { id: 'abc', title: 'Golden Sun' } as Game;

describe('game IPC', () => {
    const sender = { isDestroyed: vi.fn(() => false), send: vi.fn() };
    const launch = (id: unknown) =>
        electron.handlers.get(IpcChannels.GAME_LAUNCH)?.({ sender }, id);
    let onExit: (game: Game | undefined) => void;
    const manager = {
        launchGame: vi.fn(
            async (_id: string, exit: (game: Game | undefined) => void) => {
                onExit = exit;
                return { ok: true as const };
            }
        ),
    };
    let available: boolean;

    beforeEach(() => {
        vi.clearAllMocks();
        electron.handlers.clear();
        available = true;
        registerGameIpc(() =>
            available ? (manager as unknown as LibraryManager) : undefined
        );
    });

    it('minimizes GuttyOS once the game starts', async () => {
        expect(await launch('abc')).toEqual({ ok: true });

        expect(manager.launchGame).toHaveBeenCalledWith(
            'abc',
            expect.any(Function)
        );
        expect(electron.window.minimize).toHaveBeenCalledOnce();
    });

    it('brings GuttyOS back and sends the updated game when it quits', async () => {
        await launch('abc');

        onExit(GAME);

        expect(electron.window.restore).toHaveBeenCalledOnce();
        expect(electron.window.focus).toHaveBeenCalledOnce();
        expect(sender.send).toHaveBeenCalledWith(IpcEvents.GAME_EXITED, GAME);
    });

    it('stays put when the game could not start', async () => {
        manager.launchGame.mockResolvedValueOnce({
            ok: false,
            reason: 'emulator-not-found',
        } as never);

        expect(await launch('abc')).toEqual({
            ok: false,
            reason: 'emulator-not-found',
        });
        expect(electron.window.minimize).not.toHaveBeenCalled();
    });

    it('refuses bad ids and an unavailable library', async () => {
        expect(await launch(42)).toEqual({
            ok: false,
            reason: 'game-not-found',
        });
        available = false;
        expect(await launch('abc')).toEqual({
            ok: false,
            reason: 'library-unavailable',
        });
        expect(manager.launchGame).not.toHaveBeenCalled();
    });
});
