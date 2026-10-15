import { BrowserWindow, dialog, ipcMain } from 'electron';

import type { Game } from '@shared/game';
import { IpcChannels, IpcEvents } from '@shared/ipc-channels';
import type {
    ChooseFolderResult,
    LibraryLocation,
    MoveLibraryResult,
} from '@shared/library-location';

import type { LibraryManager } from '../library/library-manager';

/** Undefined when the library couldn't be prepared at startup */
type GetManager = () =>
    | Pick<
          LibraryManager,
          'getGames' | 'getLocation' | 'stageFolder' | 'moveTo'
      >
    | undefined;

/** Library requests from the renderer (games only, never file paths) */
export const registerLibraryIpc = (getManager: GetManager) => {
    ipcMain.handle(
        IpcChannels.LIBRARY_GET_GAMES,
        (): Game[] => getManager()?.getGames() ?? []
    );

    ipcMain.handle(
        IpcChannels.LIBRARY_GET_LOCATION,
        (): LibraryLocation | undefined => getManager()?.getLocation()
    );

    ipcMain.handle(
        IpcChannels.LIBRARY_CHOOSE_FOLDER,
        async (event): Promise<ChooseFolderResult> => {
            const manager = getManager();
            if (!manager) {
                return { ok: false, reason: 'not-a-folder' };
            }
            const options = {
                title: 'Choose an empty folder for your games',
                properties: ['openDirectory', 'createDirectory'] as Array<
                    'openDirectory' | 'createDirectory'
                >,
            };
            const window = BrowserWindow.fromWebContents(event.sender);
            const { canceled, filePaths } = window
                ? await dialog.showOpenDialog(window, options)
                : await dialog.showOpenDialog(options);
            if (canceled || !filePaths[0]) {
                return { ok: false, reason: 'cancelled' };
            }
            return manager.stageFolder(filePaths[0]);
        }
    );

    ipcMain.handle(
        IpcChannels.LIBRARY_MOVE,
        async (event, token: unknown): Promise<MoveLibraryResult> => {
            const manager = getManager();
            if (!manager) {
                return { ok: false, reason: 'library-unavailable' };
            }
            return manager.moveTo(token, (progress) => {
                if (!event.sender.isDestroyed()) {
                    event.sender.send(
                        IpcEvents.LIBRARY_MOVE_PROGRESS,
                        progress
                    );
                }
            });
        }
    );
};
