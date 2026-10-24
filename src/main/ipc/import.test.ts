import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IpcChannels } from '@shared/ipc-channels';

import type { ImportStaging } from '../library/import-staging';
import type { LibraryService } from '../library/library-service';

import { registerImportIpc } from './import';

type Handler = (event: unknown, ...args: unknown[]) => unknown;

const electron = vi.hoisted(() => ({
    handlers: new Map<string, Handler>(),
    showOpenDialog: vi.fn(),
    fromWebContents: vi.fn(),
}));

vi.mock('electron', () => ({
    ipcMain: {
        handle: (channel: string, handler: Handler) =>
            electron.handlers.set(channel, handler),
    },
    dialog: { showOpenDialog: electron.showOpenDialog },
    BrowserWindow: { fromWebContents: electron.fromWebContents },
}));

const invoke = (channel: IpcChannels, ...args: unknown[]) =>
    electron.handlers.get(channel)?.({ sender: {} }, ...args);

describe('import IPC', () => {
    const staging = {
        stage: vi.fn(async () => ({ ok: true })),
        get: vi.fn(),
        release: vi.fn(),
    };
    const library = { importGame: vi.fn() };
    let libraryAvailable: boolean;

    beforeEach(() => {
        vi.clearAllMocks();
        electron.handlers.clear();
        libraryAvailable = true;
        registerImportIpc({
            staging: staging as unknown as ImportStaging,
            getLibrary: () =>
                libraryAvailable
                    ? (library as unknown as LibraryService)
                    : undefined,
        });
    });

    it('rejects a dropped file without a path', async () => {
        expect(await invoke(IpcChannels.IMPORT_STAGE_FILE, '')).toEqual({
            ok: false,
            reason: 'not-a-file',
        });
        expect(await invoke(IpcChannels.IMPORT_STAGE_FILE, 42)).toEqual({
            ok: false,
            reason: 'not-a-file',
        });
        expect(staging.stage).not.toHaveBeenCalled();
    });

    it('rejects an unknown file kind for the dialog', async () => {
        expect(await invoke(IpcChannels.IMPORT_CHOOSE_FILE, 'cover')).toEqual({
            ok: false,
            reason: 'unsupported',
        });
        expect(electron.showOpenDialog).not.toHaveBeenCalled();
    });

    it('opens the dialog for all platforms and saves without a window', async () => {
        electron.fromWebContents.mockReturnValue(null);
        electron.showOpenDialog.mockResolvedValue({
            canceled: false,
            filePaths: ['/Users/player/Tetris.gb'],
        });

        await invoke(IpcChannels.IMPORT_CHOOSE_FILE, 'rom', 'nes');
        await invoke(IpcChannels.IMPORT_CHOOSE_FILE, 'save');

        expect(electron.showOpenDialog).toHaveBeenNthCalledWith(1, {
            properties: ['openFile'],
            filters: [
                { name: 'Game Boy ROMs', extensions: ['gb', 'gbc', 'gba'] },
            ],
        });
        expect(electron.showOpenDialog).toHaveBeenNthCalledWith(2, {
            properties: ['openFile'],
            filters: [{ name: 'Save files', extensions: ['sav'] }],
        });
        expect(staging.stage).toHaveBeenCalledWith(
            '/Users/player/Tetris.gb',
            'save'
        );
    });

    it('reports an unavailable library', async () => {
        libraryAvailable = false;

        expect(
            await invoke(IpcChannels.IMPORT_GAME, { romToken: 'rom' })
        ).toEqual({ status: 'error', reason: 'library-unavailable' });
    });

    it('refuses an unknown save token', async () => {
        staging.get.mockImplementation((_token: unknown, kind: string) =>
            kind === 'rom' ? { path: '/rom.gb', kind: 'rom' } : undefined
        );

        expect(
            await invoke(IpcChannels.IMPORT_GAME, {
                romToken: 'rom',
                saveToken: 'nope',
            })
        ).toEqual({ status: 'error', reason: 'file-not-found' });
        expect(library.importGame).not.toHaveBeenCalled();
    });

    it('keeps the tokens when the import fails, so it can be retried', async () => {
        staging.get.mockReturnValue({ path: '/rom.gb', kind: 'rom' });
        library.importGame.mockResolvedValue({
            status: 'error',
            reason: 'busy',
        });

        await invoke(IpcChannels.IMPORT_GAME, { romToken: 'rom' });

        expect(staging.release).not.toHaveBeenCalled();
    });
});
