import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMainWindow } from './main-window';

// Defined in vi.hoisted so both the electron mock and the tests share it
const { FakeBrowserWindow } = vi.hoisted(() => {
    class FakeBrowserWindow {
        static lastInstance: FakeBrowserWindow;
        readyToShow?: () => void;
        setAspectRatio = vi.fn();
        show = vi.fn();
        loadURL = vi.fn();
        loadFile = vi.fn();
        once = vi.fn((event: string, listener: () => void) => {
            if (event === 'ready-to-show') {
                this.readyToShow = listener;
            }
        });

        constructor(public options: Electron.BrowserWindowConstructorOptions) {
            FakeBrowserWindow.lastInstance = this;
        }
    }

    return { FakeBrowserWindow };
});

vi.mock('electron', () => ({ BrowserWindow: FakeBrowserWindow }));

const createWindow = ({ devServerUrl }: { devServerUrl?: string }) => {
    vi.stubGlobal('MAIN_WINDOW_VITE_DEV_SERVER_URL', devServerUrl);
    vi.stubGlobal('MAIN_WINDOW_VITE_NAME', 'main_window');
    createMainWindow();

    return FakeBrowserWindow.lastInstance;
};

describe('createMainWindow', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('creates a frameless 960x720 window with a 640x480 minimum', () => {
        const window = createWindow({});

        expect(window.options).toMatchObject({
            width: 960,
            height: 720,
            minWidth: 640,
            minHeight: 480,
            frame: false,
        });
    });

    it('locks the window to a 4:3 aspect ratio', () => {
        const window = createWindow({});

        expect(window.setAspectRatio).toHaveBeenCalledWith(4 / 3);
    });

    it('stays hidden until the first paint', () => {
        const window = createWindow({});

        expect(window.options.show).toBe(false);
        expect(window.show).not.toHaveBeenCalled();

        window.readyToShow?.();
        expect(window.show).toHaveBeenCalledOnce();
    });

    it('loads the preload script built next to the main bundle', () => {
        const window = createWindow({});

        expect(window.options.webPreferences?.preload).toBe(
            path.join(__dirname, 'preload.cjs')
        );
    });

    it('loads the Vite dev server in development', () => {
        const window = createWindow({ devServerUrl: 'http://localhost:5173' });

        expect(window.loadURL).toHaveBeenCalledWith('http://localhost:5173');
        expect(window.loadFile).not.toHaveBeenCalled();
    });

    it('loads the bundled renderer in production', () => {
        const window = createWindow({});

        expect(window.loadURL).not.toHaveBeenCalled();
        expect(window.loadFile).toHaveBeenCalledWith(
            path.join(__dirname, '../renderer/main_window/index.html')
        );
    });
});
