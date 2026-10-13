import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import type { Game } from '@shared/game';
import { IpcChannels } from '@shared/ipc-channels';

import type { BridgeAPI } from './preload';

/**
 * Integration test for the renderer -> main IPC contract: the real preload
 * bridge talks to the real main-process handlers through an in-memory IPC bus.
 */
type Handler = (event: unknown, ...args: unknown[]) => unknown;

const ipc = vi.hoisted(() => {
    const handlers = new Map<string, Handler>();
    const sentChannels = new Set<string>();
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

    return { handlers, sentChannels, exposed, window, sender };
});

const callHandler = (channel: string, args: unknown[]) => {
    ipc.sentChannels.add(channel);
    const handler = ipc.handlers.get(channel);
    // A real ipcRenderer would drop or reject it; fail loudly instead
    if (!handler) {
        throw new Error(`No main-process handler for "${channel}"`);
    }
    return handler({ sender: ipc.sender }, ...args);
};

vi.mock('electron', () => ({
    ipcMain: {
        on: (channel: string, handler: Handler) =>
            ipc.handlers.set(channel, handler),
        handle: (channel: string, handler: Handler) =>
            ipc.handlers.set(channel, handler),
    },
    ipcRenderer: {
        send: (channel: string, ...args: unknown[]) => {
            callHandler(channel, args);
        },
        invoke: async (channel: string, ...args: unknown[]) =>
            callHandler(channel, args),
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

const ORIGINAL_PLATFORM = process.platform;

const setPlatform = (platform: NodeJS.Platform) =>
    Object.defineProperty(process, 'platform', { value: platform });

const LIBRARY: Game[] = [
    {
        id: 'f3ae088181bf583e55daf962a92bb46f4f1d07b7',
        title: 'Pokemon Emerald',
        platform: 'gba',
        rating: 5,
        playTimeMinutes: 754,
        isFavorite: true,
        addedAt: '2026-10-13T10:12:00.000Z',
    },
];

describe('preload bridge <-> main process', () => {
    let bridgeAPI: BridgeAPI;

    beforeAll(async () => {
        const { registerWindowControls } =
            await import('./main/ipc/window-controls');
        const { registerLibraryIpc } = await import('./main/ipc/library');
        registerWindowControls();
        registerLibraryIpc(() => LIBRARY);
        await import('./preload');
        bridgeAPI = ipc.exposed.bridgeAPI as BridgeAPI;
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        setPlatform(ORIGINAL_PLATFORM);
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

    it('enters full screen (and never maximizes) on macOS', () => {
        setPlatform('darwin');

        bridgeAPI.toggleMaximizeWindow();

        expect(ipc.window.setFullScreen).toHaveBeenCalledWith(true);
        expect(ipc.window.maximize).not.toHaveBeenCalled();
    });

    it('maximizes (and never goes full screen) on other platforms', () => {
        setPlatform('win32');

        bridgeAPI.toggleMaximizeWindow();

        expect(ipc.window.maximize).toHaveBeenCalledOnce();
        expect(ipc.window.setFullScreen).not.toHaveBeenCalled();
    });

    it('has a main-process handler for every IPC channel', () => {
        expect([...ipc.handlers.keys()].sort()).toEqual(
            Object.values(IpcChannels).sort()
        );
    });

    it('gets the library games from the main process', async () => {
        await expect(bridgeAPI.getGames()).resolves.toEqual(LIBRARY);
    });

    it('only sends on channels that have a handler', async () => {
        ipc.sentChannels.clear();
        const callEveryBridgeFunction = async () => {
            for (const value of Object.values(bridgeAPI)) {
                if (typeof value === 'function') {
                    await value();
                }
            }
        };

        // The IPC mock throws when a channel has no handler
        await expect(callEveryBridgeFunction()).resolves.toBeUndefined();
        expect(ipc.sentChannels.size).toBeGreaterThan(0);
    });
});
