// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, webUtils } from 'electron';

import type { Game, Platform } from '@shared/game';
import type { ImportFileKind, ImportResult, StageResult } from '@shared/import';
import { IpcChannels } from '@shared/ipc-channels';

const bridgeAPI = {
    platform: process.platform,
    minimizeWindow: () => ipcRenderer.send(IpcChannels.WINDOW_MINIMIZE),
    toggleMaximizeWindow: () =>
        ipcRenderer.send(IpcChannels.WINDOW_TOGGLE_MAXIMIZE),
    closeWindow: () => ipcRenderer.send(IpcChannels.WINDOW_CLOSE),
    getGames: (): Promise<Game[]> =>
        ipcRenderer.invoke(IpcChannels.LIBRARY_GET_GAMES),
    /**
     * Stages a file dropped on the window. The path is resolved here, in the
     * preload, so the renderer code never handles file paths.
     */
    stageDroppedFile: (file: File): Promise<StageResult> =>
        ipcRenderer.invoke(
            IpcChannels.IMPORT_STAGE_FILE,
            webUtils.getPathForFile(file)
        ),
    chooseImportFile: (
        kind: ImportFileKind,
        platform?: Platform
    ): Promise<StageResult> =>
        ipcRenderer.invoke(IpcChannels.IMPORT_CHOOSE_FILE, kind, platform),
    importGame: (romToken: string, saveToken?: string): Promise<ImportResult> =>
        ipcRenderer.invoke(IpcChannels.IMPORT_GAME, { romToken, saveToken }),
};

export type BridgeAPI = typeof bridgeAPI;

declare global {
    interface Window {
        bridgeAPI: BridgeAPI;
    }
}

contextBridge.exposeInMainWorld('bridgeAPI', bridgeAPI);
