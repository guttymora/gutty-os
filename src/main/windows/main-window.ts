import { BrowserWindow } from 'electron';
import path from 'node:path';

const ASPECT_RATIO = 4 / 3;

export const createMainWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 960,
        height: 720,
        minWidth: 640,
        minHeight: 480,
        // The window bar is drawn by the renderer (see WindowBar component)
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
        },
    });

    mainWindow.setAspectRatio(ASPECT_RATIO);

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(
            path.join(
                __dirname,
                `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
            )
        );
    }

    return mainWindow;
};
