import { BrowserWindow, ipcMain } from 'electron';

import { IpcChannels, IpcEvents } from '@shared/ipc-channels';
import type { LaunchResult } from '@shared/launch';

import type { LibraryManager } from '../library/library-manager';

/** Undefined when the library couldn't be prepared at startup */
type GetManager = () => Pick<LibraryManager, 'launchGame'> | undefined;

/**
 * Game launches from the renderer. GuttyOS steps aside while the emulator
 * runs and comes back when it quits.
 */
export const registerGameIpc = (getManager: GetManager) => {
    ipcMain.handle(
        IpcChannels.GAME_LAUNCH,
        async (event, id: unknown): Promise<LaunchResult> => {
            const manager = getManager();
            if (!manager) {
                return { ok: false, reason: 'library-unavailable' };
            }
            if (typeof id !== 'string') {
                return { ok: false, reason: 'game-not-found' };
            }
            const window = BrowserWindow.fromWebContents(event.sender);

            const result = await manager.launchGame(id, (game) => {
                if (window && !window.isDestroyed()) {
                    window.restore();
                    window.focus();
                }
                if (!event.sender.isDestroyed()) {
                    event.sender.send(IpcEvents.GAME_EXITED, game);
                }
            });
            if (result.ok) {
                window?.minimize();
            }
            return result;
        }
    );
};
