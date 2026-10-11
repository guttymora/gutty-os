import { BrowserWindow, ipcMain } from 'electron';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IpcChannels } from '@shared/ipc-channels';

import { registerWindowControls, toggleMaximize } from './window-controls';

vi.mock('electron', () => ({
    ipcMain: { on: vi.fn() },
    BrowserWindow: { fromWebContents: vi.fn() },
}));

const createFakeWindow = ({ fullScreen = false, maximized = false } = {}) => ({
    isFullScreen: vi.fn(() => fullScreen),
    setFullScreen: vi.fn(),
    isMaximized: vi.fn(() => maximized),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    minimize: vi.fn(),
    close: vi.fn(),
});

describe('toggleMaximize', () => {
    it('toggles full screen on macOS', () => {
        const window = createFakeWindow({ fullScreen: false });
        toggleMaximize(window, 'darwin');

        expect(window.setFullScreen).toHaveBeenCalledWith(true);
        expect(window.maximize).not.toHaveBeenCalled();
    });

    it('maximizes on other platforms', () => {
        const window = createFakeWindow({ maximized: false });
        toggleMaximize(window, 'win32');

        expect(window.maximize).toHaveBeenCalledOnce();
    });

    it('restores an already maximized window on other platforms', () => {
        const window = createFakeWindow({ maximized: true });
        toggleMaximize(window, 'linux');

        expect(window.unmaximize).toHaveBeenCalledOnce();
    });
});

describe('registerWindowControls', () => {
    const window = createFakeWindow();

    const emit = (channel: IpcChannels) => {
        const call = vi
            .mocked(ipcMain.on)
            .mock.calls.find(([registered]) => registered === channel);
        const handler = call?.[1] as (event: unknown) => void;
        handler({ sender: {} });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(
            window as unknown as BrowserWindow
        );
        registerWindowControls();
    });

    it('minimizes the sender window', () => {
        emit(IpcChannels.WINDOW_MINIMIZE);

        expect(window.minimize).toHaveBeenCalledOnce();
    });

    it('closes the sender window', () => {
        emit(IpcChannels.WINDOW_CLOSE);

        expect(window.close).toHaveBeenCalledOnce();
    });
});
