import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import type { Game } from '@shared/game';
import type { ImportResult } from '@shared/import';
import { IpcChannels } from '@shared/ipc-channels';

import type { LibraryManager } from './main/library/library-manager';
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
    // Renderer-side listeners for events the main process sends
    const listeners = new Map<string, Set<Handler>>();
    const sender = {
        id: 1,
        isDestroyed: () => false,
        send: (channel: string, ...args: unknown[]) =>
            listeners
                .get(channel)
                ?.forEach((listener) => listener({}, ...args)),
    };
    // What webUtils.getPathForFile returns for a dropped File
    const dropped = { path: '' };
    const showOpenDialog = vi.fn();

    return {
        handlers,
        listeners,
        sentChannels,
        exposed,
        window,
        sender,
        dropped,
        showOpenDialog,
    };
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
        on: (channel: string, listener: Handler) => {
            const set = ipc.listeners.get(channel) ?? new Set<Handler>();
            set.add(listener);
            ipc.listeners.set(channel, set);
        },
        removeListener: (channel: string, listener: Handler) =>
            ipc.listeners.get(channel)?.delete(listener),
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
    webUtils: { getPathForFile: () => ipc.dropped.path },
    dialog: { showOpenDialog: ipc.showOpenDialog },
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

const ADDED: ImportResult = { status: 'added', game: LIBRARY[0], warnings: [] };

