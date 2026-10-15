import type { Game } from '@shared/game';
import type { ImportResult } from '@shared/import';

import { importGame } from './import-game';
import type { StagedEntry } from './import-staging';
import {
    type LibraryData,
    loadLibrary,
    saveLibrary,
    toGames,
} from './library-file';
import type { LibraryFolders } from './library-folders';

/**
 * Holds the library in memory; the main process is the only writer of
 * library.json. Imports run one at a time.
 */
export class LibraryService {
    private importing = false;

    private constructor(
        private readonly folders: LibraryFolders,
        private library: LibraryData
    ) {}

    static async open(folders: LibraryFolders) {
        return new LibraryService(folders, await loadLibrary(folders.root));
    }

    getGames(): Game[] {
        return toGames(this.library);
    }

    async importGame(
        rom: StagedEntry,
        save?: StagedEntry
    ): Promise<ImportResult> {
        if (this.importing) {
            return { status: 'error', reason: 'busy' };
        }
        if (rom.kind !== 'rom' || !rom.platform) {
            return { status: 'error', reason: 'file-not-found' };
        }

        this.importing = true;
        try {
            const { library, result } = await importGame({
                folders: this.folders,
                library: this.library,
                rom: { path: rom.path, platform: rom.platform },
                save: save ? { path: save.path } : undefined,
            });
            if (library !== this.library) {
                await saveLibrary(this.folders.root, library);
                this.library = library;
            }
            return result;
        } catch (error) {
            console.error('Could not import the game:', error);
            return { status: 'error', reason: 'failed' };
        } finally {
            this.importing = false;
        }
    }
}
