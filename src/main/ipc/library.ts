import { ipcMain } from 'electron';

import type { Game } from '@shared/game';
import { IpcChannels } from '@shared/ipc-channels';

/** Serves the library to the renderer (games only, never file paths) */
export const registerLibraryIpc = (getGames: () => Game[]) => {
    ipcMain.handle(IpcChannels.LIBRARY_GET_GAMES, () => getGames());
};
