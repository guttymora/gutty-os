import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IpcChannels, IpcEvents } from '@shared/ipc-channels';

import type { LibraryManager } from '../library/library-manager';

import { registerLibraryIpc } from './library';

type Handler = (event: unknown, ...args: unknown[]) => unknown;

const electron = vi.hoisted(() => ({
    handlers: new Map<string, Handler>(),
    showOpenDialog: vi.fn(),
    fromWebContents: vi.fn(),
}));

vi.mock('electron', () => ({
    ipcMain: {
        handle: (channel: string, handler: Handler) =>
            electron.handlers.set(channel, handler),
    },
    dialog: { showOpenDialog: electron.showOpenDialog },
    BrowserWindow: { fromWebContents: electron.fromWebContents },
}));

describe('library IPC', () => {
    const sender = { isDestroyed: vi.fn(() => false), send: vi.fn() };
    const invoke = (channel: IpcChannels, ...args: unknown[]) =>
        electron.handlers.get(channel)?.({ sender }, ...args);
    const manager = {
        getGames: vi.fn(() => []),
        getLocation: vi.fn(() => ({ displayPath: '~/gutty-os' })),
        stageFolder: vi.fn(),
        moveTo: vi.fn(),
    };
    let available: boolean;

    beforeEach(() => {
        vi.clearAllMocks();
        electron.handlers.clear();
        available = true;
        registerLibraryIpc(() =>
            available ? (manager as unknown as LibraryManager) : undefined
        );
    });

    it('answers with an empty library when it is unavailable', async () => {
        available = false;

        expect(await invoke(IpcChannels.LIBRARY_GET_GAMES)).toEqual([]);
        expect(await invoke(IpcChannels.LIBRARY_GET_LOCATION)).toBeUndefined();
        expect(await invoke(IpcChannels.LIBRARY_CHOOSE_FOLDER)).toEqual({
            ok: false,
            reason: 'not-a-folder',
        });
        expect(await invoke(IpcChannels.LIBRARY_MOVE, 'token')).toEqual({
            ok: false,
            reason: 'library-unavailable',
        });
        expect(electron.showOpenDialog).not.toHaveBeenCalled();
    });

    it('opens the folder dialog without a parent window if needed', async () => {
        electron.fromWebContents.mockReturnValue(null);
        electron.showOpenDialog.mockResolvedValue({
            canceled: false,
            filePaths: ['/Users/player/Games'],
        });

        await invoke(IpcChannels.LIBRARY_CHOOSE_FOLDER);

        expect(electron.showOpenDialog).toHaveBeenCalledWith(
            expect.objectContaining({
                properties: ['openDirectory', 'createDirectory'],
            })
        );
        expect(manager.stageFolder).toHaveBeenCalledWith('/Users/player/Games');
    });

    it('stops sending progress once the window is gone', async () => {
        manager.moveTo.mockImplementation(
            async (
                _token: unknown,
                onProgress: (progress: { done: number; total: number }) => void
            ) => {
                onProgress({ done: 1, total: 2 });
                sender.isDestroyed.mockReturnValue(true);
                onProgress({ done: 2, total: 2 });
                return { ok: true };
            }
        );

        await invoke(IpcChannels.LIBRARY_MOVE, 'token');

        expect(sender.send).toHaveBeenCalledOnce();
        expect(sender.send).toHaveBeenCalledWith(
            IpcEvents.LIBRARY_MOVE_PROGRESS,
            { done: 1, total: 2 }
        );
    });
});