describe('preload bridge <-> main process', () => {
    let bridgeAPI: BridgeAPI;
    let sandbox: string;
    let romPath: string;
    const library = {
        getGames: vi.fn(() => LIBRARY),
        getLocation: vi.fn(() => ({ displayPath: '~/gutty-os' })),
        stageFolder: vi.fn(async () => ({
            ok: true as const,
            token: 'folder-token',
            displayPath: '~/Games',
        })),
        moveTo: vi.fn(
            async (
                _token: unknown,
                onProgress?: (progress: { done: number; total: number }) => void
            ) => {
                onProgress?.({ done: 1, total: 2 });
                onProgress?.({ done: 2, total: 2 });
                return {
                    ok: true as const,
                    location: { displayPath: '~/Games' },
                    oldFilesLeft: false,
                };
            }
        ),
        importGame: vi.fn(async () => ADDED),
    };

    beforeAll(async () => {
        sandbox = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
        romPath = path.join(sandbox, 'Tetris.gb');
        await writeFile(romPath, 'rom-bytes');

        const { registerWindowControls } =
            await import('./main/ipc/window-controls');
        const { registerLibraryIpc } = await import('./main/ipc/library');
        const { registerImportIpc } = await import('./main/ipc/import');
        const { ImportStaging } = await import('./main/library/import-staging');
        registerWindowControls();
        registerLibraryIpc(() => library as unknown as LibraryManager);
        registerImportIpc({
            staging: new ImportStaging(),
            getLibrary: () => library as unknown as LibraryManager,
        });
        await import('./preload');
        bridgeAPI = ipc.exposed.bridgeAPI as BridgeAPI;
    });

    afterAll(async () => {
        await rm(sandbox, { recursive: true, force: true });
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

    it('stages a dropped file without exposing its path', async () => {
        ipc.dropped.path = romPath;

        const result = await bridgeAPI.stageDroppedFile(
            new File(['rom-bytes'], 'Tetris.gb')
        );

        expect(result).toMatchObject({
            ok: true,
            file: { name: 'Tetris.gb', kind: 'rom', platform: 'gb' },
        });
        expect(JSON.stringify(result)).not.toContain(sandbox);
    });

    it('rejects a dropped file that is not on disk', async () => {
        ipc.dropped.path = '';

        await expect(
            bridgeAPI.stageDroppedFile(new File(['x'], 'evil.gba'))
        ).resolves.toEqual({ ok: false, reason: 'not-a-file' });
    });

    it('opens the file dialog for one ROM of the chosen platform', async () => {
        ipc.showOpenDialog.mockResolvedValueOnce({
            canceled: false,
            filePaths: [romPath],
        });

        const result = await bridgeAPI.chooseImportFile('rom', 'gb');

        expect(ipc.showOpenDialog).toHaveBeenCalledWith(ipc.window, {
            properties: ['openFile'],
            filters: [{ name: 'Game Boy ROMs', extensions: ['gb'] }],
        });
        expect(result).toMatchObject({ ok: true, file: { name: 'Tetris.gb' } });
    });

    it('reports a cancelled file dialog', async () => {
        ipc.showOpenDialog.mockResolvedValueOnce({
            canceled: true,
            filePaths: [],
        });

        await expect(bridgeAPI.chooseImportFile('save')).resolves.toEqual({
            ok: false,
            reason: 'cancelled',
        });
    });

    it('imports a staged ROM by token, once', async () => {
        ipc.dropped.path = romPath;
        const staged = await bridgeAPI.stageDroppedFile(
            new File(['rom-bytes'], 'Tetris.gb')
        );
        if (!staged.ok) {
            throw new Error('expected the ROM to be staged');
        }

        await expect(bridgeAPI.importGame(staged.file.token)).resolves.toEqual(
            ADDED
        );
        expect(library.importGame).toHaveBeenCalledWith(
            { path: romPath, kind: 'rom', platform: 'gb' },
            undefined
        );

        // The token is spent after a successful import
        await expect(bridgeAPI.importGame(staged.file.token)).resolves.toEqual({
            status: 'error',
            reason: 'file-not-found',
        });
    });

    it('refuses to import with an unknown token', async () => {
        await expect(bridgeAPI.importGame('made-up-token')).resolves.toEqual({
            status: 'error',
            reason: 'file-not-found',
        });
        expect(library.importGame).not.toHaveBeenCalled();
    });

    it('reads where the library is', async () => {
        await expect(bridgeAPI.getLibraryLocation()).resolves.toEqual({
            displayPath: '~/gutty-os',
        });
    });

    it('opens a folder dialog to choose a new library location', async () => {
        ipc.showOpenDialog.mockResolvedValueOnce({
            canceled: false,
            filePaths: ['/Users/player/Games'],
        });

        const result = await bridgeAPI.chooseLibraryFolder();

        expect(ipc.showOpenDialog).toHaveBeenCalledWith(
            ipc.window,
            expect.objectContaining({
                properties: ['openDirectory', 'createDirectory'],
            })
        );
        expect(library.stageFolder).toHaveBeenCalledWith('/Users/player/Games');
        expect(result).toEqual({
            ok: true,
            token: 'folder-token',
            displayPath: '~/Games',
        });
    });

    it('reports a cancelled folder dialog', async () => {
        ipc.showOpenDialog.mockResolvedValueOnce({
            canceled: true,
            filePaths: [],
        });

        await expect(bridgeAPI.chooseLibraryFolder()).resolves.toEqual({
            ok: false,
            reason: 'cancelled',
        });
        expect(library.stageFolder).not.toHaveBeenCalled();
    });

    it('moves the library by token and streams the progress', async () => {
        const progress = vi.fn();
        const stopListening = bridgeAPI.onLibraryMoveProgress(progress);

        const result = await bridgeAPI.moveLibrary('folder-token');
        stopListening();
        await bridgeAPI.moveLibrary('folder-token');

        expect(library.moveTo).toHaveBeenCalledWith(
            'folder-token',
            expect.any(Function)
        );
        expect(result).toMatchObject({ ok: true });
        // Two updates from the first move only: the listener was removed
        expect(progress.mock.calls).toEqual([
            [{ done: 1, total: 2 }],
            [{ done: 2, total: 2 }],
        ]);
    });

    it('only sends on channels that have a handler', async () => {
        ipc.sentChannels.clear();
        ipc.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
        // Example arguments for the bridge functions that need them
        const exampleArgs: Partial<Record<keyof BridgeAPI, unknown[]>> = {
            stageDroppedFile: [new File(['x'], 'Tetris.gb')],
            chooseImportFile: ['rom'],
            importGame: ['token'],
            moveLibrary: ['token'],
            onLibraryMoveProgress: [() => undefined],
        };
        const callEveryBridgeFunction = async () => {
            for (const [name, value] of Object.entries(bridgeAPI)) {
                if (typeof value === 'function') {
                    await (value as (...args: unknown[]) => unknown)(
                        ...(exampleArgs[name as keyof BridgeAPI] ?? [])
                    );
                }
            }
        };

        // The IPC mock throws when a channel has no handler
        await expect(callEveryBridgeFunction()).resolves.toBeUndefined();
        expect(ipc.sentChannels.size).toBe(Object.values(IpcChannels).length);
    });
});
