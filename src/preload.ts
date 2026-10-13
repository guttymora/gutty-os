// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

import type { Game } from '@shared/game';
import { IpcChannels } from '@shared/ipc-channels';

const bridgeAPI = {
    platform: process.platform,
    minimizeWindow: () => ipcRenderer.send(IpcChannels.WINDOW_MINIMIZE),
    toggleMaximizeWindow: () =>
        ipcRenderer.send(IpcChannels.WINDOW_TOGGLE_MAXIMIZE),
    closeWindow: () => ipcRenderer.send(IpcChannels.WINDOW_CLOSE),
    getGames: (): Promise<Game[]> =>
        ipcRenderer.invoke(IpcChannels.LIBRARY_GET_GAMES),
};

export type BridgeAPI = typeof bridgeAPI;

declare global {
    interface Window {
        bridgeAPI: BridgeAPI;
    }
}

contextBridge.exposeInMainWorld('bridgeAPI', bridgeAPI);
