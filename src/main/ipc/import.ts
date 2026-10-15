import {
    BrowserWindow,
    dialog,
    ipcMain,
    type OpenDialogOptions,
} from 'electron';

import { type Platform, PLATFORM_IDS } from '@shared/game';
import type { ImportFileKind, ImportResult, StageResult } from '@shared/import';
import { IpcChannels } from '@shared/ipc-channels';

import type { ImportStaging } from '../library/import-staging';
import type { LibraryManager } from '../library/library-manager';

type ImportIpcDependencies = {
    staging: ImportStaging;
    /** Undefined when the library folder couldn't be prepared */
    getLibrary: () => Pick<LibraryManager, 'importGame'> | undefined;
};

const isKind = (value: unknown): value is ImportFileKind =>
    value === 'rom' || value === 'save';

const dialogFilters = (
    kind: ImportFileKind,
    platform: unknown
): OpenDialogOptions['filters'] => {
    if (kind === 'save') {
        return [{ name: 'Save files', extensions: ['sav'] }];
    }
    const extensions = PLATFORM_IDS.includes(platform as Platform)
        ? [platform as Platform]
        : [...PLATFORM_IDS];

    return [{ name: 'Game Boy ROMs', extensions }];
};

export const registerImportIpc = ({
    staging,
    getLibrary,
}: ImportIpcDependencies) => {
    // A file dropped on the window (its path comes from the preload)
    ipcMain.handle(
        IpcChannels.IMPORT_STAGE_FILE,
        (_event, filePath: unknown): Promise<StageResult> | StageResult =>
            typeof filePath === 'string' && filePath.length > 0
                ? staging.stage(filePath)
                : { ok: false, reason: 'not-a-file' }
    );

    // A file picked with the native dialog: one file of the requested kind
    ipcMain.handle(
        IpcChannels.IMPORT_CHOOSE_FILE,
        async (
            event,
            kind: unknown,
            platform: unknown
        ): Promise<StageResult> => {
            if (!isKind(kind)) {
                return { ok: false, reason: 'unsupported' };
            }
            const options: OpenDialogOptions = {
                properties: ['openFile'],
                filters: dialogFilters(kind, platform),
            };
            const window = BrowserWindow.fromWebContents(event.sender);
            const { canceled, filePaths } = window
                ? await dialog.showOpenDialog(window, options)
                : await dialog.showOpenDialog(options);
            if (canceled || !filePaths[0]) {
                return { ok: false, reason: 'cancelled' };
            }
            return staging.stage(filePaths[0], kind);
        }
    );

    ipcMain.handle(
        IpcChannels.IMPORT_GAME,
        async (
            _event,
            request: { romToken?: unknown; saveToken?: unknown } | undefined
        ): Promise<ImportResult> => {
            const library = getLibrary();
            if (!library) {
                return { status: 'error', reason: 'library-unavailable' };
            }
            const rom = staging.get(request?.romToken, 'rom');
            const save =
                request?.saveToken === undefined
                    ? undefined
                    : staging.get(request.saveToken, 'save');
            if (!rom || (request?.saveToken !== undefined && !save)) {
                return { status: 'error', reason: 'file-not-found' };
            }

            const result = await library.importGame(rom, save);
            if (result.status !== 'error') {
                staging.release(request?.romToken, request?.saveToken);
            }
            return result;
        }
    );
};
