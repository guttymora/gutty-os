import { BrowserWindow, ipcMain, type IpcMainEvent } from 'electron';

import { IpcChannels } from '@shared/ipc-channels';

type MaximizableWindow = Pick<
    BrowserWindow,
    'isFullScreen' | 'setFullScreen' | 'isMaximized' | 'maximize' | 'unmaximize'
>;

const getWindow = (event: IpcMainEvent) =>
    BrowserWindow.fromWebContents(event.sender);

// macOS' green button enters full screen; other platforms maximize.
export const toggleMaximize = (
    window: MaximizableWindow,
    platform: NodeJS.Platform = process.platform
) => {
    if (platform === 'darwin') {
        window.setFullScreen(!window.isFullScreen());
    } else if (window.isMaximized()) {
        window.unmaximize();
    } else {
        window.maximize();
    }
};

export const registerWindowControls = () => {
    ipcMain.on(IpcChannels.WINDOW_MINIMIZE, (event) => {
        getWindow(event)?.minimize();
    });

    ipcMain.on(IpcChannels.WINDOW_TOGGLE_MAXIMIZE, (event) => {
        const window = getWindow(event);
        if (window) {
            toggleMaximize(window);
        }
    });

    ipcMain.on(IpcChannels.WINDOW_CLOSE, (event) => {
        getWindow(event)?.close();
    });
};
