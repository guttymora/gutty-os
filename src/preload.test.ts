import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BridgeAPI } from './preload';

/**
 * Integration test for the renderer -> main IPC contract: the real preload
 * bridge talks to the real main-process handlers through an in-memory IPC bus.
 */
const ipc = vi.hoisted(() => {
    const handlers = new Map<string, (event: unknown) => void>();
    const exposed: Record<string, unknown> = {};
    const window = {
        minimize: vi.fn(),
        close: vi.fn(),
        isFullScreen: vi.fn(() => false),
        setFullScreen: vi.fn(),
        isMaximized: vi.fn(() => false),
        maximize: vi.fn(),
        unmaximize: vi.fn(),
    };
    const sender = { id: 1 };

    return { handlers, exposed, window, sender };
});

vi.mock('electron', () => ({
    ipcMain: {
        on: (channel: string, handler: (event: unknown) => void) =>
            ipc.handlers.set(channel, handler),
    },
    ipcRenderer: {
        send: (channel: string) =>
            ipc.handlers.get(channel)?.({ sender: ipc.sender }),
    },
    contextBridge: {
        exposeInMainWorld: (name: string, api: unknown) => {
            ipc.exposed[name] = api;
        },
    },
    BrowserWindow: {
        fromWebContents: (sender: unknown) =>
            sender === ipc.sender ? ipc.window : null,
    },
}));

describe('preload bridge <-> main window controls', () => {
    let bridgeAPI: BridgeAPI;

    beforeAll(async () => {
        const { registerWindowControls } =
            await import('./main/ipc/window-controls');
        registerWindowControls();
        await import('./preload');
        bridgeAPI = ipc.exposed.bridgeAPI as BridgeAPI;
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('exposes the bridge to the renderer as window.bridgeAPI', () => {
        expect(bridgeAPI).toBeDefined();
        expect(bridgeAPI.platform).toBe(process.platform);
    });

    it('minimizes the sender window', () => {
        bridgeAPI.minimizeWindow();

        expect(ipc.window.minimize).toHaveBeenCalledOnce();
    });

    it('closes the sender window', () => {
        bridgeAPI.closeWindow();

        expect(ipc.window.close).toHaveBeenCalledOnce();
    });

    it('toggles maximize / full screen on the sender window', () => {
        bridgeAPI.toggleMaximizeWindow();

        const toggled =
            ipc.window.setFullScreen.mock.calls.length +
            ipc.window.maximize.mock.calls.length;
        expect(toggled).toBe(1);
    });

    it('has a main-process handler for every channel the bridge uses', () => {
        expect([...ipc.handlers.keys()].sort()).toEqual(
            ['window:close', 'window:minimize', 'window:toggle-maximize'].sort()
        );
    });
});
